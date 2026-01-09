import fs from 'fs'
import path from 'path'
import { settingsStore } from '../store/SettingsStore'
import { encodeVideo } from './EncodeService'
import { tunnelService } from './TunnelService'
import { safeCopyFile, safeUnlink } from '../utils/safeFileOps'
import type { ShareRequest, ShareResult } from '../../shared/types'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../../shared/types'

/**
 * Share a media file (copy to share folder if set, optionally encode)
 * Always shares via Cloudflare Tunnel
 *
 * Behavior:
 * - If shareDir IS set:
 *   - Always copy/encode files to shareDir
 * - If shareDir is NOT set:
 *   - If NOT encoding: Share original file from its location
 *   - If encoding: Put encoded file next to original file
 */
export async function shareMedia(request: ShareRequest): Promise<ShareResult> {
  const { path: sourcePath, encode, codec, quality, fps, resolution } = request

  if (!fs.existsSync(sourcePath)) {
    return { success: false, error: 'File not found' }
  }

  const shareDir = settingsStore.get('shareDir')
  const sourceParsed = path.parse(sourcePath)
  let outputName: string
  let sharePath: string
  let outputDir: string

  const fileExt = sourceParsed.ext.toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(fileExt)
  const isVideo = VIDEO_EXTENSIONS.includes(fileExt)

  // Images cannot be encoded - ignore encode flag for images
  const shouldEncode = encode && isVideo

  if (shareDir) {
    outputDir = shareDir

    if (!fs.existsSync(shareDir)) {
      try {
        fs.mkdirSync(shareDir, { recursive: true })
      } catch (error) {
        return { success: false, error: `Failed to create share directory: ${error}` }
      }
    }
  } else {
    outputDir = sourceParsed.dir
  }

  if (shouldEncode) {
    outputName = `${sourceParsed.name}_encoded.mp4`
    sharePath = path.join(outputDir, outputName)

    const result = await encodeVideo(sourcePath, sharePath, {
      codec: codec || 'h264',
      quality: quality || 'medium',
      fps: fps || 'original',
      resolution: resolution || 'original',
      preferredEncoder: settingsStore.get('preferredEncoder')
    })

    if (!result.success) {
      // Clean up failed encode
      if (fs.existsSync(sharePath)) {
        try {
          await safeUnlink(sharePath, { maxRetries: 2 })
        } catch (error) {
          // Silently fail cleanup
        }
      }
      return { success: false, error: result.error }
    }
  } else {
    outputName = sourceParsed.base
    sharePath = path.join(outputDir, outputName)

    if (shareDir) {
      if (fs.existsSync(sharePath) && sharePath !== sourcePath) {
        const stats = fs.statSync(sharePath)

        const tunnelInfo = await tunnelService.start()
        if (!tunnelInfo.isActive) {
          return { success: false, error: 'Failed to start server' }
        }

        const fileUrl = tunnelService.getFileUrl(outputName)
        if (!fileUrl) {
          return { success: false, error: 'Failed to get share URL' }
        }

        return {
          success: true,
          shareUrl: fileUrl,
          sharePath,
          alreadyShared: true,
          encoded: false,
          sizeMb: Math.round(stats.size / (1024 * 1024) * 10) / 10
        }
      }

      // Copy file to share directory with retry logic for locked files
      if (sharePath !== sourcePath) {
        try {
          await safeCopyFile(sourcePath, sharePath)
        } catch (error) {
          return { success: false, error: `Failed to copy file: ${error}` }
        }
      }
    } else {
      sharePath = sourcePath
    }
  }

  const stats = fs.statSync(sharePath)

  const tunnelInfo = await tunnelService.start()
  if (!tunnelInfo.isActive) {
    return { success: false, error: 'Failed to start server' }
  }

  // Determine the filename/path for the URL
  // If shareDir is not set, need to calculate relative path from recordingsDir
  let urlFileName = outputName
  if (!shareDir) {
    const recordingsDir = settingsStore.get('recordingsDir')
    if (recordingsDir) {
      // Calculate relative path from recordingsDir to sharePath
      const relativePath = path.relative(recordingsDir, sharePath)
      urlFileName = relativePath.replace(/\\/g, '/') // Use forward slashes for URLs
    }
  }

  const fileUrl = tunnelService.getFileUrl(urlFileName)
  if (!fileUrl) {
    return { success: false, error: 'Failed to get share URL' }
  }

  return {
    success: true,
    shareUrl: fileUrl,
    sharePath,
    alreadyShared: false,
    encoded: !!shouldEncode,
    sizeMb: Math.round(stats.size / (1024 * 1024) * 10) / 10
  }
}
