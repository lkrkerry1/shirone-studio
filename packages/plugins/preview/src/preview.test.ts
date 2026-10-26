import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render'

describe('preview renderer', () => {
  it('renders GFM, math, code and directives', () => {
    const html = renderMarkdown(
      ['**bold**', '', '$x+1$', '', '```ts', 'const x = 1', '```', '', '::: note 标题', '内容', ':::'].join(
        '\n',
      ),
    )
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('katex')
    expect(html).toContain('language-ts')
    expect(html).toContain('directive-note')
  })
})
