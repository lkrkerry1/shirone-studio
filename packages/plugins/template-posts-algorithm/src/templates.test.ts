import { describe, expect, it } from 'vitest'
import { contest, essay, note, singleProblem } from './index'

describe('algorithm post templates', () => {
  it('builds a single problem draft with frontmatter defaults', () => {
    const draft = singleProblem.build(undefined, {
      title: '洛谷 P2024 食物链',
      slug: 'lg-p2024',
      description: '带权并查集',
      tags: ['洛谷', '并查集'],
    })
    expect(draft.slug).toBe('lg-p2024')
    expect(draft.frontmatter).toMatchObject({
      title: '洛谷 P2024 食物链',
      tags: ['洛谷', '并查集'],
      category: '题解',
      draft: true,
      lang: 'zh_CN',
    })
    expect(draft.body).toContain('**题意：**')
    expect(draft.body).toContain('```cpp')
  })

  it('builds contest, note and essay bodies', () => {
    expect(contest.build(undefined, { title: 'ABC480', slug: 'at-abc-480' }).body).toContain(
      '## 题目 A',
    )
    expect(
      note.build(undefined, { title: '并查集', slug: 'dsu-note', series: 'dsu-topic', seriesOrder: 1 })
        .frontmatter,
    ).toMatchObject({ category: '笔记', series: 'dsu-topic', seriesOrder: 1 })
    expect(essay.build(undefined, { title: '随笔', slug: 'essay' }).frontmatter).toMatchObject({
      category: '随笔',
    })
  })
})
