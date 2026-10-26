import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { AppearanceContribution } from '@shirone-studio/contracts'
import { mergeAppearance } from '@shirone-studio/runtime'

import outfit400 from '../fonts/outfit-latin-400-normal.woff2?url'
import outfit500 from '../fonts/outfit-latin-500-normal.woff2?url'
import outfit700 from '../fonts/outfit-latin-700-normal.woff2?url'
import jetbrainsMono from '../fonts/jetbrains-mono-latin-wght-normal.woff2?url'
import yozai from '../fonts/Yozai-Medium.subset.woff2?url'

/**
 * Studio appearance, matching the Shirone blog theme.
 *
 * Colours come from the same Material 3 pipeline the blog runs: seed hue 245,
 * "vibrant" style, 2025 spec (`shirones/src/utils/mc-utils.ts`), and the editor
 * syntax palette mirrors the blog's code theme (`github-light` / `github-dark`).
 * Fonts are the blog's own: Outfit (latin body), Yozai Medium (CJK), JetBrains
 * Mono (code).
 *
 * Regenerate the colour roles after changing the blog theme:
 *
 *   resolveScheme(245, isDark, 'vibrant', '2025')
 *
 * Map of studio token -> Shirone M3 role:
 *   --surface    <- page-bg   (surfaceContainerLow / surface)
 *   --surface-2  <- card-bg   (surfaceContainerLowest / surfaceContainerHigh)
 *   --border     <- outlineVariant
 *   --text       <- onSurface
 *   --muted      <- onSurfaceVariant
 *   --accent     <- primary
 */

/** Blog fonts. Files live in `fonts/` with their upstream licences. */
export const studioFontFaces = `
@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${outfit400}') format('woff2');
}
@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${outfit500}') format('woff2');
}
@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${outfit700}') format('woff2');
}
@font-face {
  font-family: 'Yozai';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${yozai}') format('woff2');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 100 800;
  font-display: swap;
  src: url('${jetbrainsMono}') format('woff2');
}`

export const studioTokens: Record<string, string> = {
  // Light: page-bg / card-bg, outlineVariant, onSurface(-Variant), primary.
  '--surface': '#eaf1ff',
  '--surface-2': '#ffffff',
  '--border': '#94afd4',
  '--text': '#11304f',
  '--muted': '#425d7e',
  '--accent': '#006192',
  '--danger': '#b42318',
  '--danger-bg': '#fef3f2',
  '--overlay': 'rgb(15 23 42 / 0.35)',

  // Same role order as the blog: body font, CJK font, then system fallback.
  '--font-ui': "'Outfit', 'Yozai', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--editor-font':
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",

  // github-light, the blog's light code theme.
  '--syntax-keyword': '#d73a49',
  '--syntax-function': '#6f42c1',
  '--syntax-string': '#032f62',
  '--syntax-number': '#005cc5',
  '--syntax-comment': '#6a737d',
  '--syntax-variable': '#e36209',
  '--syntax-tag': '#22863a',
  '--syntax-punctuation': '#24292e',
  '--syntax-heading': '#005cc5',
  '--syntax-link': '#032f62',
  '--syntax-inline-bg': 'rgba(27, 31, 35, 0.06)',

  // The editor writes on the card surface, so the gutter shares that colour.
  '--editor-bg': 'var(--surface-2)',
  '--editor-text': 'var(--text)',
  '--editor-font-size': '15px',
  '--editor-line-height': '1.65',
  '--editor-gutter-bg': 'var(--editor-bg)',
  '--editor-gutter-text': 'var(--muted)',
  '--editor-gutter-active': 'var(--accent)',
  '--editor-active-line': 'color-mix(in oklab, var(--accent) 7%, transparent)',
  // The theme selects with primaryContainer; a translucent primary keeps the
  // text readable on both surfaces.
  '--editor-selection': 'color-mix(in oklab, var(--accent) 30%, transparent)',
  '--editor-cursor': 'var(--accent)',
}

