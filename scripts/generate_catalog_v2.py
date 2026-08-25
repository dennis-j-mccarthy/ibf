#!/usr/bin/env python3
"""
Generate an InDesign IDML catalog from a BigCommerce product CSV and an IDML template (V2).

V2 differences from V1:
- Auto-matches BC "Sneak Peek Catholic" subcategories to IDML group names by name
- AR badge from BC custom field (AR=AR), not hardcoded SKUs
- Stories have only title + price (no SKU line)
- All slots are Groups (no Buttons), uses Hyperlink elements for Preview+Acrobat compat

Usage:
    python generate_catalog_v2.py \
        --idml /path/to/template.idml \
        --csv /path/to/bigcommerce-export.csv \
        --output /path/to/output.idml
"""

import argparse
import csv
import json
import os
import re
import shutil
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass, field

ET.register_namespace('idPkg', 'http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging')

STORE_BASE_URL = 'https://store.ignatiusbookfairs.com'

# BC subcategories -- maps category ID to BC subcategory name (also used as IDML
# section label by default). When the IDML group name differs from the BC name,
# add an entry to SECTION_NAME_TO_IDML_GROUP for the active mode.
CATHOLIC_CATEGORY_MAP = {
    439: 'Adventure',
    440: 'Age 13+',
    432: 'Comics & Graphic Novels',
    433: 'Crafts and Activities',
    429: 'Early Childhood',
    430: 'Early Childhood Continued',
    431: 'Fairytales & Fantasy',
    437: 'For the Parents',
    436: 'Grow in Faith',
    438: 'Saints & Heroes',
    435: 'Sports',
    428: 'Spotlight',
    434: 'Classics',
}

PUBLIC_CATEGORY_MAP = {
    442: "Kid's Picks Spotlight",
    443: 'Early Childhood',
    444: 'Early Childhood Continued',
    445: 'Graphic Novels',
    446: 'Age 13+',
    447: 'Adventure',
    448: 'Fairytales & Fantasy',
    449: 'Hands-On Crafts and Activities',
    450: 'Classics',
    451: 'Sports',
    452: 'Grade School',
    453: 'Staff Favorites',
    454: 'Graphic Adventure',
}

# Catholic October 2026 fall flyer. Parent category is 477; these are its subcats.
FALL_2026_CATEGORY_MAP = {
    478: 'It feels like Fall!',
    479: 'Thankful & Grateful',
    480: 'Chapter Books',
    481: 'Picture Books To Inspire Little Ones',
    482: 'Saint Story Chapter Books',
    483: 'Saintly Reads',
    484: 'Plushies!',
}

# When a BC subcategory name doesn't match the IDML group name exactly,
# map BC-name -> IDML section label (group name minus " Group").
PUBLIC_SECTION_TO_IDML_GROUP = {
    'Hands-On Crafts and Activities': 'Crafts and Activities',
}
CATHOLIC_SECTION_TO_IDML_GROUP = {}
# The fall flyer's groups were renamed to match BC exactly, so no remapping.
FALL_2026_SECTION_TO_IDML_GROUP = {}

# Active maps (set by main() based on --mode)
SNEAK_PEEK_CATEGORY_MAP = CATHOLIC_CATEGORY_MAP
SECTION_NAME_TO_IDML_GROUP = CATHOLIC_SECTION_TO_IDML_GROUP

# Font sizes
TITLE_SIZE = 10.0
TITLE_LEADING = 10.5
PRICE_SIZE = 12.0
PRICE_LEADING = 13.0

# Sections with dark backgrounds where text should be white
WHITE_TEXT_SECTIONS = set()  # auto-detected from template

# Manual product ordering overrides per section.
# Maps section name -> list of SKUs in the order they should appear in the catalog.
# SKUs not in the list fall back to BC Sort Order.
# Use this when the visual layout requires a specific order (e.g., bundled slots).
PRODUCT_ORDER_OVERRIDES = {}

# Per-SKU display name overrides. Use when the BC product name is too long
# to fit the catalog slot. Does not affect BC data.
PRODUCT_NAME_OVERRIDES = {
    'IBC.1584': 'Penderwicks: A Summer Tale',
}

# Per-SKU image URL overrides. Use when BC CSV is missing the image URL but
# the cover exists on the CDN. Does not affect BC data.
PRODUCT_IMAGE_OVERRIDES = {
    'IBC.1560': 'https://cdn11.bigcommerce.com/s-2fsgnphxqm/images/stencil/original/products/2794/3066/IMG_0309__43846.1778812871.jpg',
}


@dataclass
class ProductInfo:
    name: str
    sku: str
    price: str
    image_url: str
    product_url: str
    categories: set = field(default_factory=set)
    is_ar: bool = False
    sort_order: int = 0


