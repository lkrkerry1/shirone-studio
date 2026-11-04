import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@shirone-studio/kernel'
import { SettingsRegistry } from './settings'

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  } as unknown as Storage
}

describe('settings registry', () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage
  })

  it('exposes plugin fields and persists values', async () => {
    ;(globalThis as { localStorage?: Storage }).localStorage = fakeStorage()
    const ctx = new Context() as Context & { settings: SettingsRegistry }
    await ctx.plugin(SettingsRegistry)
    const unregister = ctx.settings.register({
      plugin: 'demo',
      title: 'Demo',
      fields: [
        { key: 'size', label: 'Size', type: 'number', default: 12 },
        { key: 'name', label: 'Name', type: 'string', default: '' },
      ],
    })

    expect(ctx.settings.read('demo', 'size')).toBe(12)
    expect(ctx.settings.list()).toHaveLength(1)
    ctx.settings.write('demo', 'size', 18)
    expect(ctx.settings.read('demo', 'size')).toBe(18)
    expect(localStorage.getItem('shirone-studio.setting.demo.size')).toBe('18')

    unregister()
    expect(ctx.settings.list()).toHaveLength(0)
  })

  it('falls back to the default without storage', async () => {
    const ctx = new Context() as Context & { settings: SettingsRegistry }
    await ctx.plugin(SettingsRegistry)
    ctx.settings.register({
      plugin: 'demo',
      title: 'Demo',
      fields: [{ key: 'size', label: 'Size', type: 'number', default: 12 }],
    })
    expect(ctx.settings.read('demo', 'size')).toBe(12)
    expect(() => ctx.settings.write('demo', 'size', 20)).not.toThrow()
  })
})
