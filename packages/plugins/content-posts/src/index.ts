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
import { assertSlug, joinPath, relativeTo, today } from '@shirone-studio/content-kit'
import type { SplitFrontmatter } from '@shirone-studio/plugin-frontmatter'

export const POST_ORDER = [
  'title',
  'published',
  'updated',
  'publishedAt',
  'description',
  'image',
  'tags',
  'category',
  'series',
  'seriesOrder',
  'pinned',
  'comment',
  'lang',
  'draft',
  'hideHomeContent',
  'encrypted',
  'password',
  'passwordHint',
  'alias',
  'permalink',
]

export const postFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'string', group: '基础', required: true },
  { key: 'published', label: '发布日期', type: 'date', group: '基础', required: true },
  { key: 'updated', label: '修改于', type: 'date', group: '基础', description: '正文修改后自动维护' },
  { key: 'publishedAt', label: '精确发布时间', type: 'datetime', group: '基础' },
  { key: 'description', label: '摘要', type: 'text', group: '基础', description: '50–120 字' },
  { key: 'image', label: '封面图', type: 'image', group: '内容关联' },
  { key: 'tags', label: '标签', type: 'tags', group: '内容关联' },
  {
    key: 'category',
    label: '分类',
    type: 'select',
    group: '内容关联',
    options: ['题解', '笔记', '随笔'],
  },
  { key: 'series', label: '系列 slug', type: 'string', group: '内容关联' },
  { key: 'seriesOrder', label: '系列序号', type: 'number', group: '内容关联' },
  { key: 'pinned', label: '置顶', type: 'boolean', group: '状态' },
  { key: 'comment', label: '开启评论', type: 'boolean', group: '状态' },
  { key: 'lang', label: '语言', type: 'select', group: '状态', options: ['zh_CN', 'en', 'ja', 'ko'] },
  { key: 'draft', label: '草稿', type: 'boolean', group: '状态' },
  { key: 'permalink', label: '永久链接', type: 'string', group: '路由' },
  { key: 'alias', label: '别名', type: 'string', group: '路由' },
  { key: 'encrypted', label: '加密', type: 'boolean', group: '安全' },
  { key: 'password', label: '密码', type: 'string', group: '安全' },
  { key: 'passwordHint', label: '密码提示', type: 'string', group: '安全' },
  { key: 'hideHomeContent', label: '首页隐藏摘要', type: 'boolean', group: '安全' },
]

function asContext(ctx: unknown): ContentContext {
  return ctx as ContentContext
}

function basePath(layout: ProjectLayout): string {
  return joinPath(layout.contentRoot, 'posts')
}

function summary(id: string, path: string, split: SplitFrontmatter): ContentSummary {
  const data = split.data
  return {
    type: 'posts',
    id,
    title: typeof data.title === 'string' && data.title.length > 0 ? data.title : id,
    subtitle: typeof data.description === 'string' ? data.description : undefined,
    date: typeof data.published === 'string' ? data.published : undefined,
    status: data.draft === true ? 'draft' : 'published',
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
    path,
  }
}

export function createPostType(): ContentTypeDefinition {
  return {
    id: 'posts',
    label: '文章',
    group: '写作',
    order: 10,
    kind: 'markdown-frontmatter',
    storage: {
      base: basePath,
      layout: 'bundle',
      pattern: '*/index.md',
      idFrom: 'directory',
    },
    fields: postFields,
    supports: { body: true, frontmatter: true, preview: true, lint: true },
    async list(ctx: unknown): Promise<ContentSummary[]> {
      const context = asContext(ctx)
      const base = basePath(context.layout)
      const root = context.layout.root
      const baseRelative = relativeTo(root, base)
      const entries = await context.host.listDir(root, baseRelative)
      const summaries: ContentSummary[] = []
      for (const entry of entries) {
        if (entry.isDirectory) {
          const path = `${entry.relativePath}/index.md`
          try {
            const file = await context.host.readText(root, path)
            const split = context.frontmatter.split(file.content)
            summaries.push(summary(entry.name, path, split))
          } catch {
            // A directory without index.md is not a post bundle.
          }
        } else if (entry.name.endsWith('.md')) {
          const path = entry.relativePath
          try {
            const file = await context.host.readText(root, path)
            const split = context.frontmatter.split(file.content)
            summaries.push(summary(entry.name.replace(/\.md$/, ''), path, split))
          } catch {
            // Ignore unreadable files; the editor can still open them later.
          }
        }
      }
      return summaries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    },
    async read(ctx: unknown, ref: string): Promise<ContentDocument> {
      const context = asContext(ctx)
      const root = context.layout.root
      const base = basePath(context.layout)
      const path = `${relativeTo(root, base)}/${ref}/index.md`
      const file = await context.host.readText(root, path)
      const split = context.frontmatter.split(file.content)
      return {
        type: 'posts',
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
      if (!id) throw new Error('新建文章需要 slug')
      assertSlug(id)
      const base = basePath(context.layout)
      const baseRelative = relativeTo(root, base)
      const dir = `${baseRelative}/${id}`
      const path = `${dir}/index.md`
      const existing = await context.host.stat(root, path)
      if (existing.exists) throw new Error(`文章已存在：${id}`)
      const frontmatter = {
        title: draft.title ?? '',
        published: today(),
        description: '',
        tags: [] as string[],
        category: '随笔',
        lang: 'zh_CN',
        draft: true,
        ...draft.frontmatter,
      }
      const raw = context.frontmatter.serialize(frontmatter, { order: POST_ORDER })
      const body = draft.body ?? '\n'
      const content = `${raw}\n${body}`
      await context.host.createDir(root, dir)
      await context.host.writeText(root, path, content)
      return this.read(ctx, id)
    },
    async save(ctx: unknown, doc: ContentDocument): Promise<{ path: string; hash?: string }> {
      const context = asContext(ctx)
      const root = context.layout.root
      if (!doc.frontmatter) throw new Error('文章缺少 frontmatter')
      const raw = doc.frontmatterDirty === false && doc.rawFrontmatter
        ? doc.rawFrontmatter
        : context.frontmatter.serialize(doc.frontmatter, { order: POST_ORDER })
      const content = `${raw}\n${doc.body ?? ''}`
      const result = await context.host.writeText(root, doc.path, content, doc.hash)
      return { path: doc.path, hash: result.hash }
    },
    newContent: [
      {
        id: 'blank-post',
        label: '空白文章',
        description: '先生成一个带标准 frontmatter 的草稿',
        fields: [
          { key: 'title', label: '标题', type: 'string', required: true },
          { key: 'slug', label: 'slug', type: 'string', required: true },
          { key: 'description', label: '摘要', type: 'text' },
        ],
        async create(_ctx, input) {
          return {
            type: 'posts',
            title: String(input.title ?? ''),
            slug: String(input.slug ?? ''),
            frontmatter: {
              description: String(input.description ?? ''),
            },
            body: '\n',
          }
        },
      },
    ],
  }
}

export const postsType = createPostType()

export const name = 'content-posts'
export const inject = ['contentTypes', 'host', 'frontmatter']

export function apply(ctx: Context): void {
  ctx.contentTypes.register(postsType)
}

export default definePlugin({ name, inject, apply })
