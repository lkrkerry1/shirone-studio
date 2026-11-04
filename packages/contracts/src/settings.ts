/** A settings field a plugin exposes to the settings dialog. */
export type PluginSettingType = 'string' | 'number' | 'boolean' | 'select'

export interface PluginSettingField {
  key: string
  label: string
  type: PluginSettingType
  default?: unknown
  options?: string[]
  description?: string
  placeholder?: string
}

export interface PluginSettingsContribution {
  /** Plugin name, used as the storage namespace. */
  plugin: string
  title: string
  fields: PluginSettingField[]
}
