import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { ContentTypeDefinition } from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    contentTypes: ContentTypeRegistry
  }
}

export class ContentTypeRegistry extends Service {
  private readonly types = new Map<string, ContentTypeDefinition>()
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'contentTypes')
  }

  register(type: ContentTypeDefinition): () => void {
    if (this.types.has(type.id)) {
      throw new Error(`Content type already registered: ${type.id}`)
    }
    this.types.set(type.id, type)
    this.emit()
    return () => this.unregister(type.id)
  }

  unregister(id: string): void {
    if (this.types.delete(id)) this.emit()
  }

  get(id: string): ContentTypeDefinition | undefined {
    return this.types.get(id)
  }

  list(): ContentTypeDefinition[] {
    return [...this.types.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
