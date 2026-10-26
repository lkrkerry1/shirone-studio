import {
  Context,
  PluginManager,
  parseComposition,
  type PluginDefinition,
} from '@shirone-studio/kernel'
import { ContentTypeRegistry, SyntaxRegistry } from '@shirone-studio/runtime'
import type { ProjectLayout } from '@shirone-studio/contracts'
import host from '@shirone-studio/plugin-host'
import frontmatter from '@shirone-studio/plugin-frontmatter'
import posts from '@shirone-studio/plugin-content-posts'
import series from '@shirone-studio/plugin-content-series'
import composeSource from '../../../compose.yml?raw'

const registry: Record<string, PluginDefinition<unknown>> = {
  '@shirone-studio/plugin-host': host as unknown as PluginDefinition<unknown>,
  '@shirone-studio/plugin-frontmatter': frontmatter as unknown as PluginDefinition<unknown>,
  '@shirone-studio/plugin-content-posts': posts as unknown as PluginDefinition<unknown>,
  '@shirone-studio/plugin-content-series': series as unknown as PluginDefinition<unknown>,
}

export interface StudioApp {
  context: Context
  plugins: PluginManager
}

export async function createApp(): Promise<StudioApp> {
  const context = new Context() as Context & {
    contentTypes: ContentTypeRegistry
    syntax: SyntaxRegistry
    host: {
      detectLayout(root: string): Promise<{
        mode: 'npm' | 'source'
        root: string
        contentRoot: string
        configRoot: string
        publicRoot: string
      }>
    }
  }
  await context.plugin(ContentTypeRegistry)
  await context.plugin(SyntaxRegistry)

  const plugins = new PluginManager(context, registry, parseComposition(composeSource))
  await plugins.loadAll()
  const failed = plugins.list().filter((plugin) => plugin.state === 'error')
  if (failed.length > 0) {
    throw new Error(
      `插件加载失败：${failed.map((plugin) => `${plugin.name} (${plugin.error})`).join('; ')}`,
    )
  }
  return { context, plugins }
}

export async function detectLayout(context: Context, root: string): Promise<ProjectLayout> {
  const info = await (context as unknown as {
    host: {
      detectLayout(root: string): Promise<{
        mode: 'npm' | 'source'
        root: string
        contentRoot: string
        configRoot: string
        publicRoot: string
      }>
    }
  }).host.detectLayout(root)
  return {
    root: info.root,
    mode: info.mode,
    contentRoot: info.contentRoot,
    configRoot: info.configRoot,
    publicRoot: info.publicRoot,
  }
}