export const studioDarkOverrides = `@media (prefers-color-scheme: dark) {
  :root {
    /* surface / surfaceContainerHigh, outlineVariant, onSurface(-Variant), primary */
    --surface: #000f21;
    --surface-2: #00213d;
    --border: #2e4a6a;
    --text: #d7e7ff;
    --muted: #91add2;
    --accent: #55b9ff;
    --danger: #ff8b84;
    --danger-bg: color-mix(in oklab, #ff7b72 14%, var(--surface-2));
    --overlay: rgb(2 6 23 / 0.55);

    /* github-dark, the blog's dark code theme */
    --syntax-keyword: #ff7b72;
    --syntax-function: #d2a8ff;
    --syntax-string: #a5d6ff;
    --syntax-number: #79c0ff;
    --syntax-comment: #8b949e;
    --syntax-variable: #ffa657;
    --syntax-tag: #7ee787;
    --syntax-punctuation: #c9d1d9;
    --syntax-heading: #79c0ff;
    --syntax-link: #58a6ff;
    --syntax-inline-bg: rgba(110, 118, 129, 0.4);
  }
}`

/** CodeMirror chrome: background, gutters, selection, cursor, active line. */
export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--editor-font)',
    fontSize: 'var(--editor-font-size)',
    lineHeight: 'var(--editor-line-height)',
  },
  '.cm-content': {
    padding: '24px 32px 80px',
    maxWidth: '900px',
    margin: '0 auto',
    caretColor: 'var(--editor-cursor)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-gutter-bg)',
    color: 'var(--editor-gutter-text)',
    borderRight: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 12px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--editor-gutter-active)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--editor-active-line)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--editor-selection)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--editor-cursor)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
})

/**
 * Markdown + code highlighting, using the blog's github-light/dark palette.
 *
 * The colours are CSS variables, so the same style follows the light and dark
 * token sets above.
 */
export const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, color: 'var(--syntax-heading)', fontWeight: '700' },
  { tag: t.heading2, color: 'var(--syntax-heading)', fontWeight: '700' },
  { tag: t.heading3, color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: [t.heading4, t.heading5, t.heading6], color: 'var(--syntax-heading)', fontWeight: '600' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--syntax-link)' },
  { tag: t.monospace, color: 'var(--syntax-string)', backgroundColor: 'var(--syntax-inline-bg)' },
  { tag: t.quote, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [t.list, t.contentSeparator], color: 'var(--syntax-keyword)' },

  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.moduleKeyword], color: 'var(--syntax-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--syntax-string)' },
  { tag: [t.number, t.bool, t.null, t.atom, t.constant(t.name)], color: 'var(--syntax-number)' },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: 'var(--syntax-comment)',
    fontStyle: 'italic',
  },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syntax-function)' },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: 'var(--syntax-variable)' },
  { tag: [t.tagName], color: 'var(--syntax-tag)' },
  { tag: [t.attributeName, t.propertyName], color: 'var(--syntax-variable)' },
  { tag: [t.operator, t.punctuation, t.bracket, t.separator], color: 'var(--syntax-punctuation)' },
  { tag: [t.meta, t.processingInstruction, t.labelName], color: 'var(--syntax-comment)' },
])

/** Rich-text editing (apps/desktop/src/live-preview.ts) renders Markdown inline. */
export const studioLivePreviewCss = `
.cm-editor .cm-line.lp-h1 { font-size: 1.7em; font-weight: 700; line-height: 1.35; }
.cm-editor .cm-line.lp-h2 { font-size: 1.45em; font-weight: 700; line-height: 1.4; }
.cm-editor .cm-line.lp-h3 { font-size: 1.25em; font-weight: 600; }
.cm-editor .cm-line.lp-h4 { font-size: 1.12em; font-weight: 600; }
.cm-editor .cm-line.lp-h5 { font-weight: 600; }
.cm-editor .cm-line.lp-h6 { font-weight: 600; color: var(--muted); }
.cm-editor .lp-strong { font-weight: 700; }
.cm-editor .lp-em { font-style: italic; }
.cm-editor .lp-strike { text-decoration: line-through; }
.cm-editor .lp-code {
  font-family: var(--editor-font);
  background: var(--syntax-inline-bg);
  border-radius: 4px;
}
.cm-editor .lp-link {
  color: var(--syntax-link);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.cm-editor .cm-line.lp-quote {
  border-left: 3px solid var(--border);
  padding-left: 12px;
  color: var(--muted);
}
.cm-editor .lp-image img {
  max-width: 100%;
  max-height: 420px;
  border-radius: 8px;
  vertical-align: bottom;
}
.cm-editor .lp-math { padding: 0 2px; }
.cm-editor .lp-table {
  display: block;
  width: 100%;
  padding: 2px 0;
  overflow-x: auto;
  /* The editor line keeps whitespace: newlines inside the rendered HTML would
     otherwise turn into blank lines above the table. */
  white-space: normal;
}
.cm-editor .lp-table pre { white-space: pre-wrap; }
.cm-editor .lp-table table {
  border-collapse: collapse;
  margin: 4px 0;
}
.cm-editor .lp-table th,
.cm-editor .lp-table td {
  border: 1px solid var(--border);
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}
.cm-editor .lp-table th {
  background: var(--surface-2);
  font-weight: 600;
}
.cm-editor .lp-table p { margin: 0; }
.cm-editor .lp-math-block {
  display: block;
  padding: 6px 0;
  text-align: center;
  overflow-x: auto;
}
.cm-editor .lp-hr {
  display: inline-block;
  width: 100%;
  border-top: 1px solid var(--border);
  vertical-align: middle;
}`

