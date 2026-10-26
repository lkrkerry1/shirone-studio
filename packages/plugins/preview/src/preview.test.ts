import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render'

describe('preview renderer', () => {
  it('keeps images and raw media elements for asset resolution', () => {
    const html = renderMarkdown(
      ['![cover](./cover.png)', '', '<video src="./clip.mp4" controls></video>'].join('\n'),
    )
    expect(html).toContain('<img')
    expect(html).toContain('src="./cover.png"')
    expect(html).toContain('<video')
    expect(html).toContain('src="./clip.mp4"')
  })

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
