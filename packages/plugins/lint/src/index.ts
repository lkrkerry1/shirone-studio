import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { LintService } from './service'

export const name = 'lint'
export const inject: string[] = []

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(LintService)
}

export default definePlugin({ name, inject, apply })
export { LintService } from './service'
export { checkBody } from './engine'
