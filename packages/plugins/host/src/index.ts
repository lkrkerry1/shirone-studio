import { Service, definePlugin } from '@shirone-studio/kernel'
import type { Context } from '@shirone-studio/kernel'
import { invoke } from '@tauri-apps/api/core'
import type {
  DirEntry,
  FileContent,
  FileStat,
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

  stat(root: string, relativePath: string): Promise<FileStat> {
    return invoke<FileStat>('stat_path', { root, path: relativePath })
  }

  createDir(root: string, relativePath: string): Promise<void> {
    return invoke<void>('create_dir', { root, path: relativePath })
  }
}

export const name = 'host'

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(HostService)
}

export default definePlugin({ name, apply })
