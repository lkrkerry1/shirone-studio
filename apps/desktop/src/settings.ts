const PROJECT_ROOT_KEY = 'shirone-studio.projectRoot'
const INFO_PANEL_KEY = 'shirone-studio.infoPanel'
const RICH_EDITING_KEY = 'shirone-studio.richEditing'
const DEFAULT_PROJECT_ROOT = 'C:/Users/lkrkerry/Documents/DSH/Codes/Blog'

export function loadProjectRoot(): string {
  return localStorage.getItem(PROJECT_ROOT_KEY) ?? DEFAULT_PROJECT_ROOT
}

export function saveProjectRoot(root: string): void {
  localStorage.setItem(PROJECT_ROOT_KEY, root)
}

/**
 * The frontmatter form is collapsed by default: it is wider than it is useful
 * while writing.
 */
export function loadInfoPanel(): boolean {
  return localStorage.getItem(INFO_PANEL_KEY) === 'true'
}

export function saveInfoPanel(enabled: boolean): void {
  localStorage.setItem(INFO_PANEL_KEY, String(enabled))
}

/**
 * Rich-text ("what you see") editing: Markdown renders in place and the source
 * only shows for the block the cursor is in.
 */
export function loadRichEditing(): boolean {
  return localStorage.getItem(RICH_EDITING_KEY) !== 'false'
}

export function saveRichEditing(enabled: boolean): void {
  localStorage.setItem(RICH_EDITING_KEY, String(enabled))
}
