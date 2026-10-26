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
import { assertSlug, joinPath, relativeTo } from '@shirone-studio/content-kit'
import type { SplitFrontmatter } from '@shirone-studio/plugin-frontmatter'

export const SERIES_ORDER = ['title', 'status', 'defaultCategory']

export const seriesFields: FieldDefinition[] = [
  { key: 'title', label: '系列标题', type: 'string', group: '基础', required: true },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    group: '基础',
    options: ['ongoing', 'completed'],
  },
  {
    key: 'defaultCategory',
    label: '默认分类',
    type: 'select',
    group: '基础',
    options: ['题解', '笔记', '随笔'],
  },
]

function asContext(ctx: unknown): ContentContext {
  return ctx as ContentContext
}

function basePath(layout: ProjectLayout): string {
  return joinPath(layout.contentRoot, 'series')
}

function summary(id: string, path: string, split: SplitFrontmatter): ContentSummary {
  return {
    type: 'series',
    id,
    title: typeof split.data.title === 'string' ? split.data.title : id,
    subtitle: typeof split.data.defaultCategory === 'string' ? split.data.defaultCategory : undefined,
    status: typeof split.data.status === 'string' ? split.data.status : undefined,
    path,
  }
}

export const seriesType: ContentTypeDefinition = {
  id: 'series',
  label: '系列',
  group: '页面',
  order: 20,
  kind: 'markdown-frontmatter',
  storage: {
    base: basePath,
    layout: 'flat',
    pattern: '*.md',
    idFrom: 'filename',
  },
  fields: seriesFields,
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
        // ignore unreadable series
      }
    }
    return out
  },
  async read(ctx: unknown, ref: string): Promise<ContentDocument> {
    const context = asContext(ctx)
    const root = context.layout.root
    const path = relativeTo(root, joinPath(basePath(context.layout), `${ref}.md`))
    const file = await context.host.readText(root, path)
    const split = context.frontmatter.split(file.content)
    return {
      type: 'series',
      id: ref,
      path,
      title: typeof split.data.title === 'string' ? split.data.title : ref,
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
    const id = draft.slug
    if (!id) throw new Error('新建系列需要 slug')
    assertSlug(id)
    const path = relativeTo(root, joinPath(basePath(context.layout), `${id}.md`))
    if ((await context.host.stat(root, path)).exists) throw new Error(`系列已存在：${id}`)
    const frontmatter = {
      title: draft.title ?? '',
      status: 'ongoing',
      defaultCategory: '题解',
      ...draft.frontmatter,
    }
    const raw = context.frontmatter.serialize(frontmatter, { order: SERIES_ORDER })
    const content = `${raw}\n${draft.body ?? '\n'}`
    await context.host.writeText(root, path, content)
    return seriesType.read(ctx, id)
  },
  async save(ctx: unknown, doc: ContentDocument): Promise<{ path: string; hash?: string }> {
    const context = asContext(ctx)
    if (!doc.frontmatter) throw new Error('系列缺少 frontmatter')
    const raw =
      doc.frontmatterDirty === false && doc.rawFrontmatter
        ? doc.rawFrontmatter
        : context.frontmatter.serialize(doc.frontmatter, { order: SERIES_ORDER })
    const content = `${raw}\n${doc.body ?? ''}`
    const result = await context.host.writeText(context.layout.root, doc.path, content, doc.force ? undefined : doc.hash)
    return { path: doc.path, hash: result.hash }
  },
  newContent: [
    {
      id: 'new-series',
      label: '新建系列',
      fields: [
        { key: 'title', label: '系列标题', type: 'string', required: true },
        { key: 'slug', label: 'slug', type: 'string', required: true },
        {
          key: 'status',
          label: '状态',
          type: 'select',
          options: ['ongoing', 'completed'],
        },
      ],
      async create(_ctx, input) {
        return {
          type: 'series',
          title: String(input.title ?? ''),
          slug: String(input.slug ?? ''),
          frontmatter: {
            status: String(input.status ?? 'ongoing'),
          },
          body: '\n',
        }
      },
    },
  ],
}

export const name = 'content-series'
export const inject = ['contentTypes', 'host', 'frontmatter']

export function apply(ctx: Context): void {
  ctx.contentTypes.register(seriesType)
}

export default definePlugin({ name, inject, apply })
