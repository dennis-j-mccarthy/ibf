#!/usr/bin/env python3
"""
Swap book products in an InDesign IDML catalog file using BigCommerce product data.

Usage:
    # Single book swap
    python swap_book.py --idml catalog.idml --csv products.csv --group p1-s1-b2 --sku IBC.1126 --output catalog-modified.idml

    # Multiple swaps in one pass
    python swap_book.py --idml catalog.idml --csv products.csv --swaps p1-s1-b1=IBC.1005 p1-s1-b2=IBC.1126 --output catalog-modified.idml
"""

import argparse
import csv
import json
import os
import shutil
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass

# Register namespace before any XML parsing to prevent ns0 prefix rewriting
ET.register_namespace('idPkg', 'http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging')

STORE_BASE_URL = 'https://store.ignatiusbookfairs.com'

FORMAT_MAP = {
    '.jpg': '$ID/JPEG',
    '.jpeg': '$ID/JPEG',
    '.png': '$ID/PNG ',
    '.webp': '$ID/WEBP ',
    '.tif': '$ID/TIFF',
    '.tiff': '$ID/TIFF',
}


@dataclass
class ProductInfo:
    name: str
    sku: str
    price: str
    image_url: str
    product_url: str  # relative slug like /the-little-way/


def parse_bc_csv(csv_path: str) -> dict[str, ProductInfo]:
    """Parse BigCommerce export CSV into a SKU-keyed lookup."""
    products = {}
    current_sku = None

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_type = row.get('Item', '').strip()

            if item_type == 'Product':
                sku = row.get('SKU', '').strip()
                if sku:
                    current_sku = sku
                    price = row.get('Price', '0').strip()
                    # Format price
                    try:
                        price_formatted = f'${float(price):.2f}'
                    except (ValueError, TypeError):
                        price_formatted = f'${price}'

                    products[sku] = ProductInfo(
                        name=row.get('Name', '').strip(),
                        sku=sku,
                        price=price_formatted,
                        image_url='',  # filled from Image row
                        product_url=row.get('Product URL', '').strip(),
                    )

            elif item_type == 'Image' and current_sku and current_sku in products:
                # Only grab the first (thumbnail) image per product
                if not products[current_sku].image_url:
                    url = (row.get('Internal Image URL (Export)', '').strip()
                           or row.get('Image URL (Import)', '').strip())
                    if url:
                        products[current_sku].image_url = url

    return products


def extract_idml(idml_path: str, work_dir: str) -> str:
    """Extract IDML (ZIP) to working directory."""
    with zipfile.ZipFile(idml_path, 'r') as zf:
        zf.extractall(work_dir)
    return work_dir


def repack_idml(work_dir: str, output_path: str):
    """Repack working directory as IDML. mimetype must be first and uncompressed."""
    with zipfile.ZipFile(output_path, 'w') as zf:
        # mimetype first, stored uncompressed
        mimetype_path = os.path.join(work_dir, 'mimetype')
        if os.path.exists(mimetype_path):
            zf.write(mimetype_path, 'mimetype', compress_type=zipfile.ZIP_STORED)

        for root, dirs, files in os.walk(work_dir):
            dirs.sort()
            for f in sorted(files):
                if f == 'mimetype':
                    continue
                full = os.path.join(root, f)
                arcname = os.path.relpath(full, work_dir)
                zf.write(full, arcname, compress_type=zipfile.ZIP_DEFLATED)


def find_named_group(work_dir: str, group_name: str):
    """Find a named Group element across all Spread XMLs.
    Returns (spread_path, tree, group_element)."""
    spreads_dir = os.path.join(work_dir, 'Spreads')
    for fname in sorted(os.listdir(spreads_dir)):
        if not fname.endswith('.xml'):
            continue
        spread_path = os.path.join(spreads_dir, fname)
        tree = ET.parse(spread_path)
        root = tree.getroot()
        for elem in root.iter('Group'):
            if elem.get('Name') == group_name:
                return spread_path, tree, elem

    raise ValueError(f'Group "{group_name}" not found in any Spread XML')


