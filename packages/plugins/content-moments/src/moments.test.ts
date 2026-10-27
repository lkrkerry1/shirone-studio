import { describe, expect, it, vi } from 'vitest'
import type {
  ContentContext,
  DirEntry,
  FileContent,
  FileStat,
  HostBridge,
  ProjectLayout,
} from '@shirone-studio/contracts'
import { serializeFrontmatter, splitFrontmatter } from '@shirone-studio/plugin-frontmatter'
import { momentsType } from './index'

class Host implements HostBridge {
  files = new Map<string, string>()
  async detectLayout(): Promise<never> {
    throw new Error('not used')
  }
  async readText(_root: string, path: string): Promise<FileContent> {
    const content = this.files.get(path)
    if (content === undefined) throw new Error('missing')
    return { content, hash: `h:${content}`, mtimeMs: 1, eol: 'lf' }
  }
  async writeText(_root: string, path: string, content: string): Promise<{ hash: string; mtimeMs: number }> {
    this.files.set(path, content)
    return { hash: `h:${content}`, mtimeMs: 1 }
  }
  async listDir(_root: string, path: string): Promise<DirEntry[]> {
    const prefix = `${path}/`
    return [...this.files.keys()]
      .filter((file) => file.startsWith(prefix) && file.slice(prefix.length).split('/').length === 1)
      .map((file) => ({ name: file.split('/').pop()!, relativePath: file, isDirectory: false }))
  }
  async stat(_root: string, path: string): Promise<FileStat> {
    return this.files.has(path)
      ? { exists: true, isDirectory: false, size: 1, mtimeMs: 1 }
      : { exists: false, isDirectory: false, size: 0, mtimeMs: 0 }
  }
  async deletePath(_root: string, path: string): Promise<void> {
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.files.delete(key)
    }
  }

  async createDir(): Promise<void> {}
  async httpFetch(): Promise<string> {
    return ''
  }
}

const layout: ProjectLayout = {
  root: 'C:/blog',
  mode: 'npm',
  contentRoot: 'C:/blog/shirones/content',
  configRoot: 'C:/blog/shirones/config',
  publicRoot: 'C:/blog/public',
}

const context: ContentContext = {
  host: new Host(),
  layout,
  frontmatter: { split: splitFrontmatter, serialize: serializeFrontmatter, compose: () => '' },
}

describe('moments content type', () => {
  it('creates a dated moment file with image array defaults', async () => {
    const doc = await momentsType.create(context, {
      type: 'moments',
      slug: 'desk',
      body: '桌面亮了。',
      frontmatter: { location: '工位', tags: ['daily'] },
    })
    expect(doc.id).toMatch(/^\d{4}-\d{2}-\d{2}-desk$/)
    const file = [...(context.host as Host).files.values()][0]!
    expect(file).toContain('location: 工位')
    expect(file).toContain('images: []')
    expect(file).toContain('桌面亮了。')
    const list = await momentsType.list(context)
    expect(list[0]).toMatchObject({ id: doc.id, subtitle: '工位' })
  })

  it('removes the moment with its public image folder', async () => {
    const host = new Host()
    const ctx = { ...context, host }
    const doc = await momentsType.create(ctx, { type: 'moments', slug: 'del', body: 'x' })
    const imagePath = `public/images/moments/${doc.id}/a.png`
    host.files.set(imagePath, 'x')
    await momentsType.remove!(ctx, doc.id)
    expect(host.files.has(`shirones/content/moments/${doc.id}.md`)).toBe(false)
    expect(host.files.has(imagePath)).toBe(false)
  })

  it('defaults the slug to HHMM and suffixes a same-minute collision', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 26, 22, 30, 0))
    try {
      const host = new Host()
      const ctx = { ...context, host }
      const first = await momentsType.create(ctx, { type: 'moments', body: 'a' })
      expect(first.id).toBe('2026-10-26-2230')
      const second = await momentsType.create(ctx, { type: 'moments', body: 'b' })
      expect(second.id).toBe('2026-10-26-2230-2')

      // An explicit slug is still the user's choice and must not be renamed.
      await expect(
        momentsType.create(ctx, { type: 'moments', slug: '2230', body: 'c' }),
      ).rejects.toThrow('瞬间已存在')

      const field = momentsType.newContent?.[0]?.fields?.find((item) => item.key === 'slug')
      expect(field?.default?.()).toBe('2230')
    } finally {
      vi.useRealTimers()
    }
  })
})
