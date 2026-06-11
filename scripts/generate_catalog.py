#!/usr/bin/env python3
"""
Generate an InDesign IDML catalog from a BigCommerce product CSV and an IDML template.

Reads the BC CSV to find products by category, matches categories to IDML named groups,
and populates each book slot with title, SKU, price, image, link, and AR badge.

Usage:
    python generate_catalog.py \
        --idml /path/to/template.idml \
        --csv /path/to/bigcommerce-export.csv \
        --output /path/to/output.idml

The script uses string replacement for spread XMLs (preserves layout positions)
and ElementTree for story XMLs (safe, no position data).
"""

import argparse
import csv
import os
import re
import shutil
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass, field
from PIL import Image as PILImage

ET.register_namespace('idPkg', 'http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging')

STORE_BASE_URL = 'https://store.ignatiusbookfairs.com'

# BigCommerce category ID -> IDML section group name
CATEGORY_MAP = {
    415: 'Our Staff Favorites',
    426: 'Early Childhood',
    417: 'Go Outside',
    418: 'Elementary Book Series',
    419: 'Adventurous Middle School Series',
    420: 'Arts Crafts Activities',
    422: 'Boxed Sets Elementary',
    423: 'Boxed Sets Middle School',
    421: 'Winning Reads for Sports Fans',
    424: 'Our Catholic Faith',
    425: 'Saint Stories for the Summer',
    411: 'Faith Filled Fiction',
}

# Sections where text should be white (dark background)
WHITE_TEXT_SECTIONS = {
    'Winning Reads for Sports Fans',
    'Boxed Sets Elementary',
    'Boxed Sets Middle School',
}

# Products to exclude per section (e.g. sequels when only book #1 is wanted)
SECTION_EXCLUDE_SKUS = {
    'Adventurous Middle School Series': {'IBC.1068', 'IBC.1321'},  # Will Wilder 2, Mossflower
}

# Sections where ALL slots are Buttons (not Groups) -- image-only, no per-book text
BUTTON_ONLY_SECTIONS = {
    'Faith Filled Fiction',
}

# Sections that have some or all slots as named Buttons (not Groups)
# These are scanned for named Buttons inside the section Group
MIXED_BUTTON_SECTIONS = {
    'Winning Reads for Sports Fans',
    'Go Outside',
}

# Font sizes (15% reduced from original 10/9/12)
TITLE_SIZE = 8.5
TITLE_LEADING = 8.9
SKU_SIZE = 7.6
SKU_LEADING = 8.9
PRICE_SIZE = 10.2
PRICE_LEADING = 11.1
AR_SIZE = 8.5
AR_BASELINE_SHIFT = 2

# Text frame height extension (points)
TEXT_FRAME_EXTEND = 12


@dataclass
class ProductInfo:
    name: str
    sku: str
    price: str
    image_url: str
    product_url: str
    categories: set = field(default_factory=set)
    is_ar: bool = False


@dataclass
class SlotInfo:
    name: str           # e.g. "Our Staff Favorites B1"
    section: str        # e.g. "Our Staff Favorites"
    bnum: str           # e.g. "B1"
    story_id: str
    text_frame_self: str
    button_self: str
    old_link_uri: str
    rect_bounds: tuple   # (x1, y1, x2, y2)
    image_self: str
    has_ar: bool         # template has AR badge
    needs_white: bool
    spread: str          # spread filename


def parse_bc_csv(csv_path: str) -> dict[str, ProductInfo]:
    """Parse BigCommerce export CSV into SKU-keyed product lookup."""
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
                    try:
                        price_formatted = f'${float(price):.2f}'
                    except (ValueError, TypeError):
                        price_formatted = f'${price}'

                    cat_ids = set()
                    for cid in row.get('Categories', '').split(';'):
                        cid = cid.strip()
                        if cid:
                            cat_ids.add(int(cid))

                    products[sku] = ProductInfo(
                        name=row.get('Name', '').strip(),
                        sku=sku,
                        price=price_formatted,
                        image_url='',
                        product_url=row.get('Product URL', '').strip(),
                        categories=cat_ids,
                    )

            elif item_type == 'Image' and current_sku and current_sku in products:
                url = (row.get('Internal Image URL (Export)', '').strip()
                       or row.get('Image URL (Import)', '').strip())
                if url:
                    is_thumb = row.get('Image is Thumbnail', '').strip().upper() == 'TRUE'
                    if is_thumb:
                        # Thumbnail always wins
                        products[current_sku].image_url = url
                    elif not products[current_sku].image_url:
                        # Fallback to first image if no thumbnail found yet
                        products[current_sku].image_url = url

    return products


