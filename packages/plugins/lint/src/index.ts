import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { LintService } from './service'

export const name = 'lint'
export const inject: string[] = ['settings']

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(LintService)
  ctx.effect(() =>
    ctx.settings.register({
      plugin: 'lint',
      title: '排版检查',
      fields: [
        {
          key: 'enabled',
          label: '启用排版检查',
          type: 'boolean',
          default: true,
          description: '关闭后编辑器不再显示下划线与状态栏提示。',
        },
      ],
    }),
  )
}

export default definePlugin({ name, inject, apply })
export { LintService } from './service'
export { checkBody } from './engine'
