import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { FrontmatterService } from './service'

export const name = 'frontmatter'
export const inject: string[] = []

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(FrontmatterService)
}

export default definePlugin({ name, inject, apply })
export { FrontmatterService } from './service'
export {
  FrontmatterError,
  composeFrontmatter,
  serializeFrontmatter,
  splitFrontmatter,
} from './codec'
export type { SerializeOptions, SplitFrontmatter } from './codec'
export {
  dateValue,
  isValidDate,
  validateDateOrder,
  validateDescription,
  validateTags,
} from './validation'