@dataclass
class SlotInfo:
    section: str
    cat_num: int
    book_num: int
    story_id: str
    link_self: str
    image_self: str
    rect_self: str
    rect_bounds: tuple
    ar_group_self: str  # Self ID of the AR group (to remove if not AR)
    spread: str
    is_subgroup: bool = False  # Fairytales subgroup rectangles
    needs_white: bool = False
    # For "shared text" slots: list of book numbers whose titles/prices should be combined
    combined_book_nums: list = field(default_factory=list)


def xml_escape(s: str) -> str:
    return (s.replace('&', '&amp;').replace('<', '&lt;')
             .replace('>', '&gt;').replace("'", '&apos;')
             .replace('"', '&quot;'))


def parse_bc_csv(csv_path: str) -> dict[str, ProductInfo]:
    """Parse BigCommerce export CSV.
    Custom Fields is a JSON column on the Product row.
    Image rows follow each Product row."""
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
                            try:
                                cat_ids.add(int(cid))
                            except ValueError:
                                pass

                    # Parse Custom Fields JSON for AR flag
                    is_ar = False
                    cf_raw = row.get('Custom Fields', '').strip()
                    if cf_raw:
                        try:
                            cfs = json.loads(cf_raw)
                            for cf in cfs:
                                if cf.get('name') == 'AR' or cf.get('value') == 'AR':
                                    is_ar = True
                                    break
                        except json.JSONDecodeError:
                            pass

                    sort_raw = row.get('Sort Order', '0').strip()
                    try:
                        sort_order = int(sort_raw)
                    except ValueError:
                        sort_order = 0

                    products[sku] = ProductInfo(
                        name=PRODUCT_NAME_OVERRIDES.get(sku, row.get('Name', '').strip()),
                        sku=sku,
                        price=price_formatted,
                        image_url='',
                        product_url=row.get('Product URL', '').strip(),
                        categories=cat_ids,
                        is_ar=is_ar,
                        sort_order=sort_order,
                    )

            elif item_type == 'Image' and current_sku and current_sku in products:
                url = (row.get('Internal Image URL (Export)', '').strip()
                       or row.get('Image URL (Import)', '').strip())
                if url:
                    is_thumb = row.get('Image is Thumbnail', '').strip().upper() == 'TRUE'
                    if is_thumb:
                        products[current_sku].image_url = url
                    elif not products[current_sku].image_url:
                        products[current_sku].image_url = url

    # Apply per-SKU image URL overrides (wins over CSV)
    for sku, override_url in PRODUCT_IMAGE_OVERRIDES.items():
        if sku in products:
            products[sku].image_url = override_url

    return products


def group_products_by_section(products: dict[str, ProductInfo]) -> dict[str, list[ProductInfo]]:
    """Group products by Sneak Peek subcategory name.
    Within each section, products are sorted by:
    1. PRODUCT_ORDER_OVERRIDES (if defined for that section)
    2. BC Sort Order ascending
    3. SKU as tiebreaker"""
    sections = {}
    for cat_id, section_name in SNEAK_PEEK_CATEGORY_MAP.items():
        section_products = []
        for product in products.values():
            if cat_id in product.categories:
                section_products.append(product)
        if not section_products:
            continue

        override = PRODUCT_ORDER_OVERRIDES.get(section_name)
        if override:
            # Sort by position in override list; SKUs not in override go to end
            order_map = {sku: i for i, sku in enumerate(override)}
            section_products.sort(
                key=lambda p: (order_map.get(p.sku, 9999), p.sort_order, p.sku))
        else:
            section_products.sort(key=lambda p: (p.sort_order, p.sku))
        sections[section_name] = section_products
    return sections


def _get_rect_bounds(rect_el):
    """Extract rectangle bounds from PathPointType anchors."""
    pts = []
    for pp in rect_el.iter('PathPointType'):
        a = pp.get('Anchor', '')
        if a:
            pts.append(tuple(float(v) for v in a.split()))
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return (min(xs), min(ys), max(xs), max(ys))
    return None


def _parse_transform(transform_str):
    """Parse an ItemTransform string '1 0 0 1 tx ty' -> (tx, ty). Returns (0, 0) if invalid."""
    if not transform_str:
        return (0.0, 0.0)
    parts = transform_str.strip().split()
    if len(parts) >= 6:
        try:
            return (float(parts[4]), float(parts[5]))
        except ValueError:
            return (0.0, 0.0)
    return (0.0, 0.0)


def _get_visual_position(slot_el):
    """Get the visual (X, Y) position of a slot for sorting in reading order.
    Walks the element's ItemTransform plus any inner Rectangle bounds to get
    the actual on-page position."""
    # Start with the element's own ItemTransform
    transform = slot_el.get('ItemTransform', '')
    tx, ty = _parse_transform(transform)

    # Add the inner rectangle's bounds (the rect is offset from the group origin)
    for rect in slot_el.iter('Rectangle'):
        bounds = _get_rect_bounds(rect)
        if bounds:
            # Rect bounds are relative to the slot's own coordinate system.
            # Add them to get the on-page position of the rect's top-left.
            return (tx + bounds[0], ty + bounds[1])
        break

    return (tx, ty)


