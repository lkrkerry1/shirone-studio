import { describe, expect, it } from 'vitest'
import { getRuntimeInfo } from './info'
import { detectProjectLayout, contentPath } from './layout'
import { ContentTypeRegistry } from './content-types'
import { Context } from '@shirone-studio/kernel'
import type { ContentTypeDefinition } from '@shirone-studio/contracts'

describe('runtime', () => {
  it('reports its identity', () => {
    expect(getRuntimeInfo()).toEqual({ name: 'shirone-studio', version: '0.1.0' })
  })

  it('detects npm and source layouts', () => {
    const npmExists = new Set(['shirones/content'])
    const npm = detectProjectLayout('C:/blog', (path) => npmExists.has(path))
    expect(npm.mode).toBe('npm')
    expect(contentPath(npm, 'posts')).toBe('C:/blog/shirones/content/posts')

    const sourceExists = new Set(['src/content'])
    const source = detectProjectLayout('C:/blog', (path) => sourceExists.has(path))
    expect(source.mode).toBe('source')
    expect(contentPath(source, 'posts')).toBe('C:/blog/src/content/posts')
  })

  it('registers and removes content types', async () => {
    const ctx = new Context() as Context & { contentTypes: ContentTypeRegistry }
    const fiber = await ctx.plugin(ContentTypeRegistry)
    const type: ContentTypeDefinition = {
      id: 'mock',
      label: 'Mock',
      group: 'tests',
      order: 1,
      kind: 'markdown-plain',
      storage: {
        base: () => 'mock',
        layout: 'flat',
        pattern: '*.md',
        idFrom: 'filename',
      },
      supports: { body: true, frontmatter: false, preview: true, lint: false },
      list: async () => [],
      read: async () => {
        throw new Error('not used')
      },
      create: async () => {
        throw new Error('not used')
      },
      save: async () => ({ path: '' }),
    }
    const dispose = ctx.contentTypes.register(type)
    expect(ctx.contentTypes.list().map((item) => item.id)).toEqual(['mock'])
    expect(ctx.contentTypes.get('mock')).toBe(type)
    dispose()
    expect(ctx.contentTypes.list()).toEqual([])
    await fiber.dispose()
  })
})
