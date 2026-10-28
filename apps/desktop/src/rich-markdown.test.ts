import { describe, expect, it } from 'vitest'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import type { Decoration } from '@codemirror/view'
import { findMathSpans, richMarkdownDecorations } from './rich-markdown'

function widgetCount(set: ReturnType<typeof richMarkdownDecorations>, length: number): number {
  let count = 0
  set.between(0, length, (_from, _to, value: Decoration) => {
    if ((value.spec as { widget?: unknown }).widget) count += 1
  })
  return count
}

const TABLE = '| 项目 | 复杂度 |\n| --- | ---: |\n| 带权并查集 | $O(n)$ |\n'

describe('rich markdown math spans', () => {
  it('finds inline and display math', () => {
    const spans = findMathSpans('中文 $x+1$ 与 $$y^2$$ 结束')
    expect(spans.map((span) => span.latex)).toEqual(['x+1', 'y^2'])
    expect(spans.map((span) => span.display)).toEqual([false, true])
  })

  it('keeps display math across newlines', () => {
    const spans = findMathSpans('$$\n\\sum_{i=1}^n a_i\n$$')
    expect(spans).toHaveLength(1)
    expect(spans[0]?.display).toBe(true)
    expect(spans[0]?.latex).toContain('\\sum')
  })

  it('ignores escaped dollars and empty spans', () => {
    expect(findMathSpans('\\$x$ 不是公式')).toEqual([])
    expect(findMathSpans('$ $ 和 $  $')).toEqual([])
  })

  it('reports offsets that map back to the source', () => {
    const text = '前 $a$ 后'
    const span = findMathSpans(text)[0]!
    expect(text.slice(span.from, span.to)).toBe('$a$')
  })
})

describe('rich markdown horizontal rules', () => {
  const withCursor = (doc: string, cursor: number) =>
    EditorState.create({
      doc,
      selection: EditorSelection.cursor(cursor),
      extensions: [markdown({ base: markdownLanguage })],
    })

  it('keeps the source visible while the cursor is on the rule', () => {
    // `****` is a thematic break, so typing bold markers must not swallow the caret.
    const doc = '****'
    const set = richMarkdownDecorations(withCursor(doc, doc.length))
    expect(widgetCount(set, doc.length)).toBe(0)
  })

  it('renders the rule once the cursor leaves it', () => {
    const doc = 'text\n\n****\n'
    const set = richMarkdownDecorations(withCursor(doc, 0))
    expect(widgetCount(set, doc.length)).toBe(1)
  })
})

describe('rich markdown tables', () => {
  const state = () =>
    EditorState.create({
      doc: TABLE,
      // The cursor reveals the block it is inside, so park it after the table.
      selection: EditorSelection.cursor(TABLE.length),
      extensions: [markdown({ base: markdownLanguage })],
    })

  it('replaces the whole table with one rendered widget', () => {
    const set = richMarkdownDecorations(state(), { renderTable: () => '<table></table>' })
    expect(widgetCount(set, TABLE.length)).toBe(1)
  })

  it('leaves the table alone when no renderer is configured', () => {
    const set = richMarkdownDecorations(state())
    expect(widgetCount(set, TABLE.length)).toBe(0)
  })

  it('shows the source while the selection is inside the table', () => {
    const editorState = EditorState.create({
      doc: TABLE,
      selection: EditorSelection.cursor(3),
      extensions: [markdown({ base: markdownLanguage })],
    })
    const set = richMarkdownDecorations(editorState, { renderTable: () => '<table></table>' })
    expect(widgetCount(set, TABLE.length)).toBe(0)
  })

  it('does not render math inside a table on its own', () => {
    const set = richMarkdownDecorations(state(), { renderTable: () => '<table></table>' })
    // The only widget is the table itself; $O(n)$ belongs to the rendered html.
    expect(widgetCount(set, TABLE.length)).toBe(1)
  })
})