def _assign_book_nums_by_visual_order(slot_elements):
    """Sort slots in visual reading order: top-to-bottom rows, left-to-right within.

    Uses the slot's ItemTransform tx/ty (relative to parent section group) since
    all slots within a section share the same parent coordinate system.

    Row clustering: sort by Y, then walk top-to-bottom. A new row begins when
    we see a Y position more than ROW_GAP_THRESHOLD points below the row's top."""
    ROW_GAP_THRESHOLD = 100  # points

    positioned = []
    for item in slot_elements:
        el = item['element']
        # The slot group's own transform PLUS the inner Rectangle's transform
        # gives the true on-page position.
        group_t = el.get('ItemTransform', '') if hasattr(el, 'get') else ''
        gtx, gty = _parse_transform(group_t)
        rtx, rty = 0.0, 0.0
        if hasattr(el, 'iter'):
            # For a Group, find its first inner Rectangle
            # For a Rectangle (subgroup case), use its own transform
            if el.tag == 'Rectangle':
                rtx, rty = _parse_transform(el.get('ItemTransform', ''))
            else:
                for rect in el.iter('Rectangle'):
                    rtx, rty = _parse_transform(rect.get('ItemTransform', ''))
                    break
        positioned.append({**item, 'x': gtx + rtx, 'y': gty + rty})

    # Sort by Y ascending (top first)
    positioned.sort(key=lambda i: i['y'])

    # Cluster into rows
    rows = []
    current_row = []
    row_top_y = None
    for item in positioned:
        if row_top_y is None or (item['y'] - row_top_y) < ROW_GAP_THRESHOLD:
            current_row.append(item)
            if row_top_y is None:
                row_top_y = item['y']
        else:
            rows.append(current_row)
            current_row = [item]
            row_top_y = item['y']
    if current_row:
        rows.append(current_row)

    # Sort each row left-to-right by X
    result = []
    for row in rows:
        row.sort(key=lambda i: i['x'])
        result.extend(row)
    return result


def _find_ar_group(slot_el):
    """Find the AR group's Self ID within a slot."""
    for g in slot_el.iter('Group'):
        if g.get('Name', '') == 'ar':
            return g.get('Self', '')
    return None


def _extract_slot_info(slot_el, section_name, cat_num, book_num, spread_fname,
                       is_subgroup=False, work_dir=None):
    """Extract slot info from a group/rectangle element."""
    story_id = None
    link_self = None
    image_self = None
    rect_self = None
    rect_bounds = None

    # Collect Self IDs of TextFrames inside any 'ar' group so we can skip them
    ar_text_frames = set()
    for ar in slot_el.iter('Group'):
        if ar.get('Name', '') == 'ar':
            for tf in ar.iter('TextFrame'):
                ar_text_frames.add(tf.get('Self', ''))
    for tf in slot_el.iter('TextFrame'):
        if tf.get('Self', '') in ar_text_frames:
            continue
        sid = tf.get('ParentStory', '')
        if sid:
            spath = os.path.join(work_dir, 'Stories', f'Story_{sid}.xml')
            if os.path.exists(spath):
                story_id = sid
                break

    for link in slot_el.iter('Link'):
        link_self = link.get('Self', '')
        break

    if slot_el.tag == 'Rectangle':
        rect_self = slot_el.get('Self', '')
        rect_bounds = _get_rect_bounds(slot_el)
        for img in slot_el.iter('Image'):
            image_self = img.get('Self', '')
            break
    else:
        for rect in slot_el.iter('Rectangle'):
            rect_self = rect.get('Self', '')
            rect_bounds = _get_rect_bounds(rect)
            for img in rect.iter('Image'):
                image_self = img.get('Self', '')
            break

    ar_group_self = _find_ar_group(slot_el) if slot_el.tag == 'Group' else None

    # Detect white text from existing story
    needs_white = False
    if story_id:
        spath = os.path.join(work_dir, 'Stories', f'Story_{story_id}.xml')
        if os.path.exists(spath):
            with open(spath) as f:
                if 'FillColor="Color/Paper"' in f.read():
                    needs_white = True

    return SlotInfo(
        section=section_name, cat_num=cat_num, book_num=book_num,
        story_id=story_id, link_self=link_self, image_self=image_self,
        rect_self=rect_self, rect_bounds=rect_bounds,
        ar_group_self=ar_group_self, spread=spread_fname,
        is_subgroup=is_subgroup, needs_white=needs_white,
    )


