import { definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import '@shirone-studio/runtime'
import { adapters } from './adapters'

export const name = 'platforms'
export const inject = ['platforms']

export function apply(ctx: Context): void {
  for (const adapter of adapters) {
    ctx.platforms.register(adapter)
  }
}

export default definePlugin({ name, inject, apply })
export { adapters }
