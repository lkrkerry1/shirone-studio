const PROJECT_ROOT_KEY = 'shirone-studio.projectRoot'
const DEFAULT_PROJECT_ROOT = 'C:/Users/lkrkerry/Documents/DSH/Codes/Blog'

export function loadProjectRoot(): string {
  return localStorage.getItem(PROJECT_ROOT_KEY) ?? DEFAULT_PROJECT_ROOT
}

export function saveProjectRoot(root: string): void {
  localStorage.setItem(PROJECT_ROOT_KEY, root)
}
