import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Get the path to the bundled FFmpeg executable
 */
export function getFFmpegPath(): string {
  const platform = process.platform === 'win32' ? 'win32' : 'linux'
  const ext = process.platform === 'win32' ? '.exe' : ''
  const binaryName = `ffmpeg${ext}`

  // In development
  if (!app.isPackaged) {
    const devPath = path.join(__dirname, '../../../resources/ffmpeg', platform, binaryName)
    if (fs.existsSync(devPath)) {
      return devPath
    }
    // Fallback to project root
    return path.join(process.cwd(), 'resources/ffmpeg', platform, binaryName)
  }

  // In production (packaged app)
  return path.join(process.resourcesPath, 'ffmpeg', platform, binaryName)
}

/**
 * Get the path to the bundled FFprobe executable
 */
export function getFFprobePath(): string {
  const platform = process.platform === 'win32' ? 'win32' : 'linux'
  const ext = process.platform === 'win32' ? '.exe' : ''
  const binaryName = `ffprobe${ext}`

  // In development
  if (!app.isPackaged) {
    const devPath = path.join(__dirname, '../../../resources/ffmpeg', platform, binaryName)
    if (fs.existsSync(devPath)) {
      return devPath
    }
    // Fallback to project root
    return path.join(process.cwd(), 'resources/ffmpeg', platform, binaryName)
  }

  // In production (packaged app)
  return path.join(process.resourcesPath, 'ffmpeg', platform, binaryName)
}

/**
 * Check if FFmpeg binaries exist
 */
export function ffmpegExists(): boolean {
  try {
    const ffmpegPath = getFFmpegPath()
    const ffprobePath = getFFprobePath()
    return fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)
  } catch {
    return false
  }
}
