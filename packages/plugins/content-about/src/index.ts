import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import '@shirone-studio/runtime'
import type {
  ContentContext,
  ContentDocument,
  ContentDraft,
  ContentSummary,
  ContentTypeDefinition,
  ProjectLayout,
} from '@shirone-studio/contracts'
import { joinPath, relativeTo } from '@shirone-studio/content-kit'

function asContext(ctx: unknown): ContentContext {
  return ctx as ContentContext
}

function basePath(layout: ProjectLayout): string {
  return joinPath(layout.contentRoot, 'spec')
}

const ABOUT_PATH = 'about.md'

export const aboutType: ContentTypeDefinition = {
  id: 'about',
  label: '关于页',
  group: '页面',
  order: 40,
  kind: 'markdown-plain',
  storage: {
    base: basePath,
    layout: 'flat',
    pattern: ABOUT_PATH,
    idFrom: 'filename',
  },
  fields: [],
  supports: { body: true, frontmatter: false, preview: true, lint: false },
  async list(ctx: unknown): Promise<ContentSummary[]> {
    const context = asContext(ctx)
    const root = context.layout.root
    const path = relativeTo(root, joinPath(basePath(context.layout), ABOUT_PATH))
    const stat = await context.host.stat(root, path)
    return stat.exists
      ? [{ type: 'about', id: 'about', title: '关于页', path }]
      : []
  },
  async read(ctx: unknown, _ref: string): Promise<ContentDocument> {
    const context = asContext(ctx)
    const root = context.layout.root
    const path = relativeTo(root, joinPath(basePath(context.layout), ABOUT_PATH))
    const file = await context.host.readText(root, path)
    return {
      type: 'about',
      id: 'about',
      path,
      title: '关于页',
      body: file.content,
      hash: file.hash,
      meta: { type: 'about', id: 'about', title: '关于页', path },
    }
  },
  async create(ctx: unknown, draft: ContentDraft): Promise<ContentDocument> {
    const context = asContext(ctx)
    const root = context.layout.root
    const path = relativeTo(root, joinPath(basePath(context.layout), ABOUT_PATH))
    await context.host.writeText(root, path, draft.body ?? '')
    return aboutType.read(ctx, 'about')
  },
  async save(ctx: unknown, doc: ContentDocument): Promise<{ path: string; hash?: string }> {
    const context = asContext(ctx)
    const result = await context.host.writeText(context.layout.root, doc.path, doc.body ?? '', doc.hash)
    return { path: doc.path, hash: result.hash }
  },
}

export const name = 'content-about'
export const inject = ['contentTypes', 'host']

export function apply(ctx: Context): void {
  ctx.contentTypes.register(aboutType)
}

export default definePlugin({ name, inject, apply })
