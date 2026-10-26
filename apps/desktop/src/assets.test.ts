import { describe, expect, it } from 'vitest'
import { dirname, normalizePath, resolveAssetPath } from './assets'

const base = {
  layoutRoot: 'C:/blog',
  contentPath: 'shirones/content/posts/hello/index.md',
  publicRoot: 'C:/blog/public',
}

describe('asset path resolution', () => {
  it('resolves bundle-relative media', () => {
    expect(resolveAssetPath({ ...base, src: './cover.png' })).toBe(
      'C:/blog/shirones/content/posts/hello/cover.png',
    )
    expect(resolveAssetPath({ ...base, src: '../shared/a.png' })).toBe(
      'C:/blog/shirones/content/posts/shared/a.png',
    )
  })

  it('maps absolute site paths to public', () => {
    expect(resolveAssetPath({ ...base, src: '/images/a.png' })).toBe('C:/blog/public/images/a.png')
  })

  it('leaves remote and data URLs alone', () => {
    expect(resolveAssetPath({ ...base, src: 'https://example.com/a.png' })).toBeNull()
    expect(resolveAssetPath({ ...base, src: 'data:image/png;base64,aaa' })).toBeNull()
  })

  it('normalizes Windows separators', () => {
    expect(normalizePath('C:\\blog\\a\\..\\b.png')).toBe('C:/blog/b.png')
    expect(dirname('C:/blog/posts/a/index.md')).toBe('C:/blog/posts/a')
  })
})
