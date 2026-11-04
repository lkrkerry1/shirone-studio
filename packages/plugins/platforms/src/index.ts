import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import '@shirone-studio/runtime'
import { adapters } from './adapters'

export const name = 'platforms'
export const inject = ['platforms', 'settings']

export function apply(ctx: Context): void {
  for (const adapter of adapters) {
    ctx.effect(() => ctx.platforms.register(adapter))
  }
  ctx.effect(() => ctx.settings.register({
    plugin: 'platforms',
    title: '平台抓取',
    fields: [
      {
        key: 'luoguCookie',
        label: '洛谷 Cookie',
        type: 'string',
        default: '',
        placeholder: '_uid=…; __client_id=…',
        description:
          '用于抓取洛谷题目标签。登录洛谷后从浏览器复制 Cookie，仅保存在本机，只会发往 luogu.com.cn。',
      },
    ],
  }))
}

export default definePlugin({ name, inject, apply })
export { adapters }
