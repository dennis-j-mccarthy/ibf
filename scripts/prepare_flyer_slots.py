"""Give the fall flyer the slot hierarchy generate_catalog_v2.py needs.

The flyer was laid out as loose frames: every book is an unrelated Rectangle
(cover) and TextFrame (title/SKU/price) sitting directly on the spread. The
generator instead expects, per the sneak-peek convention:

    <Group Name="<Section> Group">        one per flyer section
        <Group>                           one per book slot
            <Rectangle>  cover
            <TextFrame>  title / sku / price
            <Group Name="ar">  AR badge, deleted when the product is not AR
        </Group>
    </Group>

Groups are created with an identity ItemTransform and the original elements are
moved in verbatim, so every coordinate is preserved exactly -- nothing shifts on
the page. Spread XML is edited as text (never re-serialised) because element
order is z-order and ElementTree would reorder attributes.
"""
import os, re, shutil, html, glob
from xml.etree import ElementTree as ET

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'idml')
WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'idml_build')

# Section membership, read off the printed flyer. Ground truth -- deliberately
# NOT re-derived from geometry, which is what produced the earlier bad counts.
SECTIONS = [
    ('It feels like Fall!',                  ['IBC.1229','IBC.V0338','IBC.1373','IBC.0404','IBC.1394','IBC.1396']),
    ('Chapter Books',                        ['IBC.V0377','IBC.1172','IBC.1314']),
    ('Thankful & Grateful',                  ['IBC.V0000','IBC.1190','IBC.1406']),
    ('Picture Books To Inspire Little Ones', ['IBC.1148','IBC.6MH','IBC.6LFFH','IBC.6CHGH','IBC.1326']),
    ('Saint Story Chapter Books',            ['IBC.STMKP','IP.OLCFP','IP.STAPBP','IP.SHTCP','IP.SACCP','IP.STRP']),
    ('Saintly Reads',                        ['IBC.1009','IBC.1058','IBC.1139','IBC.1464','IBC.1146','IBC.6YSH']),
    ('Plushies!',                            ['IP.CAYCP','IP.6TYTDH']),
]

# The flyer ships three hand-placed AR badges: two small (13.9pt) and one large
# (31.7pt) in the collage. Clone the small one into every slot and drop all three
# originals, so badge placement is uniform and the generator can delete the ones
# whose product is not AR.
AR_TEMPLATE_SELF = 'u720b'
AR_ORIGINALS = ['u720b', 'u74db', 'u5012']
# Placement is measured off the two small originals and is relative to the price
# TEXT frame, not the cover: in the Saintly Reads collage the text sits beside its
# cover rather than under it, and a cover-relative badge would strand in space.
# The badge rides just right of centre on the frame's last line -- the price.
AR_DX, AR_DY = 16.75, -15.75  # from text centre-x, and up from the text frame's bottom

GROUP_ATTRS = ('OverriddenPageItemProps="" FlexItemWidthMode="FlexFixed" FlexItemHeightMode="FlexFixed" '
               'Visible="true" HorizontalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" '
               'VerticalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" '
               'GradientFillStart="0 0" GradientFillLength="0" GradientFillAngle="0" GradientStrokeStart="0 0" '
               'GradientStrokeLength="0" GradientStrokeAngle="0" ItemLayer="{layer}" Locked="false" '
               'LocalDisplaySetting="Default" GradientFillHiliteLength="0" GradientFillHiliteAngle="0" '
               'GradientStrokeHiliteLength="0" GradientStrokeHiliteAngle="0" '
               'AppliedObjectStyle="ObjectStyle/$ID/[None]" ItemTransform="1 0 0 1 0 0"')


def block_of(xml, self_id):
    """Return (start, end) of the top-level element whose Self== self_id."""
    m = re.search(r'<([A-Za-z]+)\b[^>]*\bSelf="%s"' % re.escape(self_id), xml)
    if not m:
        return None
    tag, start = m.group(1), m.start()
    # self-closing?
    close = xml.index('>', m.end() - 1)
    if xml[close - 1] == '/':
        return (start, close + 1)
    depth, pos = 0, start
    pat = re.compile(r'<(/?)%s\b' % tag)
    while True:
        mm = pat.search(xml, pos)
        if not mm:
            return None
        if mm.group(1):
            depth -= 1
        else:
            # ignore self-closing occurrences
            gt = xml.index('>', mm.end())
            if xml[gt - 1] != '/':
                depth += 1
        pos = xml.index('>', mm.end()) + 1
        if depth == 0:
            return (start, pos)


def transform_of(el):
    return tuple(float(v) for v in (el.get('ItemTransform') or '1 0 0 1 0 0').split())


def mul(m1, m2):
    a1,b1,c1,d1,e1,f1 = m1; a2,b2,c2,d2,e2,f2 = m2
    return (a1*a2+c1*b2, b1*a2+d1*b2, a1*c2+c1*d2, b1*c2+d1*d2, a1*e2+c1*f2+e1, b1*e2+d1*f2+f1)