def get_products_by_category(products: dict[str, ProductInfo]) -> dict[str, list[ProductInfo]]:
    """Group products by Summer Catalog section name using CATEGORY_MAP.
    Applies SECTION_EXCLUDE_SKUS to filter unwanted products."""
    sections = {}
    for cat_id, section_name in CATEGORY_MAP.items():
        exclude = SECTION_EXCLUDE_SKUS.get(section_name, set())
        section_products = []
        for product in products.values():
            if cat_id in product.categories and product.sku not in exclude:
                section_products.append(product)
        if section_products:
            sections[section_name] = section_products
    return sections


def _scan_group_slot(group, work_dir: str, fname: str) -> SlotInfo:
    """Extract slot info from a named Group element."""
    name = group.get('Name', '')
    parts = name.rsplit(' ', 1)
    section = parts[0] if len(parts) > 1 else name
    bnum = parts[1] if len(parts) > 1 else 'B?'

    # Find primary text story (skip AR badge stories)
    primary_story = None
    text_frame_self = None
    for tf in group:
        if tf.tag == 'TextFrame':
            sid = tf.get('ParentStory', '')
            try:
                with open(os.path.join(work_dir, 'Stories', f'Story_{sid}.xml')) as f:
                    c = f.read()
                if '<Content>AR</Content>' not in c:
                    primary_story = sid
                    text_frame_self = tf.get('Self')
                    break
            except FileNotFoundError:
                pass

    # Button
    button_self = None
    for btn in group.iter('Button'):
        button_self = btn.get('Self')
        break

    # Link URI
    old_link_uri = None
    for link in group.iter('Link'):
        old_link_uri = link.get('LinkResourceURI', '')
        break

    # Image frame bounds and image Self
    rect_bounds = None
    image_self = None
    for rect in group.iter('Rectangle'):
        pts = []
        for pp in rect.iter('PathPointType'):
            a = pp.get('Anchor', '')
            if a:
                pts.append(tuple(float(v) for v in a.split()))
        if pts:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            rect_bounds = (min(xs), min(ys), max(xs), max(ys))
        for img in rect.iter('Image'):
            image_self = img.get('Self')
        break

    # AR badge present (named group or navy oval)
    has_ar = any(cg.get('Name') == 'ar-badge' for cg in group.iter('Group'))
    if not has_ar:
        has_ar = any(
            o.get('FillColor') == 'Color/r37g42b103'
            for o in group.iter('Oval')
        )

    needs_white = section in WHITE_TEXT_SECTIONS

    return SlotInfo(
        name=name, section=section, bnum=bnum,
        story_id=primary_story, text_frame_self=text_frame_self,
        button_self=button_self, old_link_uri=old_link_uri,
        rect_bounds=rect_bounds, image_self=image_self,
        has_ar=has_ar, needs_white=needs_white, spread=fname,
    )


def _scan_button_slot(button, section_name: str, fname: str,
                      work_dir: str = None) -> SlotInfo:
    """Extract slot info from a named Button element (e.g. Faith Filled Fiction).
    Also searches for text frames inside the button's states."""
    name = button.get('Name', '')
    parts = name.rsplit(' ', 1)
    bnum = parts[1] if len(parts) > 1 else 'B?'

    button_self = button.get('Self')

    old_link_uri = None
    for link in button.iter('Link'):
        old_link_uri = link.get('LinkResourceURI', '')
        break

    rect_bounds = None
    image_self = None
    for rect in button.iter('Rectangle'):
        pts = []
        for pp in rect.iter('PathPointType'):
            a = pp.get('Anchor', '')
            if a:
                pts.append(tuple(float(v) for v in a.split()))
        if pts:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            rect_bounds = (min(xs), min(ys), max(xs), max(ys))
        for img in rect.iter('Image'):
            image_self = img.get('Self')
        break

    # Look for text frame inside the button (may be in a State)
    primary_story = None
    text_frame_self = None
    if work_dir:
        for tf in button.iter('TextFrame'):
            sid = tf.get('ParentStory', '')
            try:
                with open(os.path.join(work_dir, 'Stories', f'Story_{sid}.xml')) as f:
                    c = f.read()
                if '<Content>AR</Content>' not in c:
                    primary_story = sid
                    text_frame_self = tf.get('Self')
                    break
            except FileNotFoundError:
                pass

    # AR badge
    has_ar = any(cg.get('Name') == 'ar-badge' for cg in button.iter('Group'))
    if not has_ar:
        has_ar = any(
            o.get('FillColor') == 'Color/r37g42b103'
            for o in button.iter('Oval')
        )

    needs_white = section_name in WHITE_TEXT_SECTIONS

    return SlotInfo(
        name=name, section=section_name, bnum=bnum,
        story_id=primary_story, text_frame_self=text_frame_self,
        button_self=button_self, old_link_uri=old_link_uri,
        rect_bounds=rect_bounds, image_self=image_self,
        has_ar=has_ar, needs_white=needs_white, spread=fname,
    )


