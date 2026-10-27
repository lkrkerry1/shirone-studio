import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { PlatformAdapter } from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    platforms: PlatformRegistry
  }
}

export class PlatformRegistry extends Service {
  private readonly adapters = new Map<string, PlatformAdapter>()
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'platforms')
  }

  register(adapter: PlatformAdapter): () => void {
    if (this.adapters.has(adapter.id)) throw new Error(`Platform already registered: ${adapter.id}`)
    this.adapters.set(adapter.id, adapter)
    this.emit()
    return () => this.unregister(adapter.id)
  }

  unregister(id: string): void {
    if (this.adapters.delete(id)) this.emit()
  }

  get(id: string): PlatformAdapter | undefined {
    return this.adapters.get(id)
  }

  list(): PlatformAdapter[] {
    return [...this.adapters.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  /** First registered adapter that recognises the pasted id or URL. */
  detect(input: string): PlatformAdapter | undefined {
    const text = input.trim()
    if (!text) return undefined
    for (const adapter of this.adapters.values()) {
      if (adapter.matches?.(text)) return adapter
    }
    return undefined
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
