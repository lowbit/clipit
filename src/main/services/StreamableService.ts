import https from 'https'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { BrowserWindow } from 'electron'
import type { UploadProgress } from '../../shared/types'

interface StreamableUploadResult {
  success: boolean
  shortcode?: string
  error?: string
}

class StreamableService {
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private sendProgress(progress: UploadProgress) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('upload-progress', progress)
    }
  }

  async upload(filePath: string, username: string, password: string): Promise<StreamableUploadResult> {
    return new Promise((resolve) => {
      const fileName = path.basename(filePath)
      const fileSize = fs.statSync(filePath).size
      const boundary = `----ClipitBoundary${crypto.randomBytes(16).toString('hex')}`

      // Build multipart form data parts
      const prefix = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`
      )
      const suffix = Buffer.from(`\r\n--${boundary}--\r\n`)
      const totalSize = prefix.length + fileSize + suffix.length

      const auth = Buffer.from(`${username}:${password}`).toString('base64')

      const options: https.RequestOptions = {
        hostname: 'api.streamable.com',
        path: '/upload',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalSize
        }
      }

      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const data = JSON.parse(body)
              if (!data.shortcode) {
                resolve({ success: false, error: 'Streamable returned an unexpected response (no shortcode)' })
                return
              }
              resolve({ success: true, shortcode: data.shortcode })
            } catch {
              resolve({ success: false, error: 'Invalid response from Streamable' })
            }
          } else if (res.statusCode === 401) {
            resolve({ success: false, error: 'Invalid username or password. Check your credentials in Settings > Accounts.' })
          } else if (res.statusCode === 403) {
            resolve({ success: false, error: 'Access denied. Your Streamable account may be restricted or the credentials are incorrect.' })
          } else if (res.statusCode === 404) {
            resolve({ success: false, error: 'Streamable account not found. Check your username in Settings > Accounts.' })
          } else if (res.statusCode === 413) {
            resolve({ success: false, error: 'File too large for Streamable. Free accounts are limited to 250 MB. Try enabling encoding in Settings.' })
          } else if (res.statusCode && res.statusCode >= 500) {
            resolve({ success: false, error: 'Streamable servers are currently unavailable. Please try again later.' })
          } else {
            resolve({ success: false, error: `Streamable upload failed (HTTP ${res.statusCode})` })
          }
        })
      })

      req.on('error', (err) => {
        if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
          resolve({ success: false, error: 'Cannot reach Streamable. Check your internet connection.' })
        } else if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNRESET')) {
          resolve({ success: false, error: 'Connection to Streamable timed out. Please try again.' })
        } else {
          resolve({ success: false, error: `Upload failed: ${err.message}` })
        }
      })

      // Write prefix (multipart header)
      req.write(prefix)

      // Stream file with progress tracking
      let uploaded = prefix.length
      const fileStream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 })

      fileStream.on('data', (chunk: Buffer) => {
        const canContinue = req.write(chunk)
        uploaded += chunk.length

        this.sendProgress({
          percent: Math.round((uploaded / totalSize) * 100),
          uploadedMb: Math.round((uploaded / (1024 * 1024)) * 10) / 10,
          totalMb: Math.round((totalSize / (1024 * 1024)) * 10) / 10
        })

        // Handle backpressure
        if (!canContinue) {
          fileStream.pause()
          req.once('drain', () => fileStream.resume())
        }
      })

      fileStream.on('end', () => {
        req.end(suffix)
      })

      fileStream.on('error', (err) => {
        req.destroy()
        resolve({ success: false, error: `Failed to read file: ${err.message}` })
      })
    })
  }
}

export const streamableService = new StreamableService()
