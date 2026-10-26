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
    const ids = checkBody(body).map((item) => item.ruleId)
    expect(ids).toContain('directive-balance')
    expect(ids).toContain('post-statement')
  })

  it('provides a spacing quick fix', () => {
    const diagnostic = checkBody('中文English').find((item) => item.ruleId === 'cjk-latin-space')
    expect(diagnostic?.fix).toMatchObject({ insert: ' ' })
  })
})