def scan_idml_slots(work_dir: str) -> list[SlotInfo]:
    """Scan all spreads for book slots within named section groups."""
    slots = []
    sections_found = []

    for fname in sorted(os.listdir(os.path.join(work_dir, 'Spreads'))):
        if not fname.endswith('.xml'):
            continue
        tree = ET.parse(os.path.join(work_dir, 'Spreads', fname))
        for group in tree.getroot().iter('Group'):
            name = group.get('Name', '')
            if name.endswith(' Group') and name != 'ar' and name not in [s[0] for s in sections_found]:
                sections_found.append((name, fname))

    cat_num = 0
    for section_name, spread_fname in sections_found:
        cat_num += 1
        section_label = section_name.removesuffix(' Group')
        tree = ET.parse(os.path.join(work_dir, 'Spreads', spread_fname))

        for group in tree.getroot().iter('Group'):
            if group.get('Name', '') != section_name:
                continue

            # Collect all standard slot elements first, then sort by visual position
            # before assigning book_nums. This makes B1 always top-left, etc.
            standard_slot_candidates = []
            subgroup_data = None  # (subgroup_element, list_of_rect_elements, shared_text_element)
            nested_section_groups = []  # (nested_group_element)

            for child in group:
                if child.tag != 'Group':
                    continue
                cname = child.get('Name', '')

                # Skip AR groups
                if cname == 'ar':
                    continue

                # Subgroup (Fairytales-style: shared text + 3 rectangles)
                if cname and 'Subgroup' in cname:
                    rect_elems = []
                    shared_text_elem = None
                    for sc in child:
                        if sc.tag == 'Rectangle':
                            rect_elems.append(sc)
                        elif sc.tag == 'Group':
                            scname = sc.get('Name', '')
                            if not scname or scname == '$ID/' or scname.startswith('$ID/'):
                                shared_text_elem = sc
                    subgroup_data = (child, rect_elems, shared_text_elem)
                    continue

                # Nested section (Crafts pattern)
                if cname == section_name:
                    nested_section_groups.append(child)
                    continue

                # Skip named non-slot groups
                if cname and cname != '$ID/' and not cname.startswith('$ID/'):
                    continue

                # Standard slot candidate
                standard_slot_candidates.append({'element': child})

            # Handle nested section pattern -- treat inner groups as standard candidates
            for nested in nested_section_groups:
                for sc in nested:
                    if sc.tag == 'Group':
                        scname = sc.get('Name', '')
                        if scname == 'ar':
                            continue
                        if not scname or scname == '$ID/' or scname.startswith('$ID/'):
                            standard_slot_candidates.append({'element': sc})

            # Sort standard candidates by visual reading order
            ordered = _assign_book_nums_by_visual_order(standard_slot_candidates)

            book_num = 0
            for item in ordered:
                book_num += 1
                slot = _extract_slot_info(
                    item['element'], section_label, cat_num, book_num,
                    spread_fname, work_dir=work_dir)
                slots.append(slot)

            # Handle subgroup after standard slots
            if subgroup_data:
                subgroup_el, rect_elems, shared_text_elem = subgroup_data
                # Sort the 3 rectangles by visual position too
                rect_items = [{'element': r} for r in rect_elems]
                ordered_rects = _assign_book_nums_by_visual_order(rect_items)
                rect_book_nums = []
                for item in ordered_rects:
                    book_num += 1
                    rect_book_nums.append(book_num)
                    slot = _extract_slot_info(
                        item['element'], section_label, cat_num, book_num,
                        spread_fname, is_subgroup=True, work_dir=work_dir)
                    slot.story_id = None
                    slots.append(slot)
                if shared_text_elem is not None:
                    slot = _extract_slot_info(
                        shared_text_elem, section_label, cat_num,
                        rect_book_nums[0] if rect_book_nums else 0,
                        spread_fname, is_subgroup=True, work_dir=work_dir)
                    slot.image_self = None
                    slot.rect_self = None
                    slot.rect_bounds = None
                    slot.link_self = None
                    slot.combined_book_nums = list(rect_book_nums)
                    slots.append(slot)

    return slots


