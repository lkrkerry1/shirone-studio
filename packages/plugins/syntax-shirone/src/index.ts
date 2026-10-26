import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { shironeSyntaxSpecs } from './specs'

export const name = 'syntax-shirone'
export const inject = ['syntax']

export function apply(ctx: Context): void {
  for (const spec of shironeSyntaxSpecs) {
    ctx.syntax.register(spec)
  }
}

export default definePlugin({ name, inject, apply })
export { shironeSyntaxSpecs } from './specs'
export { collectProtectedRanges, isProtected, maskSource } from './mask'
export type { MaskRange } from './mask'
