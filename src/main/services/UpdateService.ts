import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'

export class UpdateService {
  private mainWindow: BrowserWindow | null = null

  constructor() {
    // Configure auto-updater - don't auto-download, let user control it
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Set up event listeners
    this.setupEventListeners()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private setupEventListeners() {
    autoUpdater.on('error', (error) => {
      this.sendToRenderer('update-error', { error: error.message })
    })

    autoUpdater.on('checking-for-update', () => {
      this.sendToRenderer('update-checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })
    })

    autoUpdater.on('update-not-available', () => {
      this.sendToRenderer('update-not-available')
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.sendToRenderer('update-downloaded', {
        version: info.version
      })
    })
  }

  private sendToRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  // Check for updates (call this on app startup)
  checkForUpdates() {
    // Only check in production (packaged app)
    if (!app.isPackaged) {
      return
    }

    autoUpdater.checkForUpdates()
  }

  // Manual check triggered by user
  async checkForUpdatesManual() {
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.sendToRenderer('update-error', { error: 'Failed to check for updates' })
    }
  }

  // Download update (triggered by user clicking download button)
  downloadUpdate() {
    autoUpdater.downloadUpdate()
  }

  // Install update (triggered by user clicking restart button)
  installUpdate() {
    autoUpdater.quitAndInstall(false, true)
  }
}

export const updateService = new UpdateService()
