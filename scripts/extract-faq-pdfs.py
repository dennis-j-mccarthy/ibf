#!/usr/bin/env python3
"""
Extract Q&A from the coordinator FAQ PDFs into prisma/bot-knowledge.pdf-faqs.json.

These PDFs are already in Q&A form: questions are lines starting with "Q " and
ending in "?"; the answer is the text until the next question; ALL-CAPS lines are
section headers used as the category.

Parish FAQ is skipped here: faq-in-person-parish.pdf is image-only (no extractable
text) and needs OCR.

Usage: python3 scripts/extract-faq-pdfs.py
"""
import json
import re
import pypdf

SOURCES = {
    "Catholic School": "public/documents/faqs-in-person-catholic-3-12.pdf",
    "Public": "public/documents/faq-in-person-public-4-17.pdf",
    "Virtual": "public/documents/faqs-virtual-3-12.pdf",
}

# Standalone ALL-CAPS lines = section headers -> category
HEADER_RE = re.compile(r"^[A-Z][A-Z &/]{2,40}$")
INTRO_RE = re.compile(r"FAQs for|Quick answers|Coordinators", re.I)


def is_letterspaced(line):
    """True for PDF artifact lines rendered with per-character spacing
    (e.g. 'u i c k a n s w e r s t o t h e')."""
    toks = line.split()
    if len(toks) < 8:
        return False
    singles = sum(1 for t in toks if len(t) == 1)
    return singles / len(toks) > 0.6


def parse(text):
    # Drop the title/intro fragments and letter-spaced artifact lines.
    raw_lines = [l.rstrip() for l in text.split("\n")]
    lines = [
        l for l in raw_lines
        if l.strip() and not INTRO_RE.search(l) and not is_letterspaced(l)
    ]

    entries = []
    category = "General"
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i].strip()
        if HEADER_RE.match(line) and not line.startswith("Q "):
            category = line.title()
            i += 1
            continue
        if line.startswith("Q ") or line == "Q":
            # Assemble the question (may wrap across lines until a "?").
            q = line[2:].strip() if line.startswith("Q ") else ""
            i += 1
            while i < n and not q.endswith("?"):
                nxt = lines[i].strip()
                if HEADER_RE.match(nxt):  # header interrupts; skip it
                    i += 1
                    continue
                q = (q + " " + nxt).strip()
                i += 1
            # Assemble the answer until the next "Q ..." line.
            ans = []
            while i < n:
                nxt = lines[i].strip()
                if nxt.startswith("Q ") or nxt == "Q":
                    break
                if HEADER_RE.match(nxt):
                    category_pending = nxt.title()  # header belongs to NEXT q
                    i += 1
                    ans.append(("__HDR__", category_pending))
                    continue
                ans.append(("txt", nxt))
                i += 1
            # Trailing headers in the answer actually introduce the next category.
            next_cat = None
            while ans and ans[-1][0] == "__HDR__":
                next_cat = ans.pop()[1]
            answer = " ".join(t for k, t in ans if k == "txt")
            answer = re.sub(r"(\w)-\s+(\w)", r"\1-\2", answer)  # rejoin hyphenated line breaks
            answer = re.sub(r"\s+", " ", answer).strip()
            q = re.sub(r"\s+", " ", q).strip()
            if q and answer:
                entries.append({"question": q, "answer": answer, "category": category})
            if next_cat:
                category = next_cat
        else:
            i += 1
    return entries


def main():
    out = []
    for audience, path in SOURCES.items():
        reader = pypdf.PdfReader(path)
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
        entries = parse(text)
        for e in entries:
            e["audience"] = audience
            e["source"] = path.split("/")[-1]
        print(f"{audience:16} {len(entries)} Q&A  <- {path.split('/')[-1]}")
        out.extend(entries)
    with open("prisma/bot-knowledge.pdf-faqs.json", "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nWrote {len(out)} Q&A to prisma/bot-knowledge.pdf-faqs.json")


if __name__ == "__main__":
    main()
