export type LintSeverity = 'error' | 'warning' | 'info'

export interface LintFix {
  label: string
  from: number
  to: number
  insert: string
}

export interface LintDiagnostic {
  ruleId: string
  severity: LintSeverity
  message: string
  from: number
  to: number
  fix?: LintFix
}
