import { Service, definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { invoke } from '@tauri-apps/api/core'
import type {
  DirEntry,
  FileContent,
  FileStat,
  GitCommitResult,
  GitPushResult,
  GitStatus,
  HostBridge,
  ProjectLayoutInfo,
} from '@shirone-studio/contracts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    host: HostService
  }
}

export class HostService extends Service implements HostBridge {
  constructor(ctx: Context) {
    super(ctx, 'host')
  }

  detectLayout(root: string): Promise<ProjectLayoutInfo> {
    return invoke<ProjectLayoutInfo>('detect_project_layout', { root })
  }

  readText(root: string, relativePath: string): Promise<FileContent> {
    return invoke<FileContent>('read_text', { root, path: relativePath })
  }

  writeText(
    root: string,
    relativePath: string,
    content: string,
    expectedHash?: string,
  ): Promise<{ hash: string; mtimeMs: number }> {
    return invoke<[string, number]>('write_text', {
      root,
      path: relativePath,
      content,
      expectedHash,
    }).then(([hash, mtimeMs]) => ({ hash, mtimeMs }))
  }

  listDir(root: string, relativePath: string): Promise<DirEntry[]> {
    return invoke<DirEntry[]>('list_dir', { root, path: relativePath })
  }

  writeAsset(
    root: string,
    relativePath: string,
    base64: string,
  ): Promise<{ path: string; hash: string; size: number }> {
    return invoke<[string, number]>('write_asset', {
      root,
      path: relativePath,
      base64,
    }).then(([hash, size]) => ({ path: relativePath, hash, size }))
  }

  stat(root: string, relativePath: string): Promise<FileStat> {
    return invoke<FileStat>('stat_path', { root, path: relativePath })
  }

  createDir(root: string, relativePath: string): Promise<void> {
    return invoke<void>('create_dir', { root, path: relativePath })
  }

  httpFetch(url: string, options?: { cookie?: string }): Promise<string> {
    return invoke<string>('http_fetch', { url, cookie: options?.cookie })
  }

  gitStatus(root: string): Promise<GitStatus> {
    return invoke<GitStatus>('git_status', { root })
  }

  gitStage(root: string, paths: string[]): Promise<GitStatus> {
    return invoke<GitStatus>('git_stage', { root, paths })
  }

  gitUnstage(root: string, paths: string[]): Promise<GitStatus> {
    return invoke<GitStatus>('git_unstage', { root, paths })
  }

  gitCommit(root: string, message: string, paths: string[]): Promise<GitCommitResult> {
    return invoke<GitCommitResult>('git_commit', { root, message, paths })
  }

  gitPush(root: string): Promise<GitPushResult> {
    return invoke<GitPushResult>('git_push', { root })
  }

  gitDiff(root: string, path: string, staged: boolean): Promise<string> {
    return invoke<string>('git_diff', { root, path, staged })
  }
}

export const name = 'host'

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(HostService)
}

export default definePlugin({ name, apply })
