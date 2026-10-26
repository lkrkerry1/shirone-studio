import { describe, expect, it } from 'vitest'
import { composeFrontmatter, serializeFrontmatter, splitFrontmatter } from './codec'
import { validateDescription, validateTags, validateDateOrder } from './validation'

const sample = `---
title: 洛谷 P2024 食物链
published: 2026-10-19
description: 带权并查集/扩展域并查集模板题
tags: [模板, 并查集, 洛谷]
category: 题解
lang: zh_CN
draft: false
---

> 来源：[P2024 [NOI2001] 食物链](https://www.luogu.com.cn/problem/P2024)

正文。
`

describe('frontmatter codec', () => {
  it('splits and recomposes without touching the body or raw frontmatter', () => {
    const split = splitFrontmatter(sample)
    expect(split.bom).toBe(false)
    expect(split.eol).toBe('lf')
    expect(split.data.title).toBe('洛谷 P2024 食物链')
    expect(split.body.startsWith('\n> 来源')).toBe(true)
    expect(composeFrontmatter(split)).toBe(sample)
  })

  it('preserves CRLF files on compose', () => {
    const crlf = sample.replace(/\n/g, '\r\n')
    const split = splitFrontmatter(crlf)
    expect(split.eol).toBe('crlf')
    expect(composeFrontmatter(split)).toBe(crlf)
  })

  it('serializes known fields, tags inline and nested images', () => {
    const raw = serializeFrontmatter(
      {
        title: '标题: 有冒号',
        published: '2026-10-19',
        description: '描述',
        tags: ['A', 'B'],
        category: '题解',
        images: [{ src: '/a.webp', alt: '图 A' }],
        draft: false,
      },
      { order: ['title', 'published', 'description', 'tags', 'category', 'images', 'draft'] },
    )
    expect(raw).toContain('title: "标题: 有冒号"')
    expect(raw).toContain('tags: [A, B]')
    expect(raw).toContain('published: 2026-10-19')
    expect(raw).toContain('images:\n  - src: /a.webp')
    const parsed = splitFrontmatter(`${raw}\n\n正文`)
    expect(parsed.data.images).toEqual([{ src: '/a.webp', alt: '图 A' }])
  })

  it('keeps unknown fields', () => {
    const split = splitFrontmatter(sample.replace('draft: false', 'draft: false\ncustom: keep-me'))
    const raw = serializeFrontmatter(split.data, { order: ['title', 'published'] })
    expect(raw).toContain('custom: keep-me')
  })

  it('reports invalid YAML', () => {
    expect(() => splitFrontmatter('---\ntitle: [\n---\n')).toThrow(/Invalid YAML/)
  })

  it('validates author conventions', () => {
    expect(validateDescription('3 题题解：A、B、C')).toEqual(
      expect.arrayContaining([expect.objectContaining({ level: 'warning' })]),
    )
    expect(validateTags(['题解', '题解'])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('category') }),
        expect.objectContaining({ message: expect.stringContaining('重复') }),
      ]),
    )
    expect(validateDateOrder('2026-10-20', '2026-10-19')).toEqual([
      { level: 'error', message: 'updated 不能早于 published' },
    ])
  })
})
