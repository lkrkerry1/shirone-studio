import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { ContentDraft, FieldDefinition } from '@shirone-studio/contracts'

export interface ContentTemplate {
  id: string
  label: string
  contentType: string
  description?: string
  fields: FieldDefinition[]
  /** Show the platform / problem-number row for this template. */
  platform?: boolean
  build(ctx: unknown, input: Record<string, unknown>): ContentDraft
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    templates: TemplateRegistry
  }
}

export class TemplateRegistry extends Service {
  private readonly templates = new Map<string, ContentTemplate>()
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'templates')
  }

  register(template: ContentTemplate): () => void {
    if (this.templates.has(template.id)) throw new Error(`Template already registered: ${template.id}`)
    this.templates.set(template.id, template)
    this.emit()
    return () => this.unregister(template.id)
  }

  unregister(id: string): void {
    if (this.templates.delete(id)) this.emit()
  }

  list(contentType?: string): ContentTemplate[] {
    return [...this.templates.values()]
      .filter((template) => contentType === undefined || template.contentType === contentType)
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
