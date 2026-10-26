export type SyntaxPreviewSupport = 'full' | 'partial' | 'placeholder' | 'none'

export type SyntaxMaskKind =
  | 'fence'
  | 'inline'
  | 'math'
  | 'directive'
  | 'attribute'
  | 'include'
  | 'none'

export interface SyntaxSpec {
  id: string
  category: string
  name: string
  docsPath: string
  examples: string[]
  snippet?: string
  preview: SyntaxPreviewSupport
  mask: SyntaxMaskKind[]
  lintRules?: string[]
  note?: string
}
