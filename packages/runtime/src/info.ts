export const runtimeVersion = '0.1.0'

export interface RuntimeInfo {
  name: string
  version: string
}

export function getRuntimeInfo(): RuntimeInfo {
  return { name: 'shirone-studio', version: runtimeVersion }
}
