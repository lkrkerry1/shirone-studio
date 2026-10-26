import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { LintDiagnostic } from '@shirone-studio/contracts'
import { checkBody } from './engine'

declare module '@deepseek-ai/cordis' {
  interface Context {
    lint: LintService
  }
}

export class LintService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'lint')
  }

  check(body: string, contentType = 'posts'): LintDiagnostic[] {
    return checkBody(body, contentType)
  }
}
