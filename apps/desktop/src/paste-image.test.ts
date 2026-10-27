import { describe, expect, it } from 'vitest'
import {
  documentDirectory,
  imageExtension,
  pastedImageName,
  pastedImagePath,
  readFileBase64,
} from './paste-image'

describe('paste image helpers', () => {
  it('maps common image types to extensions', () => {
    expect(imageExtension(new File([], 'a.png', { type: 'image/png' }))).toBe('png')
    expect(imageExtension(new File([], 'a.jpeg', { type: 'image/jpeg' }))).toBe('jpg')
    expect(imageExtension(new File([], 'a.svg', { type: 'image/svg+xml' }))).toBe('svg')
    expect(imageExtension(new File([], 'a.bmp', { type: 'image/bmp' }))).toBe('png')
  })

  it('puts pasted images next to the document in img/', () => {
    const doc = 'shirones/content/posts/cf-2277/index.md'
    expect(documentDirectory(doc)).toBe('shirones/content/posts/cf-2277')
    const path = pastedImagePath(doc, new File([], 'a.png', { type: 'image/png' }))
    expect(path).toMatch(/^img\/pasted-\d{14}-[0-9a-f]{8}\.png$/)
    expect(documentDirectory('index.md')).toBe('')
    expect(pastedImagePath('index.md', new File([], 'a.png', { type: 'image/png' }))).toMatch(
      /^img\/pasted-/,
    )
    expect(pastedImageName(new File([], 'a.png', { type: 'image/png' }))).toMatch(
      /^pasted-\d{14}-[0-9a-f]{8}\.png$/,
    )
  })

  it('generates a fresh name for every paste', () => {
    const file = new File([], 'a.png', { type: 'image/png' })
    expect(pastedImagePath('posts/a/index.md', file)).not.toBe(
      pastedImagePath('posts/a/index.md', file),
    )
  })

  it('reads the file as base64', async () => {
    const file = new File([new Uint8Array([104, 101, 108, 108, 111])], 'a.txt', {
      type: 'text/plain',
    })
    expect(await readFileBase64(file)).toBe('aGVsbG8=')
  })
})
