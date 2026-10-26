import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import '@shirone-studio/runtime'
import type {
  ContentContext,
  ContentDocument,
  ContentDraft,
  ContentSummary,
  ContentTypeDefinition,
  FieldDefinition,
  ProjectLayout,
} from '@shirone-studio/contracts'
import { assertSlug, joinPath, nowWithOffset, relativeTo } from '@shirone-studio/content-kit'
import type { SplitFrontmatter } from '@shirone-studio/plugin-frontmatter'

export const MOMENT_ORDER = ['published', 'pinned', 'mood', 'tags', 'location', 'images']

export const momentFields: FieldDefinition[] = [
  { key: 'published', label: '发布时间', type: 'datetime', group: '基础', required: true },
  { key: 'pinned', label: '置顶', type: 'boolean', group: '基础' },
  { key: 'mood', label: '心情图标', type: 'icon', group: '基础', placeholder: 'material-symbols:...' },
  { key: 'tags', label: '标签', type: 'tags', group: '基础' },
  { key: 'location', label: '位置', type: 'string', group: '基础' },
  {
    key: 'images',
    label: '图片排版',
    type: 'object-list',
    group: '内容关联',
    itemFields: [
      { key: 'src', label: '图片路径', type: 'string' },
      { key: 'alt', label: '替代文本', type: 'string' },
    ],
  },
]

function asContext(ctx: unknown): ContentContext {
  return ctx as ContentContext
}

function basePath(layout: ProjectLayout): string {
  return joinPath(layout.contentRoot, 'moments')
}

function dateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : ''
}

function summary(id: string, path: string, split: SplitFrontmatter): ContentSummary {
  const bodyFirstLine = split.body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'))
  return {
    type: 'moments',
    id,
    title: bodyFirstLine?.slice(0, 48) || id,
    subtitle: typeof split.data.location === 'string' ? split.data.location : undefined,
    date: dateString(split.data.published),
    status: split.data.pinned === true ? 'pinned' : undefined,
    tags: Array.isArray(split.data.tags)
      ? split.data.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
    path,
  }
}

export const momentsType: ContentTypeDefinition = {
  id: 'moments',
  label: '瞬间',
  group: '页面',
  order: 30,
  kind: 'markdown-frontmatter',
  storage: {
    base: basePath,
    layout: 'flat',
    pattern: '*.md',
    idFrom: 'filename',
  },
  fields: momentFields,
  supports: { body: true, frontmatter: true, preview: true, lint: false },
  async list(ctx: unknown): Promise<ContentSummary[]> {
    const context = asContext(ctx)
    const root = context.layout.root
    const base = basePath(context.layout)
    const entries = await context.host.listDir(root, relativeTo(root, base))
    const out: ContentSummary[] = []
    for (const entry of entries) {
      if (entry.isDirectory || !entry.name.endsWith('.md')) continue
      try {
        const file = await context.host.readText(root, entry.relativePath)
        const split = context.frontmatter.split(file.content)
        out.push(summary(entry.name.replace(/\.md$/, ''), entry.relativePath, split))
      } catch {
        // ignore unreadable moments
      }
    }
    return out.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  },
  async read(ctx: unknown, ref: string): Promise<ContentDocument> {
    const context = asContext(ctx)
    const root = context.layout.root
    const path = relativeTo(root, joinPath(basePath(context.layout), `${ref}.md`))
    const file = await context.host.readText(root, path)
    const split = context.frontmatter.split(file.content)
    return {
      type: 'moments',
      id: ref,
      path,
      title: summary(ref, path, split).title,
      body: split.body,
      frontmatter: split.data,
      rawFrontmatter: split.raw,
      hash: file.hash,
      meta: summary(ref, path, split),
    }
  },
  async create(ctx: unknown, draft: ContentDraft): Promise<ContentDocument> {
    const context = asContext(ctx)
    const root = context.layout.root
    const slug = draft.slug
    if (!slug) throw new Error('新建瞬间需要 slug')
    assertSlug(slug)
    const date = nowWithOffset().slice(0, 10)
    const id = `${date}-${slug}`
    const path = relativeTo(root, joinPath(basePath(context.layout), `${id}.md`))
    if ((await context.host.stat(root, path)).exists) throw new Error(`瞬间已存在：${id}`)
    const frontmatter = {
      published: nowWithOffset(),
      pinned: false,
      mood: '',
      tags: [] as string[],
      location: '',
      images: [] as Array<{ src: string; alt: string }>,
      ...draft.frontmatter,
    }
    const raw = context.frontmatter.serialize(frontmatter, { order: MOMENT_ORDER })
    const content = `${raw}\n${draft.body ?? '\n'}`
    await context.host.writeText(root, path, content)
    return momentsType.read(ctx, id)
  },
  async save(ctx: unknown, doc: ContentDocument): Promise<{ path: string; hash?: string }> {
    const context = asContext(ctx)
    if (!doc.frontmatter) throw new Error('瞬间缺少 frontmatter')
    const raw =
      doc.frontmatterDirty === false && doc.rawFrontmatter
        ? doc.rawFrontmatter
        : context.frontmatter.serialize(doc.frontmatter, { order: MOMENT_ORDER })
    const content = `${raw}\n${doc.body ?? ''}`
    const result = await context.host.writeText(context.layout.root, doc.path, content, doc.force ? undefined : doc.hash)
    return { path: doc.path, hash: result.hash }
  },
  newContent: [
    {
      id: 'quick-moment',
      label: '发一条瞬间',
      description: '短正文 + 心情 / 位置 / 标签',
      fields: [
        { key: 'body', label: '正文', type: 'text', required: true },
        { key: 'slug', label: 'slug', type: 'string', required: true },
        { key: 'mood', label: '心情图标', type: 'string' },
        { key: 'location', label: '位置', type: 'string' },
        { key: 'tags', label: '标签', type: 'tags' },
      ],
      async create(_ctx, input) {
        const tags = typeof input.tags === 'string'
          ? input.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean)
          : []
        return {
          type: 'moments',
          slug: String(input.slug ?? ''),
          body: String(input.body ?? ''),
          frontmatter: {
            mood: String(input.mood ?? ''),
            location: String(input.location ?? ''),
            tags,
          },
        }
      },
    },
  ],
}

export const name = 'content-moments'
export const inject = ['contentTypes', 'host', 'frontmatter']

export function apply(ctx: Context): void {
  ctx.contentTypes.register(momentsType)
}

export default definePlugin({ name, inject, apply })
