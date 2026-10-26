import { describe, expect, it } from 'vitest'
import { Context, definePlugin } from './index'
import { flattenComposition, parseComposition } from './composition'
import { PluginManager } from './plugin-manager'

describe('composition', () => {
  it('flattens groups and inherits disabled groups', () => {
    const composition = parseComposition(`
groups:
  - id: core
    plugins:
      - name: pkg.a
      - id: nested
        plugins:
          - name: pkg.b
  - id: optional
    disabled: true
    plugins:
      - name: pkg.c
`)
    expect(flattenComposition(composition)).toEqual([
      { id: 'pkg.a', name: 'pkg.a', config: undefined, disabled: false, requires: undefined, group: 'core' },
      { id: 'pkg.b', name: 'pkg.b', config: undefined, disabled: false, requires: undefined, group: 'nested' },
      { id: 'pkg.c', name: 'pkg.c', config: undefined, disabled: true, requires: undefined, group: 'optional' },
    ])
  })
})

describe('plugin manager', () => {
  it('loads plugins, blocks disable of a required entry and disposes', async () => {
    const events: string[] = []
    const a = definePlugin<{ label: string }>({
      name: 'a',
      Config: { parse: (input) => input as { label: string } },
      apply(_ctx, config) {
        events.push(`start:${config.label}`)
      },
    })
    const b = definePlugin({
      name: 'b',
      apply() {
        events.push('start:b')
      },
    })
    const composition = parseComposition(`
groups:
  - id: demo
    plugins:
      - id: a
        name: pkg.a
        config:
          label: hello
      - id: b
        name: pkg.b
        requires: [a]
`)
    const manager = new PluginManager(
      new Context(),
      { 'pkg.a': a as never, 'pkg.b': b as never },
      composition,
    )
    await manager.loadAll()
    expect(events).toEqual(['start:hello', 'start:b'])
    expect(manager.list().map((item) => item.state)).toEqual(['active', 'active'])

    await expect(manager.setEnabled('a', false)).rejects.toThrow('required by b')
    await manager.setEnabled('b', false)
    await manager.setEnabled('a', false)
    expect(manager.list().map((item) => item.state)).toEqual(['disabled', 'disabled'])
    await manager.disposeAll()
  })

  it('records unknown packages as errors without aborting the load', async () => {
    const composition = parseComposition(`
groups:
  - id: demo
    plugins:
      - name: missing
`)
    const manager = new PluginManager(new Context(), {}, composition)
    await manager.loadAll()
    expect(manager.list()[0]?.state).toBe('error')
  })
})
