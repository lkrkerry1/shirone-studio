import { describe, expect, it } from 'vitest'
import { board, contest, essay, singleProblem } from './index'

describe('algorithm post templates', () => {
  it('only asks for a problem source on the solution templates', () => {
    expect(singleProblem.platform).toBe(true)
    expect(contest.platform).toBe(true)
    expect(board.platform).toBeUndefined()
    expect(essay.platform).toBeUndefined()
  })

  it('offers the optional series fields on every template', () => {
    const keys = (template: { fields: Array<{ key: string }> }) =>
      template.fields.map((field) => field.key)
    for (const template of [singleProblem, contest, board, essay]) {
      expect(keys(template)).toContain('series')
      expect(keys(template)).toContain('seriesOrder')
    }
    const draft = essay.build(undefined, { title: '随笔', slug: 'essay', series: 'daily', seriesOrder: 3 })
    expect(draft.frontmatter).toMatchObject({ series: 'daily', seriesOrder: 3 })
    const plain = essay.build(undefined, { title: '随笔', slug: 'essay' })
    expect(plain.frontmatter).not.toHaveProperty('series')
  })

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

  it('builds contest, board and essay bodies', () => {
    expect(contest.build(undefined, { title: 'ABC480', slug: 'at-abc-480' }).body).toContain(
      '## 题目 A',
    )
    expect(
      board.build(undefined, { title: '并查集', slug: 'dsu-board', series: 'dsu-topic', seriesOrder: 1 })
        .frontmatter,
    ).toMatchObject({ category: '笔记', series: 'dsu-topic', seriesOrder: 1 })
    expect(essay.build(undefined, { title: '随笔', slug: 'essay' }).frontmatter).toMatchObject({
      category: '随笔',
    })
  })
})
