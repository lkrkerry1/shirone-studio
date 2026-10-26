import { Service } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import {
  composeFrontmatter,
  serializeFrontmatter,
  splitFrontmatter,
  type SerializeOptions,
  type SplitFrontmatter,
} from './codec'

declare module '@deepseek-ai/cordis' {
  interface Context {
    frontmatter: FrontmatterService
  }
}

export class FrontmatterService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'frontmatter')
  }

  split(source: string): SplitFrontmatter {
    return splitFrontmatter(source)
  }

  serialize(data: Record<string, unknown>, options?: SerializeOptions): string {
    return serializeFrontmatter(data, options)
  }

  compose(split: Pick<SplitFrontmatter, 'raw' | 'body' | 'eol' | 'bom'>, raw?: string): string {
    return composeFrontmatter(split, raw)
  }
}
