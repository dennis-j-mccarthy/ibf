#!/usr/bin/env python3
"""
Turn the Catholic fall flyer IDML into the shell for the PUBLIC fall flyer.

The public flyer is built from the Catholic one: same grid, same slot counts
(6/3/3/5/6/6/2), different books and different headings. This script does the
two things the generator cannot -- rewrite the visible section headings, and
drop the stale frame the Catholic template still carries -- so that
generate_catalog_v2.py --mode public-fall2026 can then fill the slots.

Run BEFORE generate_catalog_v2.py:
    python scripts/publicize_fall_flyer.py --idml <catholic.idml> --output <public-shell.idml>

Group NAMES are deliberately left alone. The generator maps public sections
onto the Catholic group names via PUBLIC_FALL_2026_SECTION_TO_IDML_GROUP, so
renaming groups here would break that lookup. Only the human-visible heading
text changes.
"""

import argparse
import html
import os
import re
import shutil
import tempfile
import xml.etree.ElementTree as ET
import zipfile

# Visible heading text: Catholic -> public. Matched on the story's full text so
# a partial word can't be hit by accident.
HEADING_REWRITES = {
    'Thankful & Grateful': 'Cooking',
    'CHAPTER BOOKS': 'CRAFTS',
    'PICTURE BOOKS TO INSPIRE LITTLE ONES': 'PICTURE BOOKS TO READ TOGETHER',
    'Saint Story CHAPTER BOOKS': 'ELEMENTARY',
    'Saintly Reads': 'Middle School',
    'Plushies!': '14+ Fun',
    'FALLING IN LOVE WITH THE SAINTS': 'COZY READS!',
}

# Left as-is on purpose: "Fall in Love with Reading!" and "It Feels Like FALL !"
# are already correct for the public flyer.

# A slot is one book. Two priced frames in one slot means a leftover template
# frame is sitting on top of a real one -- in print, two titles and two prices
# overlap. Detected structurally rather than by SKU: once the generator has run
# over the template, the stale frame holds a real book title and no longer
# carries the SKU that used to identify it.


def story_text(xml: str) -> str:
    # Unescape: headings containing "&" are stored as "&amp;" and would never
    # match a plain-text key otherwise.
    raw = ' '.join(re.findall(r'<Content>(.*?)</Content>', xml, re.S))
    return re.sub(r'\s+', ' ', html.unescape(raw)).strip()


def rewrite_headings(work: str) -> list[tuple[str, str]]:
    """Replace heading Content text in place. Returns (old, new) pairs applied."""
    applied = []
    stories = os.path.join(work, 'Stories')
    for fn in os.listdir(stories):
        path = os.path.join(stories, fn)
        with open(path, encoding='utf-8') as f:
            xml = f.read()
        text = story_text(xml)
        if text not in HEADING_REWRITES:
            continue
        new_text = HEADING_REWRITES[text]
        contents = re.findall(r'<Content>(.*?)</Content>', xml, re.S)
        # Headings can be split across several <Content> runs (styling). Put the
        # whole replacement in the first run and blank the rest, so the styling
        # of the first run carries the new text.
        first = True
        out = []
        idx = 0
        for m in re.finditer(r'(<Content>)(.*?)(</Content>)', xml, re.S):
            out.append(xml[idx:m.start()])
            out.append(m.group(1) + (new_text if first else '') + m.group(3))
            idx = m.end()
            first = False
        out.append(xml[idx:])
        with open(path, 'w', encoding='utf-8') as f:
            f.write(''.join(out))
        applied.append((text, new_text))
        del contents
    return applied


def _stories(work: str) -> dict[str, str]:
    out = {}
    stories = os.path.join(work, 'Stories')
    for fn in os.listdir(stories):
        with open(os.path.join(stories, fn), encoding='utf-8') as f:
            xml = f.read()
        m = re.search(r'<Story Self="([^"]+)"', xml)
        if m:
            out[m.group(1)] = story_text(xml)
    return out


