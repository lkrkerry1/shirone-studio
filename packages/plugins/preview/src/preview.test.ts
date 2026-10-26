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

  it('renders media directives as embeds and players', () => {
    const html = renderMarkdown(
      [
        '::bilibili{bvid="BV1fK4y1s7Qf" title="演示视频" p=1}',
        '',
        '::youtube{id="5gIf0_xpFPI" title="YouTube 演示"}',
        '',
        '::audio-reader[发音示范]{src="/assets/audio/a.mp3"}',
      ].join('\n'),
    )
    expect(html).toContain('player.bilibili.com')
    expect(html).toContain('youtube-nocookie.com/embed/5gIf0_xpFPI')
    expect(html).toContain('<audio')
    expect(html).toContain('/assets/audio/a.mp3')
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
