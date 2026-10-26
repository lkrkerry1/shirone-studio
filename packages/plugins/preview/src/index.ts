import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { PreviewService } from './service'

export const name = 'preview'
export const inject: string[] = []

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(PreviewService)
}

export default definePlugin({ name, inject, apply })
export { PreviewService } from './service'
export { renderMarkdown } from './render'