def scan_idml_slots(work_dir: str) -> list[SlotInfo]:
    """Scan all spreads for book slots.
    Finds named Groups (most sections) and named Buttons (Faith Filled Fiction)."""
    slots = []
    for fname in sorted(os.listdir(os.path.join(work_dir, 'Spreads'))):
        if not fname.endswith('.xml'):
            continue
        tree = ET.parse(os.path.join(work_dir, 'Spreads', fname))

        for group in tree.getroot().iter('Group'):
            name = group.get('Name', '')

            # Standard book slots: named groups ending in B#
            if name and re.search(r'B\d+$', name) and name != 'ar-badge':
                parts = name.rsplit(' ', 1)
                section = parts[0] if len(parts) > 1 else name
                # Skip if this section uses button-only slots
                if section not in BUTTON_ONLY_SECTIONS:
                    slots.append(_scan_group_slot(group, work_dir, fname))

            # Button-only and mixed sections: find named Buttons inside Group
            if name and name.endswith('Group'):
                section_name = name.replace(' Group', '')
                if section_name in BUTTON_ONLY_SECTIONS or section_name in MIXED_BUTTON_SECTIONS:
                    for child in group:
                        if child.tag == 'Button':
                            btn_name = child.get('Name', '')
                            if re.search(r'B\d+$', btn_name):
                                slots.append(_scan_button_slot(
                                    child, section_name, fname,
                                    work_dir))

    return slots


def build_story_xml(work_dir: str, story_id: str, product: ProductInfo,
                    needs_white: bool, is_ar: bool):
    """Build a clean story with title, SKU, price, and optional AR text."""
    story_path = os.path.join(work_dir, 'Stories', f'Story_{story_id}.xml')
    stree = ET.parse(story_path)
    para = None
    for p in stree.getroot().iter('ParagraphStyleRange'):
        para = p
        break
    if para is None:
        return

    cs = 'CharacterStyle/$ID/[No character style]'
    for c in list(para):
        para.remove(c)

    title_color = 'Color/Paper' if needs_white else ''
    sku_color = 'Color/Paper' if needs_white else ''
    price_color = 'Color/Paper' if needs_white else 'Color/Prices'

    # Title
    t = ET.SubElement(para, 'CharacterStyleRange')
    t.set('AppliedCharacterStyle', cs)
    t.set('FontStyle', 'Bold')
    t.set('PointSize', str(TITLE_SIZE))
    t.set('Tracking', '-10')
    if title_color:
        t.set('FillColor', title_color)
    tp = ET.SubElement(t, 'Properties')
    ET.SubElement(tp, 'Leading', type='unit').text = str(TITLE_LEADING)
    ET.SubElement(tp, 'AppliedFont', type='string').text = 'Brother 1816'
    ET.SubElement(t, 'Content').text = product.name
    ET.SubElement(t, 'Br')

    # SKU
    s = ET.SubElement(para, 'CharacterStyleRange')
    s.set('AppliedCharacterStyle', cs)
    s.set('FontStyle', 'Book')
    s.set('PointSize', str(SKU_SIZE))
    if sku_color:
        s.set('FillColor', sku_color)
    sp = ET.SubElement(s, 'Properties')
    ET.SubElement(sp, 'Leading', type='unit').text = str(SKU_LEADING)
    ET.SubElement(sp, 'AppliedFont', type='string').text = 'Brother 1816'
    ET.SubElement(s, 'Content').text = product.sku
    ET.SubElement(s, 'Br')

    # Price
    p = ET.SubElement(para, 'CharacterStyleRange')
    p.set('AppliedCharacterStyle', cs)
    p.set('FillColor', price_color)
    p.set('FontStyle', 'ExtraBold')
    p.set('PointSize', str(PRICE_SIZE))
    pp = ET.SubElement(p, 'Properties')
    ET.SubElement(pp, 'Leading', type='unit').text = str(PRICE_LEADING)
    ET.SubElement(pp, 'AppliedFont', type='string').text = 'Brother 1816'
    ET.SubElement(p, 'Content').text = product.price

    # AR text badge
    if is_ar:
        ar_color = 'Color/Paper' if needs_white else 'Color/r37g42b103'
        ar = ET.SubElement(para, 'CharacterStyleRange')
        ar.set('AppliedCharacterStyle', cs)
        ar.set('FillColor', ar_color)
        ar.set('FontStyle', 'Black')
        ar.set('PointSize', str(AR_SIZE))
        ar.set('Tracking', '60')
        ar.set('BaselineShift', str(AR_BASELINE_SHIFT))
        arp = ET.SubElement(ar, 'Properties')
        ET.SubElement(arp, 'Leading', type='unit').text = str(PRICE_LEADING)
        ET.SubElement(arp, 'AppliedFont', type='string').text = 'Brother 1816 Printed'
        ET.SubElement(ar, 'Content').text = '  AR'

    stree.write(story_path, encoding='UTF-8', xml_declaration=True)


