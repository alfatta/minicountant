export type SettingsId = 'singleton'

export interface Settings {
  id: SettingsId
  theme: 'light' | 'dark' | 'system'
  autoLockMinutes: number
  updatedAt: number
}
