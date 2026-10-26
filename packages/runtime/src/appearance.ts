import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type {
  AppearanceContribution,
  MergedAppearance,
} from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    appearance: AppearanceRegistry
  }
}

/// Render one stylesheet out of every contribution: merged tokens first, then
/// each contribution's own rules in registration order (later ones win).
export function mergeAppearance(
  contributions: readonly AppearanceContribution[],
): MergedAppearance {
  const tokens: Record<string, string> = {}
  const editorExtensions: unknown[] = []
  for (const contribution of contributions) {
    Object.assign(tokens, contribution.tokens ?? {})
    editorExtensions.push(...(contribution.editorExtensions ?? []))
  }

  const blocks: string[] = []
  const declarations = Object.entries(tokens)
  if (declarations.length > 0) {
    const lines = declarations.map(([name, value]) => `  ${name}: ${value};`)
    blocks.push(`:root {\n${lines.join('\n')}\n}`)
  }
  for (const contribution of contributions) {
    if (contribution.css) blocks.push(contribution.css)
  }

  return { tokens, cssText: blocks.join('\n\n'), editorExtensions }
}

export class AppearanceRegistry extends Service {
  private readonly contributions = new Map<string, AppearanceContribution>()

  constructor(ctx: Context) {
    super(ctx, 'appearance')
  }

  register(contribution: AppearanceContribution): () => void {
    this.contributions.set(contribution.id, contribution)
    return () => this.contributions.delete(contribution.id)
  }

  unregister(id: string): void {
    this.contributions.delete(id)
  }

  list(): AppearanceContribution[] {
    return [...this.contributions.values()]
  }

  merge(): MergedAppearance {
    return mergeAppearance(this.list())
  }

  tokens(): Record<string, string> {
    return this.merge().tokens
  }

  cssText(): string {
    return this.merge().cssText
  }

  editorExtensions(): unknown[] {
    return this.merge().editorExtensions
  }
}
