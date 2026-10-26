import { describe, expect, it } from 'vitest'
import { Context } from '@shirone-studio/kernel'
import { SyntaxRegistry } from '@shirone-studio/runtime'
import { apply, name } from './index'
import { shironeSyntaxSpecs } from './specs'
import { collectProtectedRanges, isProtected, maskSource } from './mask'

describe('syntax-shirone', () => {
  it('registers the full manifest in the syntax registry', async () => {
    const ctx = new Context() as Context & { syntax: SyntaxRegistry }
    const registryFiber = await ctx.plugin(SyntaxRegistry)
    apply(ctx)
    expect(name).toBe('syntax-shirone')
    expect(ctx.syntax.list().length).toBe(shironeSyntaxSpecs.length)
    expect(ctx.syntax.get('admonition')?.docsPath).toBe(
      'guide/writing/markdown/admonitions/',
    )
    expect(ctx.syntax.get('math')?.preview).toBe('full')
    await registryFiber.dispose()
  })

  it('masks code, math, directives, includes and attributes', () => {
    const body = [
      '中文English',
      '```ts',
      'const x = 1',
      '```',
      '行内 `code` 和 $x+1$',
      '::: tip',
      '需要检查的内容',
      ':::',
      '<!-- @include: ./x.md -->',
      '==高亮=={.secondary}',
    ].join('\n')
    const ranges = collectProtectedRanges(body)
    const masked = maskSource(body, ranges)

    expect(masked).toContain('中文English')
    expect(isProtected(ranges, body.indexOf('const x = 1'), body.indexOf('const x = 1') + 5)).toBe(true)
    expect(isProtected(ranges, body.indexOf('$x+1$'), body.indexOf('$x+1$') + 5)).toBe(true)
    expect(isProtected(ranges, body.indexOf('{.secondary}'), body.indexOf('{.secondary}') + 12)).toBe(true)
    expect(masked).toContain('需要检查的内容')
    expect(masked).not.toContain('const x = 1')
    expect(masked).not.toContain('@include')
  })
})
