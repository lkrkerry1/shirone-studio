import { describe, expect, it } from 'vitest'
import { findMathSpans } from './rich-markdown'

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
