import { describe, expect, it } from 'vitest'
import { checkBody } from './engine'

describe('lint engine', () => {
  it('reports h1, missing fence language, CJK spacing and punctuation', () => {
    const body = [
      '# 一级标题',
      '',
      '中文English 混排,需要空格。',
      '中文 $x$ 公式。',
      '```',
      'const x = 1',
      '```',
    ].join('\n')
    const ids = checkBody(body).map((item) => item.ruleId)
    expect(ids).toContain('h1-in-body')
    expect(ids).toContain('code-fence-language')
    expect(ids).toContain('cjk-latin-space')
    expect(ids).toContain('ascii-punct-in-cjk')
  })

  it('does not lint inside fenced code or inline code', () => {
    const body = [
      '```cpp',
      '中文English',
      '```',
      '',
      '行内 `中文English` 不检查。',
      '公式 $中文English$ 不检查。',
    ].join('\n')
    const diagnostics = checkBody(body)
    expect(diagnostics.filter((item) => item.ruleId === 'cjk-latin-space')).toEqual([])
  })

  it('flags unclosed directives and missing statement markers', () => {
    const body = ['开场。', '', '## 题目 A', '', '思路。', '', '::: note', '内容'].join('\n')
    const ids = checkBody(body, 'posts', { category: '题解' }).map((item) => item.ruleId)
    expect(ids).toContain('directive-balance')
    expect(ids).toContain('post-statement')
  })

  it('only expects the 题意 opener on solution posts', () => {
    const body = ['开场。', '', '## 题目 A', '', '思路。'].join('\n')
    const notes = checkBody(body, 'posts', { category: '笔记' }).map((item) => item.ruleId)
    expect(notes).not.toContain('post-statement')

    const essays = checkBody(body, 'posts', { category: '随笔' }).map((item) => item.ruleId)
    expect(essays).not.toContain('post-statement')

    const noCategory = checkBody(body).map((item) => item.ruleId)
    expect(noCategory).not.toContain('post-statement')
  })

  it('accepts a blockquote before the first paragraph', () => {
    const body = [
      '> 来源：[P3455](https://example.com/3455)',
      '',
      '**题意：** 求一个东西。',
      '',
      '## 思路',
    ].join('\n')
    const ids = checkBody(body, 'posts', { category: '题解' }).map((item) => item.ruleId)
    expect(ids).not.toContain('body-paragraph')
  })

  it('allows a top-level heading in standalone pages', () => {
    const body = '# 关于我\n\n正文。'
    expect(checkBody(body, 'about').map((item) => item.ruleId)).not.toContain('h1-in-body')
    expect(checkBody(body, 'posts').map((item) => item.ruleId)).toContain('h1-in-body')
  })

  it('warns only when there is no paragraph to summarise', () => {
    const body = ['# 标题', '', '- 列表项', '', '```cpp', 'int x;', '```'].join('\n')
    const ids = checkBody(body).map((item) => item.ruleId)
    expect(ids).toContain('body-paragraph')
  })

  it('provides a spacing quick fix', () => {
    const diagnostic = checkBody('中文English').find((item) => item.ruleId === 'cjk-latin-space')
    expect(diagnostic?.fix).toMatchObject({ insert: ' ' })
  })

  it('does not treat masked formulas or inline code as spaces before punctuation', () => {
    const body = '和最大就是二进制全填 $1$，某一位填 $0$，输出 `1`。'
    const ids = checkBody(body).map((item) => item.ruleId)
    expect(ids).not.toContain('cjk-punct-space')
    expect(ids).not.toContain('math-space')
  })

  it('still flags a real space next to fullwidth punctuation', () => {
    const diagnostics = checkBody('先这样。 然后再继续。').filter(
      (item) => item.ruleId === 'cjk-punct-space',
    )
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.fix?.insert).not.toContain(' ')
  })

  it('requires spaces around inline math except next to punctuation', () => {
    const missing = checkBody('中文$x$中文').filter((item) => item.ruleId === 'math-space')
    expect(missing).toHaveLength(2)
    expect(missing.every((item) => item.fix?.insert === ' ')).toBe(true)

    for (const body of [
      '中文 $x$ 中文。',
      '（$x$）是正确的。',
      '全填 $1$，某一位填 $0$。',
      '行尾公式 $x$',
      '$$',
      '\\$x$ 不是公式。',
    ]) {
      expect(checkBody(body).filter((item) => item.ruleId === 'math-space')).toEqual([])
    }
  })

  it('ignores math inside fenced code', () => {
    const body = ['```cpp', 'int x = 1; // 中文$x$中文', '```'].join('\n')
    expect(checkBody(body).filter((item) => item.ruleId === 'math-space')).toEqual([])
  })
})
