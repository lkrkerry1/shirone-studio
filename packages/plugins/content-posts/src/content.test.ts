import { describe, expect, it } from 'vitest'
import type {
  ContentContext,
  DirEntry,
  FileContent,
  FileStat,
  HostBridge,
  ProjectLayout,
} from '@shirone-studio/contracts'
import { splitFrontmatter, serializeFrontmatter } from '@shirone-studio/plugin-frontmatter'
import { postsType } from './index'
import { seriesType } from '../../content-series/src/index'

class MockHost implements HostBridge {
  files = new Map<string, string>()
  dirs = new Set<string>()

  async detectLayout(): Promise<never> {
    throw new Error('not used')
  }

  async readText(_root: string, relativePath: string): Promise<FileContent> {
    const content = this.files.get(relativePath)
    if (content === undefined) throw new Error(`missing: ${relativePath}`)
    return {
      content,
      hash: `hash:${content.length}:${content}`,
      mtimeMs: 1,
      eol: content.includes('\r\n') ? 'crlf' : 'lf',
    }
  }

  async writeText(
    _root: string,
    relativePath: string,
    content: string,
    expectedHash?: string,
  ): Promise<{ hash: string; mtimeMs: number }> {
    if (expectedHash !== undefined && this.files.has(relativePath)) {
      const current = `hash:${this.files.get(relativePath)!.length}:${this.files.get(relativePath)!}`
      if (current !== expectedHash) throw new Error('CONFLICT')
    }
    this.files.set(relativePath, content)
    return { hash: `hash:${content.length}:${content}`, mtimeMs: 1 }
  }

  async listDir(_root: string, relativePath: string): Promise<DirEntry[]> {
    const prefix = `${relativePath}/`
    const entries = new Map<string, DirEntry>()
    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue
      const rest = file.slice(prefix.length)
      const [name, ...more] = rest.split('/')
      if (!name) continue
      entries.set(name, {
        name,
        relativePath: `${prefix}${name}`,
        isDirectory: more.length > 0 || this.dirs.has(`${prefix}${name}`),
      })
    }
    return [...entries.values()]
  }

  async stat(_root: string, relativePath: string): Promise<FileStat> {
    if (this.files.has(relativePath)) {
      return { exists: true, isDirectory: false, size: 1, mtimeMs: 1 }
    }
    if (this.dirs.has(relativePath)) {
      return { exists: true, isDirectory: true, size: 0, mtimeMs: 1 }
    }
    return { exists: false, isDirectory: false, size: 0, mtimeMs: 0 }
  }

  async deletePath(_root: string, path: string): Promise<void> {
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.files.delete(key)
    }
    this.dirs.delete(path)
  }

  async createDir(_root: string, relativePath: string): Promise<void> {
    this.dirs.add(relativePath)
  }

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

function makeContext(host: MockHost): ContentContext {
  return {
    host,
    layout,
    frontmatter: {
      split: splitFrontmatter,
      serialize: serializeFrontmatter,
      compose: () => '',
    },
  }
}

describe('content types', () => {
  it('lists, reads, creates and saves a post bundle', async () => {
    const host = new MockHost()
    const context = makeContext(host)
    host.files.set(
      'shirones/content/posts/hello/index.md',
      '---\ntitle: Hello\npublished: 2026-10-26\ntags: [A, B]\ndraft: false\n---\n\n正文\n',
    )

    const list = await postsType.list(context)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 'hello', title: 'Hello', status: 'published' })

    const doc = await postsType.read(context, 'hello')
    expect(doc.body).toContain('正文')
    expect(doc.frontmatter?.title).toBe('Hello')

    const created = await postsType.create(context, {
      type: 'posts',
      title: 'New',
      slug: 'new-post',
      frontmatter: { description: '摘要' },
      body: '\n内容',
    })
    expect(created.id).toBe('new-post')
    expect(host.files.has('shirones/content/posts/new-post/index.md')).toBe(true)
    expect(host.files.get('shirones/content/posts/new-post/index.md')).toContain('title: New')

    const saved = await postsType.save(context, {
      ...created,
      body: '\n改过的正文',
      frontmatterDirty: false,
      rawFrontmatter: created.rawFrontmatter,
    })
    expect(saved.hash).toContain('hash:')
    expect(host.files.get('shirones/content/posts/new-post/index.md')).toContain('改过的正文')
  })

  it('removes a post bundle with its file', async () => {
    const host = new MockHost()
    const context = makeContext(host)
    const created = await postsType.create(context, {
      type: 'posts',
      title: 'Bye',
      slug: 'bye',
      body: '\n',
    })
    expect(host.files.has('shirones/content/posts/bye/index.md')).toBe(true)
    await postsType.remove!(context, created.id)
    expect(host.files.has('shirones/content/posts/bye/index.md')).toBe(false)
    expect(await postsType.list(context)).toHaveLength(0)
  })

  it('creates and reads series files', async () => {
    const host = new MockHost()
    const context = makeContext(host)
    const created = await seriesType.create(context, {
      type: 'series',
      title: '线段树',
      slug: 'seg-tree',
      frontmatter: { status: 'ongoing', defaultCategory: '笔记' },
      body: '\n导读\n',
    })
    expect(created.id).toBe('seg-tree')
    expect(host.files.get('shirones/content/series/seg-tree.md')).toContain('defaultCategory: 笔记')
    const list = await seriesType.list(context)
    expect(list[0]).toMatchObject({ id: 'seg-tree', title: '线段树' })
  })
})
