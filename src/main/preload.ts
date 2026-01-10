import { contextBridge, ipcRenderer } from 'electron'
import type { Settings, ShareRequest, Game, Clip, ClipInfo, TrimResult, ShareResult, EncoderInfo } from '../shared/types'

contextBridge.exposeInMainWorld('clipit', {
  getGames: (): Promise<Game[]> =>
    ipcRenderer.invoke('clipit:media:get-games'),

  getClips: (game?: string): Promise<Clip[]> =>
    ipcRenderer.invoke('clipit:media:get-clips', { game }),

  getClipInfo: (path: string): Promise<ClipInfo> =>
    ipcRenderer.invoke('clipit:media:get-clip-info', { path }),

  getVideoUrl: (path: string): string => {
    const urlPath = path.replace(/\\/g, '/')
    return `clipit-video:///${urlPath}`
  },

  getImageUrl: (path: string): string => {
    const urlPath = path.replace(/\\/g, '/')
    return `clipit-image:///${urlPath}`
  },

  getThumbnailUrl: (path: string, time?: number): string => {
    const urlPath = path.replace(/\\/g, '/')
    return `clipit-thumb:///${urlPath}${time ? `?time=${time}` : ''}`
  },

  trim: (path: string, start: number, end: number, saveAsCopy?: boolean): Promise<TrimResult> =>
    ipcRenderer.invoke('clipit:trim:execute', { path, start, end, saveAsCopy }),

  share: (request: ShareRequest): Promise<ShareResult> =>
    ipcRenderer.invoke('clipit:share:execute', request),

  deleteFile: (path: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('clipit:file:delete', { path }),

  renameFile: (path: string, newName: string): Promise<{ success: boolean; error?: string; newPath?: string }> =>
    ipcRenderer.invoke('clipit:file:rename', { path, newName }),

  showInExplorer: (path: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('clipit:file:show-in-explorer', { path }),

  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke('clipit:settings:get'),

  setSettings: (settings: Partial<Settings>): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('clipit:settings:set', settings),

  pickDirectory: (title: string): Promise<string | null> =>
    ipcRenderer.invoke('clipit:settings:pick-directory', { title }),

  detectEncoders: (): Promise<EncoderInfo[]> =>
    ipcRenderer.invoke('clipit:gpu:detect-encoders'),

  startTunnel: (): Promise<{ url: string; isActive: boolean; port: number }> =>
    ipcRenderer.invoke('clipit:tunnel:start'),

  stopTunnel: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('clipit:tunnel:stop'),

  getTunnelInfo: (): Promise<{ url: string; isActive: boolean; port: number }> =>
    ipcRenderer.invoke('clipit:tunnel:get-info'),

  copyToClipboard: (text: string): Promise<void> =>
    ipcRenderer.invoke('clipit:util:copy-clipboard', { text }),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('clipit:util:open-external', { url }),

  isConfigured: (): Promise<boolean> =>
    ipcRenderer.invoke('clipit:app:is-configured'),

  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('clipit:app:get-version'),

  getPlatform: (): string => process.platform,

  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('menu:open-settings', callback)
    return () => ipcRenderer.removeListener('menu:open-settings', callback)
  },

  onGoHome: (callback: () => void) => {
    ipcRenderer.on('menu:go-home', callback)
    return () => ipcRenderer.removeListener('menu:go-home', callback)
  },

  onShowAbout: (callback: () => void) => {
    ipcRenderer.on('menu:show-about', callback)
    return () => ipcRenderer.removeListener('menu:show-about', callback)
  },

  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke('clipit:update:check'),

  downloadUpdate: (): Promise<void> =>
    ipcRenderer.invoke('clipit:update:download'),

  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('clipit:update:install'),

  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes: string }) => void) => {
    const handler = (_: any, info: any) => callback(info)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },

  onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
    const handler = (_: any, progress: any) => callback(progress)
    ipcRenderer.on('update-download-progress', handler)
    return () => ipcRenderer.removeListener('update-download-progress', handler)
  },

  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_: any, info: any) => callback(info)
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },

  onUpdateError: (callback: (error: { error: string }) => void) => {
    const handler = (_: any, error: any) => callback(error)
    ipcRenderer.on('update-error', handler)
    return () => ipcRenderer.removeListener('update-error', handler)
  }
})

declare global {
  interface Window {
    clipit: {
      getGames: () => Promise<Game[]>
      getClips: (game?: string) => Promise<Clip[]>
      getClipInfo: (path: string) => Promise<ClipInfo>
      getVideoUrl: (path: string) => string
      getImageUrl: (path: string) => string
      getThumbnailUrl: (path: string, time?: number) => string
      trim: (path: string, start: number, end: number, saveAsCopy?: boolean) => Promise<TrimResult>
      share: (request: ShareRequest) => Promise<ShareResult>
      deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>
      renameFile: (path: string, newName: string) => Promise<{ success: boolean; error?: string; newPath?: string }>
      showInExplorer: (path: string) => Promise<{ success: boolean; error?: string }>
      getSettings: () => Promise<Settings>
      setSettings: (settings: Partial<Settings>) => Promise<{ success: boolean }>
      pickDirectory: (title: string) => Promise<string | null>
      detectEncoders: () => Promise<EncoderInfo[]>
      startTunnel: () => Promise<{ url: string; isActive: boolean; port: number }>
      stopTunnel: () => Promise<{ success: boolean }>
      getTunnelInfo: () => Promise<{ url: string; isActive: boolean; port: number }>
      copyToClipboard: (text: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
      isConfigured: () => Promise<boolean>
      getAppVersion: () => Promise<string>
      getPlatform: () => string
      onOpenSettings: (callback: () => void) => () => void
      onGoHome: (callback: () => void) => () => void
      onShowAbout: (callback: () => void) => () => void
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes: string }) => void) => () => void
      onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => () => void
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
      onUpdateError: (callback: (error: { error: string }) => void) => () => void
    }
  }
}