def extract_slot_components(group):
    """Extract button, link elements, goto behavior, and text frame from a book group."""
    buttons = list(group.iter('Button'))
    text_frames = [e for e in group if e.tag == 'TextFrame']

    if not buttons:
        raise ValueError(f'No Button found in group "{group.get("Name")}"')
    if not text_frames:
        raise ValueError(f'No TextFrame found in group "{group.get("Name")}"')

    button = buttons[0]
    text_frame = text_frames[0]

    # Get all Link elements (Normal + Rollover states)
    links = list(button.iter('Link'))

    # Get all Image elements
    images = list(button.iter('Image'))

    # Get GotoURLBehavior
    behaviors = list(button.iter('GotoURLBehavior'))
    behavior = behaviors[0] if behaviors else None

    return {
        'button': button,
        'links': links,
        'images': images,
        'behavior': behavior,
        'text_frame': text_frame,
        'story_id': text_frame.get('ParentStory'),
    }


def download_image(image_url: str, links_dir: str, sku: str) -> str:
    """Download image from BigCommerce CDN to local Links directory.
    Returns the local filename."""
    os.makedirs(links_dir, exist_ok=True)

    # Parse extension from URL
    parsed = urllib.parse.urlparse(image_url)
    url_path = parsed.path
    _, ext = os.path.splitext(url_path)
    if not ext:
        ext = '.jpg'

    # Clean filename from SKU
    safe_sku = sku.replace('.', '_').replace(' ', '_')
    filename = f'{safe_sku}{ext}'
    local_path = os.path.join(links_dir, filename)

    print(f'  Downloading image: {image_url}')
    print(f'  Saving to: {local_path}')
    urllib.request.urlretrieve(image_url, local_path)

    return filename, local_path


def update_story(work_dir: str, story_id: str, name: str, sku: str, price: str):
    """Update title, SKU, and price in a Story XML file.

    Replaces the ParagraphStyleRange contents with exactly 3 styled ranges
    (title, SKU, price), removing any extras like 'BOARD BOOK' subtitles.
    """
    story_path = os.path.join(work_dir, 'Stories', f'Story_{story_id}.xml')
    tree = ET.parse(story_path)
    root = tree.getroot()

    # Find the ParagraphStyleRange
    para = root.find('.//{http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging}Story/'
                      'ParagraphStyleRange')
    if para is None:
        para = root.find('.//Story/ParagraphStyleRange')
    if para is None:
        # Try without namespace
        for p in root.iter('ParagraphStyleRange'):
            para = p
            break
    if para is None:
        raise ValueError(f'No ParagraphStyleRange found in {story_path}')

    # Preserve the ParagraphStyleRange attributes
    para_attribs = dict(para.attrib)

    # Find the first CharacterStyleRange to extract base character style attribute
    first_csr = para.find('CharacterStyleRange')
    base_char_style = first_csr.get('AppliedCharacterStyle',
                                     'CharacterStyle/$ID/[No character style]') if first_csr else 'CharacterStyle/$ID/[No character style]'

    # Clear all children
    for child in list(para):
        para.remove(child)

    # Build 3 clean CharacterStyleRanges: title, SKU, price

    # 1. Title (Bold 10pt)
    title_csr = ET.SubElement(para, 'CharacterStyleRange')
    title_csr.set('AppliedCharacterStyle', base_char_style)
    title_csr.set('FontStyle', 'Bold')
    title_csr.set('PointSize', '10')
    title_csr.set('Tracking', '-10')
    title_props = ET.SubElement(title_csr, 'Properties')
    leading = ET.SubElement(title_props, 'Leading')
    leading.set('type', 'unit')
    leading.text = '10.5'
    font = ET.SubElement(title_props, 'AppliedFont')
    font.set('type', 'string')
    font.text = 'Brother 1816'
    content = ET.SubElement(title_csr, 'Content')
    content.text = name
    ET.SubElement(title_csr, 'Br')

    # 2. SKU (Book 9pt)
    sku_csr = ET.SubElement(para, 'CharacterStyleRange')
    sku_csr.set('AppliedCharacterStyle', base_char_style)
    sku_csr.set('FontStyle', 'Book')
    sku_csr.set('PointSize', '9')
    sku_props = ET.SubElement(sku_csr, 'Properties')
    leading = ET.SubElement(sku_props, 'Leading')
    leading.set('type', 'unit')
    leading.text = '10.5'
    font = ET.SubElement(sku_props, 'AppliedFont')
    font.set('type', 'string')
    font.text = 'Brother 1816'
    content = ET.SubElement(sku_csr, 'Content')
    content.text = sku
    ET.SubElement(sku_csr, 'Br')

    # 3. Price (ExtraBold, Prices color)
    price_csr = ET.SubElement(para, 'CharacterStyleRange')
    price_csr.set('AppliedCharacterStyle', base_char_style)
    price_csr.set('FillColor', 'Color/Prices')
    price_csr.set('FontStyle', 'ExtraBold')
    price_props = ET.SubElement(price_csr, 'Properties')
    leading = ET.SubElement(price_props, 'Leading')
    leading.set('type', 'unit')
    leading.text = '13'
    font = ET.SubElement(price_props, 'AppliedFont')
    font.set('type', 'string')
    font.text = 'Brother 1816'
    content = ET.SubElement(price_csr, 'Content')
    content.text = price

    tree.write(story_path, encoding='UTF-8', xml_declaration=True)