def bbox(el, parents):
    chain, cur = [], el
    while cur is not None:
        chain.append(transform_of(cur)); cur = parents.get(id(cur))
    M = (1,0,0,1,0,0)
    for t in reversed(chain):
        M = mul(M, t)
    a,b,c,d,tx,ty = M; pts = []
    for pp in el.iter('PathPointType'):
        an = pp.get('Anchor')
        if an:
            x,y = [float(v) for v in an.split()]
            pts.append((a*x+c*y+tx, b*x+d*y+ty))
    if not pts:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def main():
    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    shutil.copytree(SRC, WORK)

    # story id -> plain text, to find each book's SKU and the section headers
    story = {}
    for f in glob.glob(os.path.join(WORK, 'Stories', '*.xml')):
        s = open(f, encoding='utf-8').read()
        m = re.search(r'<Story Self="([^"]+)"', s)
        if m:
            c = html.unescape(' '.join(re.findall(r'<Content>(.*?)</Content>', s, re.S)))
            story[m.group(1)] = re.sub(r'\s+', ' ', c).strip()

    # Grab an AR badge to clone, and work out where its oval actually sits
    # relative to the group's own translate -- the group transform is not the
    # oval's position, so clones have to be moved by delta, not set absolutely.
    ar_src = None
    for fn in sorted(os.listdir(os.path.join(WORK, 'Spreads'))):
        xml = open(os.path.join(WORK, 'Spreads', fn), encoding='utf-8').read()
        span = block_of(xml, AR_TEMPLATE_SELF)
        if span:
            ar_src = xml[span[0]:span[1]]
            break
    assert ar_src, 'AR badge template not found'

    _g = ET.fromstring(ar_src)
    _gt = transform_of(_g)
    _oval = _g.find('.//Oval')
    _ot = transform_of(_oval)
    _pts = [[float(v) for v in pp.get('Anchor').split()] for pp in _oval.iter('PathPointType')]
    # oval's top-left expressed as a delta from the group's translate
    AR_OFF_X = _ot[4] + min(p[0] for p in _pts)
    AR_OFF_Y = _ot[5] + min(p[1] for p in _pts)
    print(f'AR badge {AR_TEMPLATE_SELF}: oval offset from group origin = '
          f'({AR_OFF_X:.1f}, {AR_OFF_Y:.1f}), size '
          f'{max(p[0] for p in _pts) - min(p[0] for p in _pts):.1f}')

    uid = [0]
    def new_id(prefix='z'):
        uid[0] += 1
        return f'{prefix}{uid[0]:04d}'

    def clone_ar(oval_x, oval_y):
        """Clone the AR badge with fresh ids, oval's top-left landing on oval_x/y."""
        blk = ar_src
        for sid in sorted(set(re.findall(r'Self="([^"]+)"', blk)), key=len, reverse=True):
            blk = blk.replace(f'"{sid}"', f'"AR{new_id()}"')
        tx, ty = oval_x - AR_OFF_X, oval_y - AR_OFF_Y
        blk = re.sub(r'ItemTransform="[^"]*"', f'ItemTransform="1 0 0 1 {tx:.6f} {ty:.6f}"', blk, count=1)
        blk = re.sub(r'(<Group [^>]*?)Name="[^"]*"', r'\1Name="ar"', blk, count=1)
        return blk

    total_slots = 0
    for fn in sorted(os.listdir(os.path.join(WORK, 'Spreads'))):
        path = os.path.join(WORK, 'Spreads', fn)
        xml = open(path, encoding='utf-8').read()
        root = ET.parse(path).getroot()
        sp = [e for e in root.iter('Spread')][0]
        parents = {}
        def walk(n):
            for ch in n:
                parents[id(ch)] = n if n.tag != 'Spread' else None
                walk(ch)
        walk(sp)
        layer = (sp.find('.//Rectangle').get('ItemLayer') if sp.find('.//Rectangle') is not None else 'u20a')

        def sku_of(el):
            t = story.get(el.get('ParentStory'), '')
            if not re.search(r'\$\d', t):
                return None
            m = re.search(r'((?:IBC|IP)\.[A-Za-z0-9]+)', t)
            return m.group(1) if m else None

        def top_ancestor(el):
            """The spread-level element that owns el -- the thing we can move."""
            cur = el
            while parents.get(id(cur)) is not None:
                cur = parents[id(cur)]
            return cur

        # Covers are image-bearing rectangles, minus the full-page background
        # plates. One cover ships wrapped in a group with a "NEW BOOK" sticker,
        # so move the spread-level ancestor and the sticker travels with it.
        covers, texts, seen = [], [], set()
        for el in sp.iter():
            if el.tag == 'Rectangle' and any(e.tag == 'Image' for e in el):
                link = el.find('.//Link')
                uri = (link.get('LinkResourceURI') or '') if link is not None else ''
                if 'Background-' in uri:
                    continue
                anc = top_ancestor(el)
                if id(anc) in seen:
                    continue
                seen.add(id(anc))
                bb = bbox(el, parents)   # badge is placed off the cover, not the sticker
                if bb:
                    covers.append((anc.get('Self'), bb))
            elif el.tag == 'TextFrame':
                sku = sku_of(el)
                bb = bbox(el, parents) if sku else None
                if bb:
                    texts.append((el.get('Self'), bb, sku))
        premade = {}

        # pair cover <-> text by centroid proximity (handles grid and collage)
        import numpy as np
        from scipy.optimize import linear_sum_assignment
        C = np.zeros((len(texts), len(covers)))
        for i, (_, tb, _) in enumerate(texts):
            tcx, tcy = (tb[0]+tb[2])/2, (tb[1]+tb[3])/2
            for j, (_, cb) in enumerate(covers):
                ccx, ccy = (cb[0]+cb[2])/2, (cb[1]+cb[3])/2
                C[i, j] = ((ccx-tcx)**2*2.5 + (ccy-tcy)**2) ** 0.5
        ri, ci = linear_sum_assignment(C)
        pair = {texts[i][2]: (covers[j][0], texts[i][0], texts[i][1]) for i, j in zip(ri, ci)}

        sec_xml, to_remove = [], []
        for section, skus in SECTIONS:
            mine = [s for s in skus if s in pair or s in premade]
            if not mine:
                continue
            slots = []
            for sku in mine:
                if sku in premade:
                    grp_self, tbb = premade[sku]
                    spans = [block_of(xml, grp_self)]
                else:
                    cov_self, txt_self, tbb = pair[sku]
                    spans = [block_of(xml, cov_self), block_of(xml, txt_self)]
                if not all(spans):
                    print(f'  !! {sku}: could not locate source XML')
                    continue
                to_remove += spans
                ar = clone_ar((tbb[0] + tbb[2]) / 2 + AR_DX, tbb[3] + AR_DY)
                if sku in premade:
                    # already a well-formed slot group -- just drop the badge in
                    blk = xml[spans[0][0]:spans[0][1]]
                    slots.append(blk[:blk.rindex('</Group>')] + ar + '</Group>')
                else:
                    slots.append(
                        f'<Group Self="{new_id("SLOT")}" Name="$ID/" ' + GROUP_ATTRS.format(layer=layer) + '>'
                        + ''.join(xml[a:b] for a, b in spans) + ar + '</Group>')
            if slots:
                total_slots += len(slots)
                sec_xml.append(
                    f'<Group Self="{new_id("SEC")}" Name="{html.escape(section)} Group" '
                    + GROUP_ATTRS.format(layer=layer) + '>' + ''.join(slots) + '</Group>')
                print(f'  {fn}: {section} -> {len(slots)} slots')

        # drop the hand-placed originals; every slot now carries its own clone
        for orig in AR_ORIGINALS:
            span = block_of(xml, orig)
            if span:
                to_remove.append(span)

        for a, b in sorted(to_remove, reverse=True):
            xml = xml[:a] + xml[b:]
        xml = xml.replace('</Spread>', ''.join(sec_xml) + '</Spread>')
        open(path, 'w', encoding='utf-8').write(xml)

    print(f'\nTOTAL SLOTS BUILT: {total_slots}')

    # Headline/section copy changes. Stories are edited with ElementTree per the
    # repo's rule -- only spread XML is position-sensitive. InDesign splits a run
    # across several <Content> nodes, so match on the concatenation, then write the
    # replacement into the first node and blank the rest.
    renames = [
        ('GREAT FOR THE WHOLE FAMILY !', 'Plushies!'),
        ('FALL IN LOVE WITH READING & THE SAINTS', 'Fall in Love with Reading'),
    ]
    def norm(s):
        return re.sub(r'[^A-Z0-9]', '', s.upper())

    for f in glob.glob(os.path.join(WORK, 'Stories', '*.xml')):
        tree = ET.parse(f)
        nodes = [c for c in tree.getroot().iter('Content')]
        if not nodes:
            continue
        joined = ''.join(n.text or '' for n in nodes)
        for old, new in renames:
            if norm(old) != norm(joined):
                continue
            nodes[0].text = new
            for n in nodes[1:]:
                n.text = ''
            # the original headline wrapped over two lines; without this the
            # replacement would sit below a now-empty first line
            for parent in tree.getroot().iter():
                for br in [c for c in parent if c.tag == 'Br']:
                    parent.remove(br)
            tree.write(f, encoding='UTF-8', xml_declaration=True)
            print(f'renamed: {old!r} -> {new!r}  ({os.path.basename(f)})')
            break


if __name__ == '__main__':
    main()
