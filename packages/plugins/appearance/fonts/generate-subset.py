"""Regenerate ``Yozai-Medium.subset.woff2`` from the full Yozai Medium font.

The bundled subset started as the glyphs used by the blog, which is how a common
character like 白 ended up missing and fell back to the system font mid-sentence.
This script rebuilds the subset from the GB2312 repertoire plus punctuation,
arrows and fullwidth forms, and keeps every glyph the previous subset had.

Yozai is licensed under the SIL Open Font License 1.1 (see LICENSE-Yozai.txt).

Usage (from the repository root):

    python packages/plugins/appearance/fonts/generate-subset.py path/to/Yozai-Medium.ttf

The full font ships with the blog checkout at
``.astro/fonts/font-cjk-500-normal-*.ttf``.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

# Latin, Latin-1 supplement, general punctuation, arrows/math, CJK punctuation,
# fullwidth forms. CJK ideographs come from GB2312 below.
RANGES = [
    (0x0020, 0x007E),
    (0x00A0, 0x00FF),
    (0x2000, 0x206F),
    (0x2190, 0x22FF),
    (0x3000, 0x303F),
    (0xFF00, 0xFFEF),
]

OUTPUT = Path(__file__).with_name("Yozai-Medium.subset.woff2")


def gb2312_chars() -> set[str]:
    chars: set[str] = set()
    for high in range(0xA1, 0xF8):
        for low in range(0xA1, 0xFF):
            try:
                chars.add(bytes((high, low)).decode("gb2312"))
            except UnicodeDecodeError:
                continue
    return chars


def codepoints(font_path: Path, keep: Path | None) -> set[int]:
    points = {code for start, end in RANGES for code in range(start, end + 1)}
    points.update(ord(char) for char in gb2312_chars())
    if keep and keep.exists():
        previous = TTFont(keep, lazy=True)
        for table in previous["cmap"].tables:
            points.update(table.cmap.keys())
    available = TTFont(font_path, lazy=True)
    covered = set()
    for table in available["cmap"].tables:
        covered.update(table.cmap.keys())
    return points & covered


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    source = Path(sys.argv[1])
    if not source.exists():
        print(f"source font not found: {source}")
        return 2

    keep = OUTPUT if OUTPUT.exists() else None
    points = codepoints(source, keep)
    print(f"{len(points)} codepoints selected (union of GB2312, ranges and the old subset)")

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.recalc_timestamp = False

    font = TTFont(source)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(OUTPUT)

    size = OUTPUT.stat().st_size
    print(f"wrote {OUTPUT} ({size / 1024:.0f} KB, {len(font.getGlyphOrder())} glyphs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
