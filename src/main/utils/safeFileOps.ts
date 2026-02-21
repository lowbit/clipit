import fs from 'fs'
import path from 'path'

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  backoffMultiplier?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  retryDelay: 100,
  backoffMultiplier: 1.5
}

/**
 * Check if an error is a file lock/access error that should be retried
 */
function isRetryableError(error: any): boolean {
  if (!error || typeof error.code !== 'string') {
    return false
  }

  // Windows file lock errors
  const retryableCodes = ['EBUSY', 'EACCES', 'EPERM', 'EMFILE', 'ENFILE']
  return retryableCodes.includes(error.code)
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a file operation with retry logic for lock/access errors
 */
async function withRetry<T>(
  operation: () => T,
  options: RetryOptions = {},
  _operationName: string = 'file operation'
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: any
  let delay = opts.retryDelay

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return operation()
    } catch (error) {
      lastError = error

      if (!isRetryableError(error) || attempt === opts.maxRetries) {
        throw error
      }

      await sleep(delay)
      delay = Math.min(delay * opts.backoffMultiplier, 5000)
    }
  }

  throw lastError
}

/**
 * Safely delete a file with retry logic for lock errors
 */
export async function safeUnlink(
  filePath: string,
  options?: RetryOptions
): Promise<void> {
  await withRetry(
    () => fs.unlinkSync(filePath),
    options,
    `Delete file: ${path.basename(filePath)}`
  )
}

/**
 * Safely copy a file with retry logic for lock errors
 */
export async function safeCopyFile(
  sourcePath: string,
  destPath: string,
  options?: RetryOptions
): Promise<void> {
  await withRetry(
    () => fs.copyFileSync(sourcePath, destPath),
    options,
    `Copy file: ${path.basename(sourcePath)} -> ${path.basename(destPath)}`
  )
}

/**
 * Safely rename a file with retry logic for lock errors
 */
export async function safeRename(
  oldPath: string,
  newPath: string,
  options?: RetryOptions
): Promise<void> {
  await withRetry(
    () => fs.renameSync(oldPath, newPath),
    options,
    `Rename file: ${path.basename(oldPath)} -> ${path.basename(newPath)}`
  )
}

/**
 * Atomically replace a file by:
 * 1. Creating temp file with new content
 * 2. Renaming temp to target (atomic on most systems)
 *
 * This avoids the dangerous pattern of: delete original -> rename temp
 * If the process crashes, we never lose the original file.
 */
export async function atomicFileReplace(
  targetPath: string,
  tempPath: string,
  options?: RetryOptions
): Promise<void> {
  // Verify temp file exists
  if (!fs.existsSync(tempPath)) {
    throw new Error(`Temp file not found: ${tempPath}`)
  }

  // On Windows, fs.rename() will fail if target exists
  // We need to delete the target first, but we'll do it atomically
  // by renaming target to a backup, then renaming temp to target

  if (process.platform === 'win32') {
    // Windows-specific atomic replace
    const backupPath = `${targetPath}.backup_${Date.now()}`

    try {
      // Step 1: Rename original to backup (atomic)
      if (fs.existsSync(targetPath)) {
        await safeRename(targetPath, backupPath, options)
      }

      // Step 2: Rename temp to original (atomic)
      await safeRename(tempPath, targetPath, options)

      // Step 3: Delete backup (best effort, don't fail if this errors)
      try {
        if (fs.existsSync(backupPath)) {
          await safeUnlink(backupPath, { maxRetries: 1, retryDelay: 50 })
        }
      } catch (error) {
        // Silently ignore backup deletion failure
      }
    } catch (error) {
      // If rename of temp failed, try to restore backup
      if (fs.existsSync(backupPath) && !fs.existsSync(targetPath)) {
        try {
          fs.renameSync(backupPath, targetPath)
        } catch (restoreError) {
          // Silently fail restore
        }
      }
      throw error
    }
  } else {
    // Unix/Linux: rename is atomic even if target exists
    await safeRename(tempPath, targetPath, options)
  }
}

/**
 * Check if a file is currently locked/in-use
 * Returns true if file is locked, false if accessible
 */
export function isFileLocked(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false
  }

  try {
    // Try to open file in read-write mode
    const fd = fs.openSync(filePath, 'r+')
    fs.closeSync(fd)
    return false
  } catch (error: any) {
    if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EPERM') {
      return true
    }
    return false
  }
}

/**
 * Wait until a file is no longer locked (with timeout)
 */
export async function waitForFileUnlock(
  filePath: string,
  timeoutMs: number = 10000,
  checkIntervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (!isFileLocked(filePath)) {
      return true
    }
    await sleep(checkIntervalMs)
  }

  return false
}
