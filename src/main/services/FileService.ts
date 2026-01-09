import fs from 'fs'
import { deleteThumbnailCache } from './ThumbnailService'
import { safeUnlink } from '../utils/safeFileOps'

/**
 * Delete a file and its cached thumbnail
 */
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File not found' }
  }

  try {
    // Use safe delete with retry logic for locked files
    await safeUnlink(filePath)
    deleteThumbnailCache(filePath)
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