def download_image(image_url: str, links_dir: str, sku: str,
                    remove_bg: bool = False) -> str:
    """Download image from BigCommerce CDN. Returns local file path.
    If remove_bg is True, removes the background and saves as PNG."""
    os.makedirs(links_dir, exist_ok=True)
    parsed = urllib.parse.urlparse(image_url)
    _, ext = os.path.splitext(parsed.path)
    if not ext:
        ext = '.jpg'
    safe_sku = sku.replace('.', '_').replace(' ', '_')

    if remove_bg:
        # Always save as PNG for transparency
        filename = f'{safe_sku}.png'
        local_path = os.path.join(links_dir, filename)
        if not os.path.exists(local_path):
            # Download original first
            tmp_path = os.path.join(links_dir, f'{safe_sku}_orig{ext}')
            urllib.request.urlretrieve(image_url, tmp_path)
            # Remove background
            from rembg import remove
            with open(tmp_path, 'rb') as inp:
                result = remove(inp.read())
            with open(local_path, 'wb') as out:
                out.write(result)
            os.remove(tmp_path)
            print(f'    BG removed: {filename}')
    else:
        filename = f'{safe_sku}{ext}'
        local_path = os.path.join(links_dir, filename)
        if not os.path.exists(local_path):
            urllib.request.urlretrieve(image_url, local_path)
    return local_path


