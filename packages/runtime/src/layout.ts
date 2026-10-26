import type { ProjectLayout } from '@shirone-studio/contracts'

export type PathExists = (relativePath: string) => boolean

function join(root: string, ...parts: string[]): string {
  const base = root.replace(/[\\/]+$/, '')
  return [base, ...parts].join('/')
}

/**
 * Detect the on-disk layout of a Shirone project.
 *
 * npm-package mode keeps content under `shirones/`, while theme-source mode keeps
 * the same directories under `src/`. The editor works against the repository root
 * so images, content and config data can be resolved in both modes.
 */
export function detectProjectLayout(root: string, exists: PathExists): ProjectLayout {
  if (exists('shirones/content')) {
    return {
      root,
      mode: 'npm',
      contentRoot: join(root, 'shirones/content'),
      configRoot: join(root, 'shirones/config'),
      publicRoot: join(root, 'public'),
      repoRoot: root,
    }
  }
  if (exists('src/content')) {
    return {
      root,
      mode: 'source',
      contentRoot: join(root, 'src/content'),
      configRoot: join(root, 'src/config'),
      publicRoot: join(root, 'public'),
      repoRoot: root,
    }
  }
  throw new Error(
    'Not a Shirone project: expected shirones/content or src/content in the selected folder',
  )
}

export function contentPath(layout: ProjectLayout, ...parts: string[]): string {
  return join(layout.contentRoot, ...parts)
}

export function configPath(layout: ProjectLayout, ...parts: string[]): string {
  return join(layout.configRoot, ...parts)
}