def find_stacked_frames(work: str) -> dict[str, str]:
    """Frame Self -> description, for every extra priced frame in a slot.

    Parsed with ElementTree because finding these needs the group hierarchy;
    the removal below is still string surgery, which is what the spread files
    require.
    """
    story = _stories(work)
    extra = {}
    spreads = os.path.join(work, 'Spreads')
    for fn in sorted(os.listdir(spreads)):
        if not fn.endswith('.xml'):
            continue
        root = ET.parse(os.path.join(spreads, fn)).getroot()
        for group in root.iter('Group'):
            gname = group.get('Name', '')
            if not gname.endswith(' Group'):
                continue
            for slot in group:
                if slot.tag != 'Group' or slot.get('Name') == 'ar':
                    continue
                priced = [
                    tf for tf in slot.iter('TextFrame')
                    if re.search(r'\$\d', story.get(tf.get('ParentStory', ''), ''))
                ]
                # Keep the first, flag the rest.
                for tf in priced[1:]:
                    extra[tf.get('Self')] = (
                        f"{gname.removesuffix(' Group')} / "
                        f"{story.get(tf.get('ParentStory', ''), '')[:44]}"
                    )
    return extra


def remove_frames_by_self(work: str, frame_selfs: dict[str, str]) -> int:
    """Delete TextFrame elements by their Self id, by string surgery.

    ElementTree is deliberately not used on spread XML: the README documents
    that spread files must be edited as strings to keep positions and the
    <?aid?> processing instruction intact.
    """
    removed = 0
    spreads = os.path.join(work, 'Spreads')
    for fn in os.listdir(spreads):
        path = os.path.join(spreads, fn)
        with open(path, encoding='utf-8') as f:
            xml = f.read()
        changed = False
        for sid in frame_selfs:
            while True:
                m = re.search(r'<TextFrame\b[^>]*\bSelf="%s"' % re.escape(sid), xml)
                if not m:
                    break
                start = m.start()
                # self-closing?
                tag_end = xml.index('>', start)
                if xml[tag_end - 1] == '/':
                    end = tag_end + 1
                else:
                    depth = 0
                    i = start
                    end = None
                    while i < len(xml):
                        # The trailing space/'>' matters: "<TextFrame" is also a
                        # prefix of "<TextFramePreference", a child of every
                        # text frame. Counting those inflates depth, it never
                        # returns to zero, and the frame is silently kept.
                        if xml.startswith('<TextFrame ', i) or xml.startswith('<TextFrame>', i):
                            depth += 1
                            i += len('<TextFrame')
                        elif xml.startswith('</TextFrame>', i):
                            depth -= 1
                            if depth == 0:
                                end = i + len('</TextFrame>')
                                break
                            i += len('</TextFrame>')
                        else:
                            i += 1
                    if end is None:
                        raise RuntimeError(f'unbalanced TextFrame for {sid} in {fn}')
                xml = xml[:start] + xml[end:]
                changed = True
                removed += 1
        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(xml)
    return removed


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--idml', required=True, help='Catholic fall flyer IDML')
    ap.add_argument('--output', required=True, help='Public shell IDML to write')
    args = ap.parse_args()

    work = tempfile.mkdtemp(prefix='publicize-')
    try:
        with zipfile.ZipFile(args.idml) as z:
            z.extractall(work)

        stacked = find_stacked_frames(work)
        for sid, desc in stacked.items():
            print(f'  stacked frame {sid}: {desc}')
        n = remove_frames_by_self(work, stacked)
        print(f'  removed {n} stacked frame(s)')

        for old, new in rewrite_headings(work):
            print(f'  heading: {old!r} -> {new!r}')

        # mimetype must be first and stored, per the IDML spec
        if os.path.exists(args.output):
            os.remove(args.output)
        with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED) as z:
            mt = os.path.join(work, 'mimetype')
            if os.path.exists(mt):
                z.write(mt, 'mimetype', compress_type=zipfile.ZIP_STORED)
            for root, _dirs, files in os.walk(work):
                for fn in files:
                    full = os.path.join(root, fn)
                    rel = os.path.relpath(full, work)
                    if rel == 'mimetype':
                        continue
                    z.write(full, rel)
        print(f'  wrote {args.output}')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
