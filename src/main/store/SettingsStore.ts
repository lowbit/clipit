import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { Settings } from '../../shared/types'

interface StoreSchema {
  settings: Settings
}

const defaults: Settings = {
  recordingsDir: '',
  shareDir: '',
  generateThumbnails: true,
  hasSeenTunnelNotice: false,
  encodeOnShare: true,
  codec: 'h265',
  quality: 'low',
  fps: '30',
  resolution: 'original',
  preferredEncoder: 'auto',
  streamableUsername: '',
  streamablePassword: '',
  lastSeenChangelog: ''
}

class SettingsStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'clipit-settings',
      defaults: {
        settings: defaults
      }
    })
  }

  private encryptPassword(plain: string): string {
    if (!plain || !safeStorage.isEncryptionAvailable()) return plain
    try {
      return safeStorage.encryptString(plain).toString('base64')
    } catch {
      return plain
    }
  }

  private decryptPassword(stored: string): string {
    if (!stored || !safeStorage.isEncryptionAvailable()) return stored
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch {
      return stored
    }
  }

  getAll(): Settings {
    const stored = this.store.get('settings', defaults)
    // Merge with defaults to ensure new fields are present
    const merged = { ...defaults, ...stored }
    merged.streamablePassword = this.decryptPassword(merged.streamablePassword)
    return merged
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    const settings = this.getAll()
    return settings[key]
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    const settings = this.getAll()
    settings[key] = value
    // Re-encrypt before saving
    const toSave = { ...settings }
    toSave.streamablePassword = this.encryptPassword(toSave.streamablePassword)
    this.store.set('settings', toSave)
  }

  setAll(newSettings: Partial<Settings>): void {
    const settings = this.getAll()
    const merged = { ...settings, ...newSettings }
    // Encrypt before saving
    const toSave = { ...merged }
    toSave.streamablePassword = this.encryptPassword(toSave.streamablePassword)
    this.store.set('settings', toSave)
  }

  reset(): void {
    this.store.set('settings', defaults)
  }

  isConfigured(): boolean {
    const settings = this.getAll()
    return settings.recordingsDir !== ''
  }
}

// Singleton instance
export const settingsStore = new SettingsStore()
