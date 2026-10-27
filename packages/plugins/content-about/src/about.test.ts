import { describe, expect, it } from 'vitest'
import type {
  ContentContext,
  DirEntry,
  FileContent,
  FileStat,
  HostBridge,
  ProjectLayout,
} from '@shirone-studio/contracts'
import { serializeFrontmatter, splitFrontmatter } from '@shirone-studio/plugin-frontmatter'
import { aboutType } from './index'

class Host implements HostBridge {
  files = new Map<string, string>([['shirones/content/spec/about.md', '# About\n']])
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
  async listDir(): Promise<DirEntry[]> {
    return []
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

describe('about content type', () => {
  it('reads and saves a plain Markdown page without frontmatter', async () => {
    const list = await aboutType.list(context)
    expect(list).toHaveLength(1)
    const doc = await aboutType.read(context, 'about')
    expect(doc.body).toBe('# About\n')
    await aboutType.save(context, { ...doc, body: '# About\n\nHello\n' })
    expect((context.host as Host).files.get('shirones/content/spec/about.md')).toContain('Hello')
  })
})
