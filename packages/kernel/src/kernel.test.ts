import { describe, expect, it } from 'vitest'
import { Context, Service, definePlugin } from './index'

describe('kernel', () => {
  it('loads a plugin, injects a service and disposes it', async () => {
    class Counter extends Service {
      value = 0

      constructor(ctx: Context) {
        super(ctx, 'counter')
      }

      next(): number {
        return ++this.value
      }
    }

    const seen: number[] = []
    const consumer = definePlugin<{ step: number }>({
      name: 'consumer',
      inject: ['counter'],
      apply(ctx, config) {
        seen.push((ctx as Context & { counter: Counter }).counter.next() * config.step)
      },
    })

    const root = new Context() as Context & { counter: Counter }
    const serviceFiber = await root.plugin(Counter)
    const pluginFiber = await root.plugin(consumer, { step: 2 })

    expect(seen).toEqual([2])

    await pluginFiber.dispose()
    await serviceFiber.dispose()
  })
})
