import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Get the path to the bundled cloudflared executable
 */
export function getCloudflaredPath(): string {
  const platform = process.platform === 'win32' ? 'win32' : 'linux'
  const ext = process.platform === 'win32' ? '.exe' : ''
  const binaryName = `cloudflared${ext}`

  // In development
  if (!app.isPackaged) {
    const devPath = path.join(__dirname, '../../../resources/cloudflared', platform, binaryName)
    if (fs.existsSync(devPath)) {
      return devPath
    }
    // Fallback to project root
    return path.join(process.cwd(), 'resources/cloudflared', platform, binaryName)
  }

  // In production (packaged app)
  return path.join(process.resourcesPath, 'cloudflared', platform, binaryName)
}

/**
 * Check if cloudflared binary exists
 */
export function cloudflaredExists(): boolean {
  try {
    const cloudflaredPath = getCloudflaredPath()
    return fs.existsSync(cloudflaredPath)
  } catch {
    return false
  }
}