def update_links(links, images, local_path: str, links_dir: str):
    """Update Link URIs and Image type attributes."""
    _, ext = os.path.splitext(local_path)
    ext_lower = ext.lower()
    format_id = FORMAT_MAP.get(ext_lower, '$ID/JPEG')

    # Build file: URI from local path
    file_uri = 'file:' + urllib.parse.quote(local_path, safe='/:')

    for link in links:
        link.set('LinkResourceURI', file_uri)
        link.set('LinkResourceFormat', format_id)
        link.set('LinkResourceModified', 'true')

    for image in images:
        image.set('ImageTypeName', format_id)


def update_goto_url(behavior, product_url: str):
    """Update the button's GotoURLBehavior URL."""
    if behavior is None:
        return
    full_url = STORE_BASE_URL + product_url.rstrip('/')
    behavior.set('URL', full_url)


def swap_book_slot(work_dir: str, group_name: str, product: ProductInfo, links_dir: str):
    """Swap a single book slot in an already-extracted IDML."""
    print(f'\nSwapping {group_name} -> {product.sku} ({product.name})')

    # Find the group
    spread_path, tree, group = find_named_group(work_dir, group_name)

    # Extract components
    components = extract_slot_components(group)

    # Download image
    if product.image_url:
        filename, local_path = download_image(product.image_url, links_dir, product.sku)
        update_links(components['links'], components['images'], local_path, links_dir)
        print(f'  Updated {len(components["links"])} link(s) to {filename}')
    else:
        print(f'  WARNING: No image URL for {product.sku}, skipping image swap')

    # Update text (title, SKU, price)
    update_story(work_dir, components['story_id'], product.name, product.sku, product.price)
    print(f'  Updated story: {product.name} | {product.sku} | {product.price}')

    # Update button URL
    update_goto_url(components['behavior'], product.product_url)
    print(f'  Updated URL: {STORE_BASE_URL}{product.product_url}')

    # Update button name (cosmetic)
    components['button'].set('Name', product.name)

    # Write spread XML back
    tree.write(spread_path, encoding='UTF-8', xml_declaration=True)


def parse_json_payload(json_path: str) -> dict[str, ProductInfo]:
    """Parse a JSON payload into slot->ProductInfo mapping.

    JSON format:
    {
      "sections": [
        {
          "group": "p1-s1",
          "books": [
            {
              "slot": "p1-s1-b1",
              "sku": "IBC.1126",
              "name": "Interrupting Chicken",
              "price": "$8.99",
              "image_url": "https://cdn11.bigcommerce.com/...",
              "product_url": "https://store.ignatiusbookfairs.com/interrupting-chicken/"
            }
          ]
        }
      ]
    }
    """
    with open(json_path, 'r') as f:
        data = json.load(f)

    products = {}
    for section in data['sections']:
        for book in section['books']:
            # Normalize product_url: strip store base if full URL provided
            product_url = book.get('product_url', '')
            if product_url.startswith(STORE_BASE_URL):
                product_url = product_url[len(STORE_BASE_URL):]

            products[book['slot']] = ProductInfo(
                name=book['name'],
                sku=book['sku'],
                price=book['price'],
                image_url=book.get('image_url', ''),
                product_url=product_url,
            )
    return products