def apply_spread_changes(work_dir: str, slots: list[SlotInfo],
                         slot_products: dict[str, ProductInfo], links_dir: str,
                         remove_bg: bool = False):
    """Apply image swaps, AR badge removal, text frame extension, and links
    using string replacement on spread XMLs (preserves positions)."""

    # Pre-download images and compute transforms
    slot_image_data = {}
    for slot in slots:
        product = slot_products.get(slot.name)
        if not product or not product.image_url or not slot.old_link_uri:
            continue
        local_path = download_image(product.image_url, links_dir, product.sku,
                                    remove_bg=remove_bg)
        new_uri = 'file:' + urllib.parse.quote(local_path, safe='/:')
        transform = None
        if slot.rect_bounds and slot.image_self:
            with PILImage.open(local_path) as img:
                new_w, new_h = img.size
            rx1, ry1, rx2, ry2 = slot.rect_bounds
            fw, fh = rx2 - rx1, ry2 - ry1
            # Fit image within frame (contain mode), center it
            scale = min(fw / new_w, fh / new_h)
            tx = rx1 - (new_w * scale - fw) / 2
            ty = ry1 - (new_h * scale - fh) / 2
            transform = (scale, tx, ty, new_w, new_h)
        slot_image_data[slot.name] = (new_uri, transform)

    # Process each spread file
    for fname in sorted(set(s.spread for s in slots)):
        spread_path = os.path.join(work_dir, 'Spreads', fname)
        with open(spread_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove all ar-badge named groups
        content = re.sub(
            r'<Group [^>]*Name="ar-badge"[^>]*>.*?</Group>',
            '', content, flags=re.DOTALL)

        # Remove unnamed groups containing navy ovals (AR circles)
        # Exclude State groups (Name="$ID/$$$/StateType/...")
        content = re.sub(
            r'<Group ([^>]*Name="\$ID/"[^>]*)>(?:(?!</Group>).)*?'
            r'FillColor="Color/r37g42b103".*?</Group>',
            '', content, flags=re.DOTALL)

        for slot in (s for s in slots if s.spread == fname):
            product = slot_products.get(slot.name)
            if not product:
                continue

            # Image URI replacement
            if slot.name in slot_image_data:
                new_uri, transform = slot_image_data[slot.name]
                if slot.old_link_uri:
                    content = content.replace(
                        f'LinkResourceURI="{slot.old_link_uri}"',
                        f'LinkResourceURI="{new_uri}"')

                # Image transform
                if transform and slot.image_self:
                    scale, tx, ty, new_w, new_h = transform
                    img_pat = f'Self="{slot.image_self}"'
                    if img_pat in content:
                        idx = content.index(img_pat)
                        end = content.index('/>', idx) + 2
                        region = content[idx:end]
                        region = re.sub(
                            r'ItemTransform="[^"]*"',
                            f'ItemTransform="{scale} 0 0 {scale} {tx} {ty}"',
                            region, count=1)
                        region = re.sub(
                            r'(GraphicBounds[^>]*Right=")[^"]*"',
                            f'\\g<1>{new_w}"', region, count=1)
                        region = re.sub(
                            r'(GraphicBounds[^>]*Bottom=")[^"]*"',
                            f'\\g<1>{new_h}"', region, count=1)
                        content = content[:idx] + region + content[end:]

                # Clear the Rectangle fill color so gaps show white, not pink
                # Find the Rectangle containing this image and set FillColor to None
                for rect_match in re.finditer(r'<Rectangle Self="([^"]*)"', content):
                    rs = rect_match.start()
                    rect_section = content[rs:rs + 6000]
                    if f'Self="{slot.image_self}"' in rect_section:
                        # Replace FillColor on this Rectangle
                        rect_end = rs + rect_section.index('>')
                        rect_tag = content[rs:rect_end]
                        new_tag = re.sub(
                            r'FillColor="[^"]*"',
                            'FillColor="Swatch/None"',
                            rect_tag, count=1)
                        content = content[:rs] + new_tag + content[rect_end:]
                        break

            # Extend text frame height
            if slot.text_frame_self:
                tf_pat = f'Self="{slot.text_frame_self}"'
                if tf_pat in content:
                    idx = content.index(tf_pat)
                    ppa_start = content.find('<PathPointArray>', idx)
                    ppa_end = content.find('</PathPointArray>', ppa_start)
                    if ppa_start > 0 and ppa_end > ppa_start:
                        ppa_end += len('</PathPointArray>')
                        ppa_region = content[ppa_start:ppa_end]
                        anchors = re.findall(r'Anchor="([^"]*)"', ppa_region)
                        if len(anchors) == 4:
                            points = [tuple(float(v) for v in a.split())
                                      for a in anchors]
                            max_y = max(p[1] for p in points)
                            new_ppa = ppa_region
                            for px, py in points:
                                if py == max_y:
                                    old_a = f'{px} {py}'
                                    new_a = f'{px} {py + TEXT_FRAME_EXTEND}'
                                    new_ppa = new_ppa.replace(
                                        f'Anchor="{old_a}"',
                                        f'Anchor="{new_a}"')
                                    new_ppa = new_ppa.replace(
                                        f'LeftDirection="{old_a}"',
                                        f'LeftDirection="{new_a}"')
                                    new_ppa = new_ppa.replace(
                                        f'RightDirection="{old_a}"',
                                        f'RightDirection="{new_a}"')
                            content = content[:ppa_start] + new_ppa + content[ppa_end:]

            # GotoURLBehavior - add to existing buttons
            if slot.button_self and product.product_url:
                url = STORE_BASE_URL + product.product_url
                btn_pat = f'Self="{slot.button_self}"'
                url_id = f'{slot.button_self}_url'
                if btn_pat in content and url_id not in content:
                    parts = content.split(btn_pat, 1)
                    after = parts[1]
                    idx = after.index('</Button>')
                    behavior = (
                        f'\n\t\t\t\t\t\t<GotoURLBehavior Self="{url_id}" '
                        f'URL="{url}" Name="Go To URL" '
                        f'EnableBehavior="true" BehaviorEvent="MouseDown" />')
                    content = (parts[0] + btn_pat +
                               after[:idx] + behavior + after[idx:])

            # Slots without buttons can't have links added programmatically.
            # Convert them to buttons in the InDesign template to fix this.
            if not slot.button_self and product.product_url:
                print(f'  NOTE: {slot.name} has no button - link not added. '
                      f'Convert to button in template.')

        with open(spread_path, 'w', encoding='utf-8') as f:
            f.write(content)


def convert_buttons_to_groups(work_dir: str):
    """Convert all Button elements to plain Groups in spread XMLs.
    This allows Print PDF export to show images (buttons are hidden in Print PDF).
    Strategy: for each Button, keep the first State's inner content, discard
    additional States (Rollover), remove GotoURLBehavior, change tag to Group."""
    spreads_dir = os.path.join(work_dir, 'Spreads')
    btn_only_attrs = (
        'VisibilityInPdf', 'PrintableInPdf', 'HiddenUntilTriggered', 'Description',
    )
    for fname in sorted(os.listdir(spreads_dir)):
        if not fname.endswith('.xml'):
            continue
        spread_path = os.path.join(spreads_dir, fname)
        with open(spread_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if '<Button ' not in content:
            continue

        converted = 0
        # Process buttons one at a time using a stack-based approach
        while True:
            # Find the FIRST <Button ...> tag
            btn_start_match = re.search(r'<Button\s', content)
            if not btn_start_match:
                break

            # Find matching </Button> by counting nesting
            start_pos = btn_start_match.start()
            depth = 0
            i = start_pos
            end_pos = None
            while i < len(content):
                if content[i:i+8] == '<Button ' or content[i:i+8] == '<Button>':
                    depth += 1
                    i += 7
                elif content[i:i+9] == '</Button>':
                    depth -= 1
                    if depth == 0:
                        end_pos = i + 9
                        break
                    i += 8
                else:
                    i += 1

            if end_pos is None:
                break

            btn_xml = content[start_pos:end_pos]

            # Extract the opening Button tag
            open_tag_match = re.match(r'<Button\s[^>]*>', btn_xml)
            open_tag = open_tag_match.group(0)

            # Build new Group opening tag from Button tag
            new_open = open_tag.replace('<Button ', '<Group ', 1)
            for attr in btn_only_attrs:
                new_open = re.sub(rf'\s*{attr}="[^"]*"', '', new_open)

            # Get inner content (between opening tag and </Button>)
            inner = btn_xml[len(open_tag):-len('</Button>')]

            # Remove GotoURLBehavior elements
            inner = re.sub(r'\s*<GotoURLBehavior[^/]*/>', '', inner)

            # Find all State blocks and keep only the first one's content
            # Use stack-based matching for State tags too
            first_state_content = None
            state_start = inner.find('<State ')
            if state_start >= 0:
                # Content before first State (Properties, TextWrapPreference etc)
                before_states = inner[:state_start]

                # Extract first State's inner content
                s_depth = 0
                si = state_start
                first_state_end = None
                while si < len(inner):
                    if inner[si:si+7] == '<State ':
                        s_depth += 1
                        si += 6
                    elif inner[si:si+8] == '</State>':
                        s_depth -= 1
                        if s_depth == 0:
                            first_state_end = si + 8
                            break
                        si += 7
                    else:
                        si += 1

                if first_state_end:
                    first_state = inner[state_start:first_state_end]
                    # Strip State wrapper and its Statetype Properties
                    state_open_match = re.match(r'<State [^>]*>', first_state)
                    state_inner = first_state[len(state_open_match.group(0)):-len('</State>')]
                    # Remove Statetype Properties block
                    state_inner = re.sub(
                        r'\s*<Properties>\s*<Statetype[^<]*/>\s*</Properties>',
                        '', state_inner, count=1)

                    first_state_content = before_states + state_inner
            else:
                # No State wrapper -- use inner as-is
                first_state_content = inner

            replacement = new_open + first_state_content + '</Group>'
            content = content[:start_pos] + replacement + content[end_pos:]
            converted += 1

        if converted:
            with open(spread_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'  {fname}: converted {converted} buttons to groups')


def add_pdf_hyperlinks(work_dir: str, slots: list[SlotInfo],
                       slot_products: dict[str, ProductInfo]):
    """Add standard PDF hyperlinks to designmap.xml.
    These work in Apple Preview, unlike GotoURLBehavior which only works in Acrobat.
    Uses string manipulation to preserve the <?aid?> processing instruction."""
    dm_path = os.path.join(work_dir, 'designmap.xml')
    with open(dm_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def xml_escape(s):
        """Escape special characters for XML attribute values."""
        return (s.replace('&', '&amp;').replace('<', '&lt;')
                 .replace('>', '&gt;').replace("'", '&apos;')
                 .replace('"', '&quot;'))

    # Remove old HyperlinkURLDestination entries
    content = re.sub(
        r'\t<HyperlinkURLDestination [^/]*/>\n', '', content)

    # Build new hyperlink elements
    hyperlink_dests = []
    hyperlink_sources = []
    hyperlinks = []

    for i, slot in enumerate(slots):
        product = slot_products.get(slot.name)
        if not product or not product.product_url or not slot.button_self:
            continue

        url = STORE_BASE_URL + product.product_url
        encoded_url = urllib.parse.quote(url, safe='')
        key = i + 1
        dest_self = f'HyperlinkURLDestination/{encoded_url}'
        source_self = f'HyperlinkPageItemSource/u_hl_{key}'
        hyperlink_self = f'Hyperlink/u_h_{key}'

        safe_name = xml_escape(product.name)
        safe_url = xml_escape(url)

        hyperlink_dests.append(
            f'\t<HyperlinkURLDestination Self="{dest_self}" '
            f'Name="{safe_url}" DestinationURL="{safe_url}" '
            f'Hidden="false" DestinationUniqueKey="{key}" />')

        hyperlink_sources.append(
            f'\t<HyperlinkPageItemSource Self="{source_self}" '
            f'Name="{safe_name}" Hidden="false" '
            f'SourcePageItem="{slot.button_self}" />')

        hyperlinks.append(
            f'\t<Hyperlink Self="{hyperlink_self}" '
            f'Name="{safe_name}" Source="{source_self}" '
            f'Visible="false" Highlight="None" Width="None" '
            f'BorderColor="Black" BorderStyle="Solid">\n'
            f'\t\t<Properties>\n'
            f'\t\t\t<BorderColor type="enumeration">Black</BorderColor>\n'
            f'\t\t\t<Destination type="object">{dest_self}</Destination>\n'
            f'\t\t</Properties>\n'
            f'\t</Hyperlink>')

    if not hyperlinks:
        return

    # Insert before </idPkg:BackingStory> or before closing </Document>
    insert_block = '\n'.join(hyperlink_dests + hyperlink_sources + hyperlinks)

    # Find insertion point -- before </Document>
    close_tag = '</Document>'
    idx = content.rfind(close_tag)
    if idx >= 0:
        content = content[:idx] + insert_block + '\n' + content[idx:]

    with open(dm_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  Added {len(hyperlinks)} PDF hyperlinks')


def generate_catalog(idml_path: str, csv_path: str, output_path: str,
                     ar_skus: set[str] = None, remove_bg: bool = False):
    """Main entry point: generate a catalog from IDML template + BC CSV."""
    print(f'Parsing BigCommerce CSV: {csv_path}')
    products = parse_bc_csv(csv_path)
    print(f'  {len(products)} products loaded')

    print(f'\nGrouping products by Summer Catalog categories...')
    sections = get_products_by_category(products)
    for name, prods in sorted(sections.items()):
        print(f'  {name}: {len(prods)} products')

    # Extract IDML
    work_dir = tempfile.mkdtemp(prefix='idml_catalog_')
    output_dir = os.path.dirname(os.path.abspath(output_path))
    links_dir = os.path.join(output_dir, 'Links')
    os.makedirs(links_dir, exist_ok=True)

    try:
        print(f'\nExtracting IDML: {idml_path}')
        with zipfile.ZipFile(idml_path, 'r') as zf:
            zf.extractall(work_dir)

        # Scan template slots
        print('Scanning IDML template for book slots...')
        slots = scan_idml_slots(work_dir)
        print(f'  {len(slots)} book slots found')

        # Match slots to products
        slot_products = {}
        warnings = []

        for section_name, section_prods in sections.items():
            # Find slots for this section, sorted by B number
            section_slots = sorted(
                [s for s in slots if s.section == section_name],
                key=lambda s: int(re.search(r'(\d+)$', s.bnum).group(1))
                    if re.search(r'(\d+)$', s.bnum) else 0
            )

            if not section_slots:
                warnings.append(
                    f'Section "{section_name}" has {len(section_prods)} products '
                    f'but no IDML slots')
                continue

            if len(section_prods) > len(section_slots):
                warnings.append(
                    f'Section "{section_name}": {len(section_prods)} products '
                    f'but only {len(section_slots)} slots '
                    f'(using first {len(section_slots)})')
            elif len(section_prods) < len(section_slots):
                warnings.append(
                    f'Section "{section_name}": {len(section_prods)} products '
                    f'but {len(section_slots)} slots '
                    f'({len(section_slots) - len(section_prods)} slots unfilled)')

            for i, slot in enumerate(section_slots):
                if i < len(section_prods):
                    product = section_prods[i]
                    # Mark AR status
                    if ar_skus:
                        product.is_ar = product.sku in ar_skus
                    slot_products[slot.name] = product

        if warnings:
            print('\nWarnings:')
            for w in warnings:
                print(f'  {w}')

        # Update stories (skip button-only slots which have no per-book text)
        print(f'\nUpdating {len(slot_products)} book slots...')
        for slot in slots:
            product = slot_products.get(slot.name)
            if not product:
                continue
            is_ar = product.is_ar if ar_skus else slot.has_ar
            if slot.story_id:
                build_story_xml(work_dir, slot.story_id, product,
                                slot.needs_white, is_ar)
            ar_str = ' [AR]' if is_ar else ''
            img_only = ' (image+link only)' if not slot.story_id else ''
            print(f'  {slot.name:45s} -> {product.name[:30]:30s} '
                  f'{product.sku:12s} {product.price}{ar_str}{img_only}')

        # Apply spread changes (images, links, AR removal, text frame extension)
        print('\nApplying spread changes...')
        apply_spread_changes(work_dir, slots, slot_products, links_dir,
                             remove_bg=remove_bg)

        # Convert Buttons to Groups (so Print PDF export shows images)
        print('\nConverting buttons to groups...')
        convert_buttons_to_groups(work_dir)

        # Add PDF hyperlinks to designmap.xml (for Apple Preview compatibility)
        print('\nAdding PDF hyperlinks...')
        add_pdf_hyperlinks(work_dir, slots, slot_products)

        # Validate XML
        print('\nValidating...')
        for fname in sorted(os.listdir(os.path.join(work_dir, 'Spreads'))):
            if not fname.endswith('.xml'):
                continue
            try:
                ET.parse(os.path.join(work_dir, 'Spreads', fname))
            except ET.ParseError as e:
                print(f'  ERROR {fname}: {e}')

        # Repack
        print(f'\nRepacking: {output_path}')
        with zipfile.ZipFile(output_path, 'w') as zf:
            mimetype = os.path.join(work_dir, 'mimetype')
            if os.path.exists(mimetype):
                zf.write(mimetype, 'mimetype', compress_type=zipfile.ZIP_STORED)
            for rd, dirs, files in os.walk(work_dir):
                dirs.sort()
                for f in sorted(files):
                    if f == 'mimetype':
                        continue
                    full = os.path.join(rd, f)
                    zf.write(full, os.path.relpath(full, work_dir),
                             compress_type=zipfile.ZIP_DEFLATED)

        print(f'\nDone! Output: {output_path}')
        print(f'Images saved to: {links_dir}')

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description='Generate InDesign catalog from BigCommerce data')
    parser.add_argument('--idml', required=True,
                        help='IDML template file')
    parser.add_argument('--csv', required=True,
                        help='BigCommerce product export CSV')
    parser.add_argument('--output', required=True,
                        help='Output IDML file path')
    parser.add_argument('--ar-skus', nargs='*',
                        help='SKUs that are Accelerated Reader designated')
    parser.add_argument('--remove-bg', action='store_true',
                        help='Remove image backgrounds using AI (saves as PNG)')
    args = parser.parse_args()

    ar_skus = set(args.ar_skus) if args.ar_skus else None
    generate_catalog(args.idml, args.csv, args.output, ar_skus,
                     remove_bg=args.remove_bg)


if __name__ == '__main__':
    main()
