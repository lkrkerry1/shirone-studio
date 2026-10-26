/**
 * A visual contribution registered by an appearance plugin.
 *
 * The studio collects every contribution from `context.appearance`, merges the
 * tokens and injects the result as one stylesheet, so a theme can be changed by
 * adding or editing a plugin rather than touching component styles.
 */
export interface AppearanceContribution {
  /** Stable id; registering the same id again replaces the contribution. */
  id: string
  /** Design tokens, rendered as CSS custom properties on `:root`. */
  tokens?: Record<string, string>
  /** Raw CSS injected after the tokens, so it may use them. */
  css?: string
  /** CodeMirror extensions appended to every editor instance. */
  editorExtensions?: unknown[]
}

/** The merged result of every registered contribution. */
export interface MergedAppearance {
  tokens: Record<string, string>
  cssText: string
  editorExtensions: unknown[]
}
