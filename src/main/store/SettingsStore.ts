import Store from 'electron-store'
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
  preferredEncoder: 'auto'
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

  getAll(): Settings {
    const stored = this.store.get('settings', defaults)
    // Merge with defaults to ensure new fields are present
    return { ...defaults, ...stored }
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    const settings = this.getAll()
    return settings[key]
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    const settings = this.getAll()
    settings[key] = value
    this.store.set('settings', settings)
  }

  setAll(newSettings: Partial<Settings>): void {
    const settings = this.getAll()
    const merged = { ...settings, ...newSettings }
    this.store.set('settings', merged)
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
