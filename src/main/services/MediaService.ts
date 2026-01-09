import fs from 'fs'
import path from 'path'
import { settingsStore } from '../store/SettingsStore'
import { getVideoDuration, getVideoCodec, getImageDimensions } from './FFmpegService'
import { VIDEO_EXTENSIONS, IMAGE_EXTENSIONS } from '../../shared/types'
import type { Game, Clip, ClipInfo } from '../../shared/types'

/**
 * Get all media files from the recordings directory
 */
export function getMediaFiles(): Clip[] {
  const recordingsDir = settingsStore.get('recordingsDir')
  if (!recordingsDir || !fs.existsSync(recordingsDir)) {
    return []
  }

  const media: Clip[] = []
  const allExtensions = [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]

  function scanDirectory(dir: string, gameName: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        scanDirectory(fullPath, entry.name)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()

        // Skip thumbnail cache files
        if (entry.name.endsWith('.thumb.jpg')) continue

        // Skip JPEGs that are thumbnails for videos
        if (ext === '.jpg' || ext === '.jpeg') {
          const baseName = path.basename(entry.name, ext)
          const hasVideo = VIDEO_EXTENSIONS.some(videoExt =>
            fs.existsSync(path.join(dir, baseName + videoExt))
          )
          if (hasVideo) continue
        }

        if (allExtensions.includes(ext)) {
          try {
            const stats = fs.statSync(fullPath)
            const fileType = VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image'

            media.push({
              path: fullPath,
              name: entry.name,
              game: gameName,
              type: fileType,
              sizeMb: Math.round(stats.size / (1024 * 1024) * 10) / 10,
              modified: stats.mtimeMs,
              modifiedStr: new Date(stats.mtimeMs).toLocaleString('sv-SE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }).replace(',', '')
            })
          } catch {
          }
        }
      }
    }
  }

  const entries = fs.readdirSync(recordingsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      scanDirectory(path.join(recordingsDir, entry.name), entry.name)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()

      // Skip thumbnail cache files
      if (entry.name.endsWith('.thumb.jpg')) continue

      // Skip JPEGs that are thumbnails for videos
      if (ext === '.jpg' || ext === '.jpeg') {
        const baseName = path.basename(entry.name, ext)
        const hasVideo = VIDEO_EXTENSIONS.some(videoExt =>
          fs.existsSync(path.join(recordingsDir, baseName + videoExt))
        )
        if (hasVideo) continue
      }

      if ([...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS].includes(ext)) {
        const fullPath = path.join(recordingsDir, entry.name)
        try {
          const stats = fs.statSync(fullPath)
          const fileType = VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image'

          media.push({
            path: fullPath,
            name: entry.name,
            game: 'Uncategorized',
            type: fileType,
            sizeMb: Math.round(stats.size / (1024 * 1024) * 10) / 10,
            modified: stats.mtimeMs,
            modifiedStr: new Date(stats.mtimeMs).toLocaleString('sv-SE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }).replace(',', '')
          })
        } catch {
        }
      }
    }
  }

  media.sort((a, b) => b.modified - a.modified)
  return media
}

/**
 * Get list of games (folders) with clip counts
 */
export function getGames(): Game[] {
  const recordingsDir = settingsStore.get('recordingsDir')
  if (!recordingsDir || !fs.existsSync(recordingsDir)) {
    return []
  }

  const games: Game[] = []
  const allExtensions = [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]

  const entries = fs.readdirSync(recordingsDir, { withFileTypes: true })

  let rootCount = 0
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()

      // Skip thumbnail cache files
      if (entry.name.endsWith('.thumb.jpg')) continue

      // Skip JPEGs that are thumbnails for videos
      if (ext === '.jpg' || ext === '.jpeg') {
        const baseName = path.basename(entry.name, ext)
        const hasVideo = VIDEO_EXTENSIONS.some(videoExt =>
          fs.existsSync(path.join(recordingsDir, baseName + videoExt))
        )
        if (hasVideo) continue
      }

      if (allExtensions.includes(ext)) {
        rootCount++
      }
    }
  }

  if (rootCount > 0) {
    games.push({ name: 'Uncategorized', count: rootCount })
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderPath = path.join(recordingsDir, entry.name)

      let count = 0
      try {
        const files = fs.readdirSync(folderPath)
        for (const file of files) {
          const ext = path.extname(file).toLowerCase()
          if (allExtensions.includes(ext) && !file.endsWith('.thumb.jpg')) {
            count++
          }
        }
      } catch {
      }

      if (count > 0) {
        games.push({ name: entry.name, count })
      }
    }
  }

  games.sort((a, b) => a.name.localeCompare(b.name))
  return games
}

/**
 * Get clips for a specific game (or all if no game specified)
 */
export function getClips(game?: string): Clip[] {
  const allClips = getMediaFiles()

  if (game) {
    return allClips.filter(clip => clip.game === game)
  }

  return allClips
}

/**
 * Get detailed info about a clip
 */
export async function getClipInfo(filePath: string): Promise<ClipInfo> {
  const ext = path.extname(filePath).toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(ext)

  if (isImage) {
    const { width, height } = await getImageDimensions(filePath)
    return {
      type: 'image',
      width,
      height
    }
  }

  const duration = await getVideoDuration(filePath)
  const codec = await getVideoCodec(filePath)

  return {
    type: 'video',
    duration,
    codec: codec || undefined
  }
}