def swap_books(idml_path: str, csv_path: str, swaps: dict[str, str], output_path: str):
    """Main entry point using CSV. swaps is {group_name: sku}."""
    # Parse BigCommerce data
    print(f'Parsing BigCommerce CSV: {csv_path}')
    products = parse_bc_csv(csv_path)
    print(f'  Found {len(products)} products')

    # Validate all SKUs exist before starting
    for group_name, sku in swaps.items():
        if sku not in products:
            raise ValueError(f'SKU "{sku}" not found in BigCommerce CSV')
        if not products[sku].image_url:
            print(f'  WARNING: SKU "{sku}" has no image in CSV')

    # Build slot->product mapping
    slot_products = {group_name: products[sku] for group_name, sku in swaps.items()}
    _execute_swaps(idml_path, slot_products, output_path)


def swap_books_from_json(idml_path: str, json_path: str, output_path: str):
    """Main entry point using JSON payload."""
    print(f'Parsing JSON payload: {json_path}')
    slot_products = parse_json_payload(json_path)
    print(f'  Found {len(slot_products)} book slot(s) to swap')

    for slot, product in slot_products.items():
        if not product.image_url:
            print(f'  WARNING: No image URL for {slot} ({product.sku})')

    _execute_swaps(idml_path, slot_products, output_path)


def _execute_swaps(idml_path: str, slot_products: dict[str, ProductInfo], output_path: str):
    """Shared execution: extract IDML, perform swaps, repack."""
    work_dir = tempfile.mkdtemp(prefix='idml_swap_')

    # Save images to a persistent Links folder next to the output IDML
    output_dir = os.path.dirname(os.path.abspath(output_path))
    links_dir = os.path.join(output_dir, 'Links')
    os.makedirs(links_dir, exist_ok=True)

    try:
        print(f'\nExtracting IDML: {idml_path}')
        extract_idml(idml_path, work_dir)

        # Perform all swaps
        for group_name, product in slot_products.items():
            swap_book_slot(work_dir, group_name, product, links_dir)

        # Repack
        print(f'\nRepacking IDML: {output_path}')
        repack_idml(work_dir, output_path)
        print(f'Done! Output: {output_path}')
        print(f'Images saved to: {links_dir}')

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description='Swap book products in an IDML catalog')
    parser.add_argument('--idml', required=True, help='Input IDML file path')
    parser.add_argument('--output', required=True, help='Output IDML file path')

    # JSON mode (preferred for bulk/API-driven)
    parser.add_argument('--json', help='JSON payload file with sections and books')

    # CSV mode
    parser.add_argument('--csv', help='BigCommerce product export CSV')
    parser.add_argument('--group', help='Group name (e.g., p1-s1-b2)')
    parser.add_argument('--sku', help='New SKU (e.g., IBC.1126)')
    parser.add_argument('--swaps', nargs='*', help='Bulk swaps as group=sku pairs (e.g., p1-s1-b1=IBC.1005 p1-s1-b2=IBC.1126)')

    args = parser.parse_args()

    if args.json:
        # JSON mode: all product data is in the payload
        swap_books_from_json(args.idml, args.json, args.output)
    elif args.csv:
        # CSV mode: look up SKUs from BigCommerce export
        swaps = {}
        if args.swaps:
            for pair in args.swaps:
                group_name, sku = pair.split('=', 1)
                swaps[group_name] = sku
        elif args.group and args.sku:
            swaps[args.group] = args.sku
        else:
            parser.error('CSV mode requires --group/--sku or --swaps')
        swap_books(args.idml, args.csv, swaps, args.output)
    else:
        parser.error('Provide either --json or --csv')


if __name__ == '__main__':
    main()