def build_combined_story_xml(work_dir: str, story_id: str,
                              products: list, needs_white: bool):
    """Build a story with inline title (price) pairs (Fairytales Subgroup pattern).
    Format: 'Title 1 ($X.XX), Title 2 ($Y.YY), Title 3 ($Z.ZZ)' all in one paragraph."""
    story_path = os.path.join(work_dir, 'Stories', f'Story_{story_id}.xml')
    cs = 'CharacterStyle/$ID/[No character style]'
    fc = ' FillColor="Color/Paper"' if needs_white else ''
    price_color = 'Color/Paper' if needs_white else 'Color/r255g0b0'

    xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    xml += '<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.0">\n'
    xml += f'<Story Self="{story_id}" UserText="true" IsEndnoteStory="false" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">\n'
    xml += '<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection" />\n'
    xml += '<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />\n'
    xml += '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" Hyphenation="false">\n'

    for i, product in enumerate(products):
        is_last = (i == len(products) - 1)
        separator = '' if is_last else ', '
        # Title (bold) followed by ' ('
        xml += f'<CharacterStyleRange AppliedCharacterStyle="{cs}"{fc} FontStyle="Bold" PointSize="{TITLE_SIZE}" Tracking="-10">\n'
        xml += f'<Properties><Leading type="unit">{TITLE_LEADING}</Leading><AppliedFont type="string">Brother 1816</AppliedFont></Properties>\n'
        xml += f'<Content>{xml_escape(product.name)} (</Content>\n'
        xml += '</CharacterStyleRange>\n'
        # Price (extra bold, colored)
        xml += f'<CharacterStyleRange AppliedCharacterStyle="{cs}" FillColor="{price_color}" FontStyle="ExtraBold" PointSize="{PRICE_SIZE}">\n'
        xml += f'<Properties><Leading type="unit">{PRICE_LEADING}</Leading><AppliedFont type="string">Brother 1816</AppliedFont></Properties>\n'
        xml += f'<Content>{xml_escape(product.price)}</Content>\n'
        xml += '</CharacterStyleRange>\n'
        # Closing paren and separator (back to title style for consistency)
        xml += f'<CharacterStyleRange AppliedCharacterStyle="{cs}"{fc} FontStyle="Bold" PointSize="{TITLE_SIZE}" Tracking="-10">\n'
        xml += f'<Properties><Leading type="unit">{TITLE_LEADING}</Leading><AppliedFont type="string">Brother 1816</AppliedFont></Properties>\n'
        xml += f'<Content>){xml_escape(separator)}</Content>\n'
        xml += '</CharacterStyleRange>\n'

    xml += '</ParagraphStyleRange>\n'
    xml += '</Story></idPkg:Story>'

    with open(story_path, 'w', encoding='utf-8') as f:
        f.write(xml)


def build_story_xml(work_dir: str, story_id: str, title: str, price: str,
                    needs_white: bool):
    """Rebuild story XML with clean title + price (no SKU)."""
    story_path = os.path.join(work_dir, 'Stories', f'Story_{story_id}.xml')
    cs = 'CharacterStyle/$ID/[No character style]'
    fc = ' FillColor="Color/Paper"' if needs_white else ''
    price_color = 'Color/Paper' if needs_white else 'Color/r255g0b0'
    title_esc = xml_escape(title)

    xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    xml += '<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.0">\n'
    xml += f'<Story Self="{story_id}" UserText="true" IsEndnoteStory="false" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">\n'
    xml += '<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection" />\n'
    xml += '<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />\n'
    xml += '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" Hyphenation="false">\n'
    # Title
    xml += f'<CharacterStyleRange AppliedCharacterStyle="{cs}"{fc} FontStyle="Bold" PointSize="{TITLE_SIZE}" Tracking="-10">\n'
    xml += f'<Properties><Leading type="unit">{TITLE_LEADING}</Leading><AppliedFont type="string">Brother 1816</AppliedFont></Properties>\n'
    xml += f'<Content>{title_esc}</Content><Br />\n'
    xml += '</CharacterStyleRange>\n'
    # Price
    xml += f'<CharacterStyleRange AppliedCharacterStyle="{cs}" FillColor="{price_color}" FontStyle="ExtraBold" PointSize="{PRICE_SIZE}">\n'
    xml += f'<Properties><Leading type="unit">{PRICE_LEADING}</Leading><AppliedFont type="string">Brother 1816</AppliedFont></Properties>\n'
    xml += f'<Content>{xml_escape(price)}</Content>\n'
    xml += '</CharacterStyleRange>\n'
    xml += '</ParagraphStyleRange>\n'
    xml += '</Story></idPkg:Story>'

    with open(story_path, 'w', encoding='utf-8') as f:
        f.write(xml)


def download_image(image_url: str, links_dir: str, sku: str) -> str:
    """Download image from BC CDN to local Links folder."""
    os.makedirs(links_dir, exist_ok=True)
    parsed = urllib.parse.urlparse(image_url)
    _, ext = os.path.splitext(parsed.path)
    if not ext:
        ext = '.jpg'
    safe_sku = sku.replace('.', '_').replace(' ', '_')
    filename = f'{safe_sku}{ext}'
    local_path = os.path.join(links_dir, filename)
    if not os.path.exists(local_path):
        try:
            urllib.request.urlretrieve(image_url, local_path)
        except Exception as e:
            print(f'    WARNING: Failed to download {image_url}: {e}')
            return None
    return local_path


