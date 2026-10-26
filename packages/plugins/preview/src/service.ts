import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { renderMarkdown } from './render'

declare module '@deepseek-ai/cordis' {
  interface Context {
    preview: PreviewService
  }
}

export class PreviewService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'preview')
  }

  render(body: string): string {
    return renderMarkdown(body)
  }
}