/* CodeMirror overlays (lint tooltip, search panel, autocomplete) default to a
   light theme; these rules make them follow the studio palette. */
export const studioEditorChromeCss = `
.cm-editor .cm-tooltip,
.cm-editor .cm-tooltip.cm-tooltip-lint,
.cm-editor .cm-tooltip.cm-tooltip-autocomplete {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.35);
  overflow: hidden;
}
.cm-editor .cm-tooltip .cm-diagnostic {
  padding: 6px 10px;
  color: var(--text);
}
.cm-editor .cm-tooltip .cm-diagnostic + .cm-diagnostic {
  border-top: 1px solid var(--border);
}
.cm-editor .cm-tooltip .cm-diagnosticText {
  color: var(--text);
}
.cm-editor .cm-tooltip .cm-diagnosticAction {
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid color-mix(in oklab, var(--accent) 45%, var(--border));
  border-radius: 6px;
  background: color-mix(in oklab, var(--accent) 16%, transparent);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.cm-editor .cm-tooltip .cm-diagnosticAction:hover {
  background: color-mix(in oklab, var(--accent) 28%, transparent);
}
.cm-editor .cm-tooltip-autocomplete ul li {
  color: var(--text);
  padding: 3px 8px;
}
.cm-editor .cm-tooltip-autocomplete ul li[aria-selected] {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  color: var(--text);
}
.cm-editor .cm-panels {
  background: var(--surface-2);
  color: var(--text);
  border-color: var(--border);
}
.cm-editor .cm-panels-top { border-bottom: 1px solid var(--border); }
.cm-editor .cm-panels-bottom { border-top: 1px solid var(--border); }
.cm-editor .cm-textfield {
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
}
.cm-editor .cm-button {
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.cm-editor .cm-panel.cm-search label { color: var(--text); }
`

export const studioAppearance: AppearanceContribution = {
  id: 'studio-default',
  tokens: studioTokens,
  css: `${studioFontFaces}\n\n${studioLivePreviewCss}\n\n${studioEditorChromeCss}\n\n${studioDarkOverrides}`,
  editorExtensions: [editorTheme, syntaxHighlighting(markdownHighlight)],
}

const STYLE_ATTRIBUTE = 'data-shirone-appearance'

/**
 * Write the merged appearance into the document.
 *
 * Called before mounting (so the first paint is already themed) and again once
 * the plugin context is built, which is what picks up contributions from
 * `compose.yml`.
 */
export function applyAppearance(contributions: readonly AppearanceContribution[]): void {
  if (typeof document === 'undefined') return
  const { cssText } = mergeAppearance(contributions)
  let style = document.querySelector<HTMLStyleElement>(`style[${STYLE_ATTRIBUTE}]`)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute(STYLE_ATTRIBUTE, '')
    document.head.append(style)
  }
  style.textContent = cssText
}

export const name = 'appearance'
export const inject = ['appearance']

export function apply(ctx: Context): void {
  ctx.appearance.register(studioAppearance)
}

export default definePlugin({ name, inject, apply })
