import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { getFFmpegPath, ffmpegExists } from '../utils/ffmpegBinary'
import { deleteThumbnailCache } from './ThumbnailService'
import { atomicFileReplace, safeUnlink } from '../utils/safeFileOps'
import type { TrimResult } from '../../shared/types'

/**
 * Trim a video file and either overwrite the original or save as a copy
 */
export async function trimVideo(
  sourcePath: string,
  startTime: number,
  endTime: number,
  saveAsCopy: boolean = false
): Promise<TrimResult> {
  if (!ffmpegExists()) {
    return { success: false, error: 'FFmpeg not found. Please run: npm run download-ffmpeg' }
  }

  if (!fs.existsSync(sourcePath)) {
    return { success: false, error: 'Source file not found' }
  }

  const parsed = path.parse(sourcePath)

  let outputPath: string
  if (saveAsCopy) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    outputPath = path.join(parsed.dir, `${parsed.name}_trimmed_${timestamp}${parsed.ext}`)
  } else {
    outputPath = path.join(parsed.dir, `_temp_trim_${parsed.base}`)
  }

  // Build ffmpeg command (stream copy for speed, no re-encoding)
  const duration = endTime - startTime
  const cmd = [
    '-ss', String(startTime),
    '-i', sourcePath,
    '-to', String(duration),
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    outputPath
  ]

  return new Promise((resolve) => {
    const ffmpegPath = getFFmpegPath()
    const process = spawn(ffmpegPath, cmd)

    let stderr = ''

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', async (code) => {
      if (code !== 0) {
        if (fs.existsSync(outputPath)) {
          try {
            await safeUnlink(outputPath, { maxRetries: 2 })
          } catch (error) {
            // Silently fail cleanup
          }
        }
        resolve({ success: false, error: `FFmpeg error: ${stderr}` })
        return
      }

      try {
        let finalPath: string

        if (saveAsCopy) {
          finalPath = outputPath
        } else {
          // Atomically replace original with trimmed version
          // This avoids the dangerous pattern: delete original -> rename temp
          // If process crashes, we never lose the original file
          await atomicFileReplace(sourcePath, outputPath)
          finalPath = sourcePath

          // Delete cached thumbnail (original video content changed)
          deleteThumbnailCache(sourcePath)
        }

        const stats = fs.statSync(finalPath)
        resolve({
          success: true,
          output: finalPath,
          sizeMb: Math.round(stats.size / (1024 * 1024) * 10) / 10,
          savedAsCopy: saveAsCopy
        })
      } catch (error) {
        if (fs.existsSync(outputPath)) {
          try {
            await safeUnlink(outputPath, { maxRetries: 2 })
          } catch (cleanupError) {
            // Silently fail cleanup
          }
        }
        resolve({ success: false, error: String(error) })
      }
    })

    process.on('error', async (error) => {
      if (fs.existsSync(outputPath)) {
        try {
          await safeUnlink(outputPath, { maxRetries: 2 })
        } catch (cleanupError) {
          // Silently fail cleanup
        }
      }
      resolve({ success: false, error: String(error) })
    })
  })
}
