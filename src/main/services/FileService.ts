import fs from 'fs'
import path from 'path'
import { shell } from 'electron'
import { deleteThumbnailCache } from './ThumbnailService'
import { safeUnlink } from '../utils/safeFileOps'
import { settingsStore } from '../store/SettingsStore'

/**
 * Delete a file, its cached thumbnail, and any encoded versions
 */
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File not found' }
  }

  try {
    // Use safe delete with retry logic for locked files
    await safeUnlink(filePath)
    deleteThumbnailCache(filePath)

    // Delete encoded versions if they exist
    await deleteEncodedVersions(filePath)

    return { success: true }
  } catch (error: any) {
    // Provide more helpful error messages for common file access issues
    let errorMessage = String(error)
    if (error.code === 'EBUSY') {
      errorMessage = 'File is currently in use. Please close any programs using this file and try again.'
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      errorMessage = 'Permission denied. The file may be locked by another process.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete encoded versions and shared copies of a file
 * Checks both the original file directory and the shareDir
 */
async function deleteEncodedVersions(originalPath: string): Promise<void> {
  const parsed = path.parse(originalPath)
  const encodedName = `${parsed.name}_encoded.mp4`
  const originalName = parsed.base

  // Check in the same directory as the original file
  const encodedInSameDir = path.join(parsed.dir, encodedName)
  if (fs.existsSync(encodedInSameDir)) {
    try {
      await safeUnlink(encodedInSameDir)
      deleteThumbnailCache(encodedInSameDir)
    } catch (error) {
      // Silently fail - don't block deletion of original file
      console.error(`Failed to delete encoded version: ${encodedInSameDir}`, error)
    }
  }

  // Check in shareDir if configured
  const shareDir = settingsStore.get('shareDir')
  if (shareDir && fs.existsSync(shareDir)) {
    // Delete encoded version in shareDir
    const encodedInShareDir = path.join(shareDir, encodedName)
    if (fs.existsSync(encodedInShareDir)) {
      try {
        await safeUnlink(encodedInShareDir)
        deleteThumbnailCache(encodedInShareDir)
      } catch (error) {
        console.error(`Failed to delete encoded version: ${encodedInShareDir}`, error)
      }
    }

    // Delete shared copy in shareDir (non-encoded version)
    const sharedCopy = path.join(shareDir, originalName)
    if (fs.existsSync(sharedCopy) && sharedCopy !== originalPath) {
      try {
        await safeUnlink(sharedCopy)
        deleteThumbnailCache(sharedCopy)
      } catch (error) {
        console.error(`Failed to delete shared copy: ${sharedCopy}`, error)
      }
    }
  }
}

/**
 * Rename a file
 */
export async function renameFile(oldPath: string, newName: string): Promise<{ success: boolean; error?: string; newPath?: string }> {
  if (!fs.existsSync(oldPath)) {
    return { success: false, error: 'File not found' }
  }

  try {
    const dir = path.dirname(oldPath)
    const ext = path.extname(oldPath)
    const nameWithoutExt = newName.replace(new RegExp(ext + '$'), '')
    const newPath = path.join(dir, nameWithoutExt + ext)

    // Check if target already exists
    if (fs.existsSync(newPath) && newPath !== oldPath) {
      return { success: false, error: 'A file with this name already exists' }
    }

    fs.renameSync(oldPath, newPath)

    // Update thumbnail cache
    deleteThumbnailCache(oldPath)

    return { success: true, newPath }
  } catch (error: any) {
    let errorMessage = String(error)
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      errorMessage = 'Permission denied. Cannot rename file.'
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Show file in system file explorer
 */
export function showInExplorer(filePath: string): { success: boolean; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File not found' }
  }

  try {
    shell.showItemInFolder(filePath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: String(error) }
  }
}
