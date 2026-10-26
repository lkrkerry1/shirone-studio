import { describe, expect, it } from 'vitest'
import { Context } from '@shirone-studio/kernel'
import { AppearanceRegistry, mergeAppearance } from '@shirone-studio/runtime'
import { studioAppearance, studioTokens } from './index'

describe('appearance plugin', () => {
  it('paints the gutter with the editor background', () => {
    expect(studioTokens['--editor-gutter-bg']).toBe('var(--editor-bg)')
    expect(studioTokens['--editor-bg']).toBe('var(--surface-2)')
  })

  it('uses the blog fonts', () => {
    expect(studioTokens['--font-ui']).toContain("'Outfit', 'Yozai'")
    expect(studioTokens['--editor-font']).toContain("'JetBrains Mono'")

    const merged = mergeAppearance([studioAppearance])
    expect(merged.cssText).toContain('@font-face')
    expect(merged.cssText).toContain('Yozai-Medium')
    expect(merged.cssText).toContain("font-family: 'JetBrains Mono'")
  })

  it('merges tokens, css and editor extensions into one stylesheet', () => {
    const merged = mergeAppearance([studioAppearance])
    expect(merged.cssText).toContain('--editor-gutter-bg: var(--editor-bg);')
    expect(merged.cssText).toContain('--surface: #eaf1ff;')
    expect(merged.cssText).toContain('--surface: #000f21;') // dark override
    expect(merged.cssText).toContain('--syntax-keyword: #ff7b72;') // github-dark
    expect(merged.cssText).toContain('prefers-color-scheme: dark')
    // Chrome theme + syntax highlighting.
    expect(merged.editorExtensions).toHaveLength(2)
  })

  it('lets a later contribution override a token', () => {
    const merged = mergeAppearance([
      studioAppearance,
      { id: 'override', tokens: { '--surface': '#000000' } },
    ])
    expect(merged.tokens['--surface']).toBe('#000000')
    expect(merged.tokens['--editor-bg']).toBe('var(--surface-2)')
  })

  it('registers through the appearance service', async () => {
    const ctx = new Context() as Context & { appearance: AppearanceRegistry }
    await ctx.plugin(AppearanceRegistry)

    const dispose = ctx.appearance.register(studioAppearance)
    expect(ctx.appearance.list().map((item) => item.id)).toEqual(['studio-default'])
    expect(ctx.appearance.tokens()['--accent']).toBe('#006192')
    expect(ctx.appearance.cssText()).toContain('--surface: #eaf1ff;')
    expect(ctx.appearance.editorExtensions()).toHaveLength(2)

    dispose()
    expect(ctx.appearance.list()).toHaveLength(0)
  })
})
