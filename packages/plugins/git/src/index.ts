import { Service, definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import type { GitCommitResult, GitPushResult, GitStatus } from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    git: GitService
  }
}

/**
 * Project Git operations, backed by the host bridge (the `git` CLI lives behind
 * Tauri). The UI keeps working when the project is not a repository: `status`
 * simply reports `isRepo: false`.
 */
export class GitService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'git')
  }

  status(root: string): Promise<GitStatus> {
    return this.ctx.host.gitStatus(root)
  }

  stage(root: string, paths: string[]): Promise<GitStatus> {
    return this.ctx.host.gitStage(root, paths)
  }

  unstage(root: string, paths: string[]): Promise<GitStatus> {
    return this.ctx.host.gitUnstage(root, paths)
  }

  commit(root: string, message: string, paths: string[]): Promise<GitCommitResult> {
    return this.ctx.host.gitCommit(root, message, paths)
  }

  push(root: string): Promise<GitPushResult> {
    return this.ctx.host.gitPush(root)
  }

  diff(root: string, path: string, staged = false): Promise<string> {
    return this.ctx.host.gitDiff(root, path, staged)
  }
}

export const name = 'git'
export const inject: string[] = ['host']

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(GitService)
}

export default definePlugin({ name, inject, apply })
