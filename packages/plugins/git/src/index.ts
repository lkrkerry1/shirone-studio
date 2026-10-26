import { Service, definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'

export interface GitStatusEntry {
  path: string
  status: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    git: GitService
  }
}

/**
 * V1 contract only. The UI never assumes Git is present; a later plugin can
 * replace this service with an implementation backed by git2 or the `git` CLI.
 */
export class GitService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'git')
  }

  async status(): Promise<GitStatusEntry[]> {
    return []
  }

  async commit(_message: string): Promise<{ committed: boolean }> {
    return { committed: false }
  }
}

export const name = 'git'
export const inject: string[] = []

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(GitService)
}

export default definePlugin({ name, inject, apply })
