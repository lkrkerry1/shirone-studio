import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import '@shirone-studio/runtime'
import type { ContentDraft, FieldDefinition } from '@shirone-studio/contracts'
import type { ContentTemplate } from '@shirone-studio/runtime'

const commonFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'string', required: true },
  { key: 'slug', label: 'slug', type: 'string', required: true },
  { key: 'description', label: '摘要', type: 'text' },
  { key: 'tags', label: '标签', type: 'tags' },
]

const seriesFields: FieldDefinition[] = [
  { key: 'series', label: '系列 slug', type: 'string' },
  { key: 'seriesOrder', label: '系列序号', type: 'number' },
]

function asString(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  return typeof value === 'string' ? value : ''
}

function asTags(input: Record<string, unknown>): string[] {
  const value = input.tags
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string')
  if (typeof value === 'string') {
    return value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean)
  }
  return []
}

function baseDraft(
  input: Record<string, unknown>,
  category: '题解' | '笔记' | '随笔',
  body: string,
  extras: Record<string, unknown> = {},
): ContentDraft {
  const series = asString(input, 'series')
  const seriesOrder = input.seriesOrder
  return {
    type: 'posts',
    title: asString(input, 'title'),
    slug: asString(input, 'slug'),
    body,
    frontmatter: {
      title: asString(input, 'title'),
      description: asString(input, 'description'),
      tags: asTags(input),
      category,
      lang: 'zh_CN',
      draft: true,
      ...(series ? { series } : {}),
      ...(typeof seriesOrder === 'number' ? { seriesOrder } : {}),
      ...extras,
    },
  }
}

const singleProblem: ContentTemplate = {
  id: 'algorithm/single-problem',
  label: '单题题解',
  contentType: 'posts',
  description: '来源引用 + 题意 + 思路 + C++ 代码',
  fields: [...commonFields, ...seriesFields],
  platform: true,
  build(_ctx, input) {
    const source = input.problemUrl
      ? `> 来源：[${asString(input, 'platformName')} ${asString(input, 'problemId')}](${asString(input, 'problemUrl')})`
      : '> 来源：'
    return baseDraft(
      input,
      '题解',
      [
        source,
        '',
        '**题意：** ',
        '',
        '## 思路',
        '',
        '',
        '## 代码',
        '',
        '```cpp',
        '',
        '```',
        '',
      ].join('\n'),
    )
  },
}

const contest: ContentTemplate = {
  id: 'algorithm/contest',
  label: '整赛题解',
  contentType: 'posts',
  description: '开场段 + 多题小节骨架',
  fields: [...commonFields, ...seriesFields],
  platform: true,
  build(_ctx, input) {
    return baseDraft(
      input,
      '题解',
      [
        '（开场段：比赛性质、题量、赛时成绩、整体难度、本文覆盖范围。）',
        '',
        '## 题目 A',
        '',
        '**题意：** ',
        '',
        '思路：',
        '',
        '```cpp',
        '',
        '```',
        '',
        '## 题目 B',
        '',
        '**题意：** ',
        '',
        '思路：',
        '',
      ].join('\n'),
    )
  },
}

const note: ContentTemplate = {
  id: 'algorithm/note',
  label: '专题笔记',
  contentType: 'posts',
  description: '引言 + 小节，可加入系列',
  fields: [...commonFields, ...seriesFields],
  build(_ctx, input) {
    return baseDraft(
      input,
      '笔记',
      ['（引言：这个专题解决什么问题、适用场景。）', '', '## 小节', '', '', '## 小节二', ''].join(
        '\n',
      ),
    )
  },
}

const board: ContentTemplate = {
  id: 'algorithm/board',
  label: '模板 / 板子笔记',
  contentType: 'posts',
  description: '使用说明 + 模板代码',
  fields: [...commonFields, ...seriesFields],
  build(_ctx, input) {
    return baseDraft(
      input,
      '笔记',
      [
        '（使用说明：前置定义、下标约定、复杂度。）',
        '',
        '## 模板代码',
        '',
        '```cpp',
        '',
        '```',
        '',
        '## 使用示例',
        '',
      ].join('\n'),
    )
  },
}

const essay: ContentTemplate = {
  id: 'essay',
  label: '随笔',
  contentType: 'posts',
  description: '轻量随笔 / 工具折腾',
  fields: [...commonFields, ...seriesFields],
  build(_ctx, input) {
    return baseDraft(input, '随笔', ['（正文）', ''].join('\n'))
  },
}

export const NAME = 'template-posts-algorithm'
export const inject = ['templates']

export function apply(ctx: Context): void {
  for (const template of [singleProblem, contest, note, board, essay]) {
    ctx.templates.register(template)
  }
}

export default definePlugin({ name: NAME, inject, apply })
export { singleProblem, contest, note, board, essay }
