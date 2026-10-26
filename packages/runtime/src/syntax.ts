import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { SyntaxSpec } from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    syntax: SyntaxRegistry
  }
}

export class SyntaxRegistry extends Service {
  private readonly specs = new Map<string, SyntaxSpec>()
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'syntax')
  }

  register(spec: SyntaxSpec): () => void {
    if (this.specs.has(spec.id)) throw new Error(`Syntax already registered: ${spec.id}`)
    this.specs.set(spec.id, spec)
    this.emit()
    return () => this.unregister(spec.id)
  }

  unregister(id: string): void {
    if (this.specs.delete(id)) this.emit()
  }

  get(id: string): SyntaxSpec | undefined {
    return this.specs.get(id)
  }

  list(): SyntaxSpec[] {
    return [...this.specs.values()].sort(
      (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    )
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