def apply_spread_changes(work_dir: str, slots: list[SlotInfo],
                         slot_products: dict, links_dir: str):
    """Apply image swaps, AR badge removal for non-AR products, in spread XMLs."""
    # Group slots by spread
    spread_slots = {}
    for slot in slots:
        spread_slots.setdefault(slot.spread, []).append(slot)

    for fname, slot_list in spread_slots.items():
        spread_path = os.path.join(work_dir, 'Spreads', fname)
        with open(spread_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Process each slot
        for slot in slot_list:
            product = slot_products.get((slot.cat_num, slot.book_num))
            if not product:
                # Slot has no product -- hide the AR badge so no orphaned graphic prints
                if slot.ar_group_self:
                    content = _hide_group_by_self(content, slot.ar_group_self)
                continue

            # Download image and update Link URI
            if product.image_url and slot.link_self:
                local_path = download_image(product.image_url, links_dir, product.sku)
                if local_path:
                    new_uri = 'file:' + urllib.parse.quote(local_path, safe='/:')
                    content = _replace_link_uri(content, slot.link_self, new_uri)

                    # Update image transform to contain-fit
                    if slot.image_self and slot.rect_bounds:
                        content = _update_image_transform(
                            content, slot.image_self, slot.rect_bounds, local_path)

            # Clear rectangle fill
            if slot.rect_self:
                content = _clear_rect_fill(content, slot.rect_self)

            # Hide the AR badge when the product is not AR; show it when it is.
            # Setting both ways keeps the run idempotent -- re-running against
            # corrected data flips badges back on instead of being a no-op.
            if slot.ar_group_self:
                content = (_show_group_by_self if product.is_ar else _hide_group_by_self)(
                    content, slot.ar_group_self)

        with open(spread_path, 'w', encoding='utf-8') as f:
            f.write(content)


def _replace_link_uri(content: str, link_self: str, new_uri: str) -> str:
    """Replace the LinkResourceURI of a specific Link by Self ID."""
    ls_pos = content.find(f'Self="{link_self}"')
    if ls_pos < 0:
        return content
    tag_open = content.rfind('<Link ', 0, ls_pos)
    if tag_open < 0:
        return content
    tag_end = content.find('/>', tag_open) + 2
    if tag_end <= tag_open:
        return content
    link_tag = content[tag_open:tag_end]
    new_tag = re.sub(r'LinkResourceURI="[^"]*"',
                     f'LinkResourceURI="{new_uri}"', link_tag)
    return content[:tag_open] + new_tag + content[tag_end:]


def _update_image_transform(content: str, image_self: str,
                             rect_bounds: tuple, local_path: str) -> str:
    """Update Image ItemTransform to fit within rectangle (contain mode)."""
    try:
        from PIL import Image as PILImage
        with PILImage.open(local_path) as img:
            img_w, img_h = img.size
    except Exception:
        return content

    rx1, ry1, rx2, ry2 = rect_bounds
    fw, fh = rx2 - rx1, ry2 - ry1
    scale = min(fw / img_w, fh / img_h)
    tx = rx1 - (img_w * scale - fw) / 2
    ty = ry1 - (img_h * scale - fh) / 2

    img_pat = f'Self="{image_self}"'
    if img_pat not in content:
        return content
    idx = content.index(img_pat)
    end = content.index('/>', idx) + 2
    region = content[idx:end]
    region = re.sub(r'ItemTransform="[^"]*"',
        f'ItemTransform="{scale} 0 0 {scale} {tx} {ty}"', region, count=1)
    region = re.sub(r'(GraphicBounds[^>]*Right=")[^"]*"',
        rf'\g<1>{img_w}"', region, count=1)
    region = re.sub(r'(GraphicBounds[^>]*Bottom=")[^"]*"',
        rf'\g<1>{img_h}"', region, count=1)
    return content[:idx] + region + content[end:]


def _clear_rect_fill(content: str, rect_self: str) -> str:
    """Set the Rectangle's FillColor to None (no pink gap)."""
    pat = f'<Rectangle Self="{rect_self}"'
    idx = content.find(pat)
    if idx < 0:
        return content
    tag_end = content.find('>', idx)
    if tag_end < 0:
        return content
    rect_tag = content[idx:tag_end]
    new_tag = re.sub(r'FillColor="[^"]*"', 'FillColor="Swatch/None"',
                     rect_tag, count=1)
    return content[:idx] + new_tag + content[tag_end:]


def _hide_group_by_self(content: str, group_self: str) -> str:
    """Hide a Group by Self ID -- set Visible="false" on its opening tag.

    Badges are hidden, never deleted. Deleting is one-way: a generated flyer
    then can't be re-run against corrected data, because the badge groups are
    gone and nothing in this script recreates them (only prepare_flyer_slots.py
    clones them, and that runs on the unprepped flyer). Hiding keeps every
    output re-runnable.
    """
    start = content.find(f'<Group Self="{group_self}"')
    if start < 0:
        return content
    tag_end = content.find('>', start)
    if tag_end < 0:
        return content
    tag = content[start:tag_end]
    if 'Visible="' in tag:
        new_tag = re.sub(r'Visible="[^"]*"', 'Visible="false"', tag, count=1)
    else:
        new_tag = tag + ' Visible="false"'
    return content[:start] + new_tag + content[tag_end:]


def _show_group_by_self(content: str, group_self: str) -> str:
    """Un-hide a Group by Self ID -- set Visible="true" on its opening tag."""
    start = content.find(f'<Group Self="{group_self}"')
    if start < 0:
        return content
    tag_end = content.find('>', start)
    if tag_end < 0:
        return content
    tag = content[start:tag_end]
    if 'Visible="' in tag:
        new_tag = re.sub(r'Visible="[^"]*"', 'Visible="true"', tag, count=1)
    else:
        new_tag = tag + ' Visible="true"'
    return content[:start] + new_tag + content[tag_end:]


def _remove_group_by_self(content: str, group_self: str) -> str:
    """Remove a Group element by Self ID using stack-based matching."""
    pat = f'<Group Self="{group_self}"'
    start = content.find(pat)
    if start < 0:
        return content

    # Find matching </Group> with depth counting
    depth = 0
    i = start
    end = None
    while i < len(content):
        if content[i:i+7] == '<Group ' or content[i:i+7] == '<Group>':
            depth += 1
            i += 6
        elif content[i:i+8] == '</Group>':
            depth -= 1
            if depth == 0:
                end = i + 8
                break
            i += 7
        else:
            i += 1

    if end is None:
        return content
    return content[:start] + content[end:]


def add_pdf_hyperlinks(work_dir: str, slots: list[SlotInfo],
                       slot_products: dict):
    """Update hyperlinks in designmap.xml with real product URLs."""
    dm_path = os.path.join(work_dir, 'designmap.xml')
    with open(dm_path, 'r', encoding='utf-8') as f:
        dm = f.read()

    # Remove old hyperlink entries. All three kinds must go together: the two
    # lines below drop EVERY destination and page-item source, so any Hyperlink
    # left behind would reference a Source that no longer exists. Matching only
    # this script's own "u_h_<n>" names left InDesign's hand-authored hyperlinks
    # dangling -- 64 Hyperlink records against 31 sources, half of them still
    # pointing at last season's product URLs.
    dm = re.sub(r'\t<HyperlinkURLDestination [^/]*/>\n', '', dm)
    dm = re.sub(r'\t<HyperlinkPageItemSource [^/]*/>\n', '', dm)
    dm = re.sub(r'\t<Hyperlink Self="[^"]*".*?</Hyperlink>\n', '', dm, flags=re.DOTALL)
    dm = re.sub(r'\t<Hyperlink Self="[^"]*"[^>]*/>\n', '', dm)

    dests = []
    sources = []
    hyperlinks = []
    key = 0
    seen = set()
    for slot in slots:
        product = slot_products.get((slot.cat_num, slot.book_num))
        if not product or not product.product_url or not slot.rect_self:
            continue
        key += 1
        url = STORE_BASE_URL + product.product_url
        # Make destination URL unique (BC products may appear in multiple slots)
        unique_url = url + f'?k={key}' if url in seen else url
        seen.add(url)
        encoded = urllib.parse.quote(url, safe='') + f'_{key}'
        dest_self = f'HyperlinkURLDestination/{encoded}'
        source_self = f'HyperlinkPageItemSource/u_hl_{key}'
        hl_self = f'Hyperlink/u_h_{key}'
        safe_name = xml_escape(product.name)
        safe_url = xml_escape(url)

        dests.append(f'\t<HyperlinkURLDestination Self="{dest_self}" Name="{safe_url}" DestinationURL="{safe_url}" Hidden="false" DestinationUniqueKey="{key}" />')
        sources.append(f'\t<HyperlinkPageItemSource Self="{source_self}" Name="{safe_name}" Hidden="false" SourcePageItem="{slot.rect_self}" />')
        hyperlinks.append(
            f'\t<Hyperlink Self="{hl_self}" Name="{safe_name}" Source="{source_self}" '
            f'Visible="false" Highlight="None" Width="None" BorderColor="Black" BorderStyle="Solid">\n'
            f'\t\t<Properties>\n'
            f'\t\t\t<BorderColor type="enumeration">Black</BorderColor>\n'
            f'\t\t\t<Destination type="object">{dest_self}</Destination>\n'
            f'\t\t</Properties>\n'
            f'\t</Hyperlink>')

    insert_block = '\n'.join(dests + sources + hyperlinks)
    close_tag = '</Document>'
    idx = dm.rfind(close_tag)
    if idx >= 0:
        dm = dm[:idx] + insert_block + '\n' + dm[idx:]

    with open(dm_path, 'w', encoding='utf-8') as f:
        f.write(dm)

    print(f'  Added {key} PDF hyperlinks')


def generate_catalog(idml_path: str, csv_path: str, output_path: str):
    print(f'Parsing BigCommerce CSV: {csv_path}')
    products = parse_bc_csv(csv_path)
    print(f'  {len(products)} total products')
    ar_count = sum(1 for p in products.values() if p.is_ar)
    print(f'  {ar_count} AR-tagged products')

    print('\nGrouping products by Sneak Peek subcategory...')
    sections = group_products_by_section(products)
    for name, prods in sorted(sections.items()):
        print(f'  {name}: {len(prods)} products')

    work_dir = tempfile.mkdtemp(prefix='idml_v2_')
    output_dir = os.path.dirname(os.path.abspath(output_path))
    links_dir = os.path.join(output_dir, 'Links')

    try:
        print(f'\nExtracting IDML: {idml_path}')
        with zipfile.ZipFile(idml_path, 'r') as zf:
            zf.extractall(work_dir)

        print('Scanning IDML template...')
        slots = scan_idml_slots(work_dir)
        print(f'  {len(slots)} slots found')

        # Match slots to products by section name
        slot_products = {}  # (cat_num, book_num) -> ProductInfo
        warnings = []

        # Group slots by section
        section_slots = {}
        for slot in slots:
            # Strip "(shared)" suffix for matching
            section_key = slot.section.replace(' (shared)', '')
            section_slots.setdefault(section_key, []).append(slot)

        # Sort each section's slots by book_num
        for section, slot_list in section_slots.items():
            slot_list.sort(key=lambda s: s.book_num)

        for section_name, section_prods in sections.items():
            # If BC name differs from IDML group label, translate before lookup
            idml_label = SECTION_NAME_TO_IDML_GROUP.get(section_name, section_name)
            slot_list = section_slots.get(idml_label, [])
            if not slot_list:
                warnings.append(f'Section "{section_name}" has products but no IDML slots')
                continue

            # Combined-text slots receive products via combined_book_nums,
            # not direct product assignment. Skip them in the index loop.
            product_slots = [s for s in slot_list if not s.combined_book_nums]

            if len(section_prods) > len(product_slots):
                warnings.append(
                    f'Section "{section_name}": {len(section_prods)} products '
                    f'but only {len(product_slots)} slots (extras dropped)')
            elif len(section_prods) < len(product_slots):
                warnings.append(
                    f'Section "{section_name}": {len(section_prods)} products '
                    f'but {len(product_slots)} slots ({len(product_slots) - len(section_prods)} unfilled)')

            for i, slot in enumerate(product_slots):
                if i < len(section_prods):
                    slot_products[(slot.cat_num, slot.book_num)] = section_prods[i]

        if warnings:
            print('\nWarnings:')
            for w in warnings:
                print(f'  {w}')

        # Update stories
        print(f'\nUpdating {len(slot_products)} slots...')
        for slot in slots:
            # Combined-story slot (Fairytales shared text): build from multiple products
            if slot.combined_book_nums and slot.story_id:
                combined_products = []
                for bn in slot.combined_book_nums:
                    p = slot_products.get((slot.cat_num, bn))
                    if p:
                        combined_products.append(p)
                if combined_products:
                    build_combined_story_xml(work_dir, slot.story_id,
                                             combined_products, slot.needs_white)
                    print(f'  Cat{slot.cat_num} shared text  {slot.section:35s} -> '
                          f'{len(combined_products)} combined books')
                continue

            product = slot_products.get((slot.cat_num, slot.book_num))
            if not product:
                continue
            if slot.story_id:
                build_story_xml(work_dir, slot.story_id,
                                product.name, product.price, slot.needs_white)
            ar_str = ' [AR]' if product.is_ar else ''
            print(f'  Cat{slot.cat_num} B{slot.book_num:<2} {slot.section:35s} -> '
                  f'{product.name[:35]:35s} {product.sku:12s} {product.price}{ar_str}')

        # Apply image swaps and AR removal
        print('\nApplying spread changes...')
        apply_spread_changes(work_dir, slots, slot_products, links_dir)

        # Update hyperlinks
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
        print(f'Images: {links_dir}')

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description='Generate InDesign catalog from BC data (V2)')
    parser.add_argument('--idml', required=True, help='IDML template file')
    parser.add_argument('--csv', required=True, help='BigCommerce product CSV')
    parser.add_argument('--output', required=True, help='Output IDML path')
    parser.add_argument('--mode', choices=['catholic', 'public', 'fall2026'], default='catholic',
                        help='Which category set to use (default: catholic)')
    args = parser.parse_args()

    global SNEAK_PEEK_CATEGORY_MAP, SECTION_NAME_TO_IDML_GROUP
    if args.mode == 'public':
        SNEAK_PEEK_CATEGORY_MAP = PUBLIC_CATEGORY_MAP
        SECTION_NAME_TO_IDML_GROUP = PUBLIC_SECTION_TO_IDML_GROUP
    elif args.mode == 'fall2026':
        SNEAK_PEEK_CATEGORY_MAP = FALL_2026_CATEGORY_MAP
        SECTION_NAME_TO_IDML_GROUP = FALL_2026_SECTION_TO_IDML_GROUP
    else:
        SNEAK_PEEK_CATEGORY_MAP = CATHOLIC_CATEGORY_MAP
        SECTION_NAME_TO_IDML_GROUP = CATHOLIC_SECTION_TO_IDML_GROUP

    print(f'Mode: {args.mode}')
    generate_catalog(args.idml, args.csv, args.output)


if __name__ == '__main__':
    main()
