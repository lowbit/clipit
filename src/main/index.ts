import { app, BrowserWindow, protocol, Menu, session } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerIpcHandlers } from './ipc/handlers'
import { registerProtocols } from './utils/protocol'
import { tunnelService } from './services/TunnelService'
import { updateService } from './services/UpdateService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Suppress security warnings in development (they won't show in production)
if (process.env.NODE_ENV === 'development') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    backgroundColor: '#1a1a1a',
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../../resources/icon.png')
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()

    if (mainWindow) {
      updateService.setMainWindow(mainWindow)
      setTimeout(() => {
        updateService.checkForUpdates()
      }, 3000)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'clipit-video',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  },
  {
    scheme: 'clipit-image',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  },
  {
    scheme: 'clipit-thumb',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
])

app.whenReady().then(() => {
  // Set Content Security Policy before creating window
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.NODE_ENV === 'development'
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:*; img-src 'self' data: blob: clipit-thumb: clipit-image:; media-src 'self' blob: clipit-video:; connect-src 'self' http://localhost:* ws://localhost:*;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: clipit-thumb: clipit-image:; media-src 'self' blob: clipit-video:; connect-src 'self';"
        ]
      }
    })
  })

  registerProtocols()
  registerIpcHandlers()
  Menu.setApplicationMenu(null)
  createWindow()

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await tunnelService.stop()
})
