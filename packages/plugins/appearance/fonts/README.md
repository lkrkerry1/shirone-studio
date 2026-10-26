# Fonts

These are the fonts the Shirone blog uses, copied so the studio renders text with
the same faces.

| file | family | role in the blog | source |
| --- | --- | --- | --- |
| `outfit-latin-400/500/700-normal.woff2` | Outfit | `body` (latin) | [`@fontsource/outfit`](https://fontsource.org/fonts/outfit) 5.3.0, OFL — see `LICENSE-Outfit.txt` |
| `Yozai-Medium.subset.woff2` | Yozai | `cjk` | subset of the full Yozai Medium (OFL) — see `LICENSE-Yozai.txt` |
| `jetbrains-mono-latin-wght-normal.woff2` | JetBrains Mono (variable) | `mono` (code) | [`@fontsource-variable/jetbrains-mono`](https://fontsource.org/fonts/jetbrains-mono) 5.3.0, OFL — see `LICENSE-JetBrainsMono.txt` |

The studio's `--font-ui` is `'Outfit', 'Yozai', <system stack>`, mirroring the
blog's `--m3e-font-sans` order, and `--editor-font` starts with JetBrains Mono.

## Regenerating the Yozai subset

The blog's prebuilt subset only carried the glyphs its content used, which is how
a common character (白) fell back to the system font in the middle of a label.
The studio's subset is rebuilt from the full font to cover GB2312 plus
punctuation, arrows and fullwidth forms:

```bash
python packages/plugins/appearance/fonts/generate-subset.py \
  path/to/Yozai-Medium.ttf
```

The full font ships with the blog checkout at
`.astro/fonts/font-cjk-500-normal-*.ttf`; `fonttools` and `brotli` are required.
The script keeps every glyph the previous subset had, so nothing regresses.

