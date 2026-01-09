import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { getCloudflaredPath, cloudflaredExists } from '../utils/cloudflaredBinary'
import { settingsStore } from '../store/SettingsStore'

interface TunnelInfo {
  url: string
  isActive: boolean
  port: number
}

class TunnelService {
  private server: http.Server | null = null
  private cloudflaredProcess: ChildProcess | null = null
  private port: number = 8765
  private isRunning: boolean = false
  private publicUrl: string = ''

  /**
   * Start the HTTP server and create a tunnel
   */
  async start(): Promise<TunnelInfo> {
    if (this.isRunning) {
      return this.getInfo()
    }

    await this.startServer()
    await this.createTunnel()

    this.isRunning = true

    return this.getInfo()
  }

  /**
   * Start HTTP server to serve files from share directory (or recordings directory as fallback)
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const settings = settingsStore.getAll()
      // Use shareDir if set, otherwise fall back to recordingsDir
      const serveDir = settings.shareDir || settings.recordingsDir

      if (!serveDir) {
        reject(new Error('No directory configured for sharing (share or recordings directory required)'))
        return
      }

      this.server = http.createServer((req, res) => {
        try {
          const urlPath = decodeURIComponent(req.url || '/')
          const filename = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath

          // Handle root path or empty filename - show friendly message
          if (!filename || filename === '' || urlPath === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Clipit Share</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    color: #f5f5f5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                  }
                  .container {
                    text-align: center;
                    padding: 40px;
                    max-width: 500px;
                  }
                  h1 {
                    font-size: 72px;
                    margin: 0 0 20px 0;
                    color: #f4c430;
                  }
                  h2 {
                    font-size: 24px;
                    margin: 0 0 16px 0;
                    font-weight: 600;
                  }
                  p {
                    font-size: 16px;
                    color: #888;
                    line-height: 1.6;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📎</h1>
                  <h2>Wrong or Outdated Link</h2>
                  <p>This link doesn't point to a valid file. Please check the URL or request a new share link.</p>
                </div>
              </body>
              </html>
            `)
            return
          }

          const filePath = path.join(serveDir, filename)

          // Security: Ensure the path is within serveDir
          const resolvedPath = path.resolve(filePath)
          const resolvedServeDir = path.resolve(serveDir)

          if (!resolvedPath.startsWith(resolvedServeDir)) {
            res.writeHead(403, { 'Content-Type': 'text/html' })
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Access Denied</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    color: #f5f5f5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                  }
                  .container {
                    text-align: center;
                    padding: 40px;
                    max-width: 500px;
                  }
                  h1 {
                    font-size: 72px;
                    margin: 0 0 20px 0;
                    color: #ef4444;
                  }
                  h2 {
                    font-size: 24px;
                    margin: 0 0 16px 0;
                    font-weight: 600;
                  }
                  p {
                    font-size: 16px;
                    color: #888;
                    line-height: 1.6;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🚫</h1>
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this resource.</p>
                </div>
              </body>
              </html>
            `)
            return
          }

          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/html' })
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>File Not Found</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    color: #f5f5f5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                  }
                  .container {
                    text-align: center;
                    padding: 40px;
                    max-width: 500px;
                  }
                  h1 {
                    font-size: 72px;
                    margin: 0 0 20px 0;
                    color: #f4c430;
                  }
                  h2 {
                    font-size: 24px;
                    margin: 0 0 16px 0;
                    font-weight: 600;
                  }
                  p {
                    font-size: 16px;
                    color: #888;
                    line-height: 1.6;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📎</h1>
                  <h2>Wrong or Outdated Link</h2>
                  <p>This file no longer exists or the link has expired. Please request a new share link.</p>
                </div>
              </body>
              </html>
            `)
            return
          }

          const stats = fs.statSync(filePath)
          const ext = path.extname(filePath).toLowerCase()
          const mimeTypes: Record<string, string> = {
            '.mp4': 'video/mp4',
            '.mkv': 'video/x-matroska',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.webm': 'video/webm',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp'
          }
          const mimeType = mimeTypes[ext] || 'application/octet-stream'

          // Handle range requests for video streaming
          const range = req.headers.range

          if (range) {
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
            const chunkSize = (end - start) + 1

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${stats.size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize,
              'Content-Type': mimeType
            })

            const stream = fs.createReadStream(filePath, { start, end })
            stream.pipe(res)
          } else {
            res.writeHead(200, {
              'Content-Length': stats.size,
              'Content-Type': mimeType,
              'Accept-Ranges': 'bytes'
            })

            const stream = fs.createReadStream(filePath)
            stream.pipe(res)
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Error</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                  color: #f5f5f5;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                }
                .container {
                  text-align: center;
                  padding: 40px;
                  max-width: 500px;
                }
                h1 {
                  font-size: 72px;
                  margin: 0 0 20px 0;
                  color: #ef4444;
                }
                h2 {
                  font-size: 24px;
                  margin: 0 0 16px 0;
                  font-weight: 600;
                }
                p {
                  font-size: 16px;
                  color: #888;
                  line-height: 1.6;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>⚠️</h1>
                <h2>Something Went Wrong</h2>
                <p>An error occurred while processing your request. Please try again later.</p>
              </div>
            </body>
            </html>
          `)
        }
      })

      this.server.on('error', (error) => {
        reject(error)
      })

      this.server.listen(this.port, () => {
        resolve()
      })
    })
  }

  /**
   * Create Cloudflare tunnel to expose the server
   */
  private async createTunnel(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!cloudflaredExists()) {
          reject(new Error('cloudflared binary not found. Please run: node scripts/download-cloudflared.js'))
          return
        }

        const cloudflaredPath = getCloudflaredPath()

        // Spawn cloudflared with Quick Tunnel mode (no auth required!)
        this.cloudflaredProcess = spawn(cloudflaredPath, [
          'tunnel',
          '--url', `http://localhost:${this.port}`
        ])

        let hasResolved = false

        this.cloudflaredProcess.stdout?.on('data', (data) => {
          const output = data.toString()

          // Look for the trycloudflare.com URL in the output
          // Example: "https://random-name.trycloudflare.com"
          const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
          if (urlMatch && !hasResolved) {
            this.publicUrl = urlMatch[0]
            hasResolved = true
            resolve()
          }
        })

        this.cloudflaredProcess.stderr?.on('data', (data) => {
          const output = data.toString()

          // cloudflared outputs the URL to stderr, so we check here too
          const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
          if (urlMatch && !hasResolved) {
            this.publicUrl = urlMatch[0]
            hasResolved = true
            resolve()
          }
        })

        this.cloudflaredProcess.on('error', (error) => {
          if (!hasResolved) {
            reject(error)
          }
        })

        this.cloudflaredProcess.on('exit', () => {
          this.isRunning = false
          this.publicUrl = ''
        })

        // Timeout after 30 seconds if we don't get a URL
        setTimeout(() => {
          if (!hasResolved) {
            reject(new Error('Timeout waiting for cloudflared tunnel URL'))
          }
        }, 30000)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Get tunnel information
   */
  getInfo(): TunnelInfo {
    return {
      url: this.publicUrl || '',
      isActive: this.isRunning && this.cloudflaredProcess !== null,
      port: this.port
    }
  }

  /**
   * Get the public URL for a shared file
   */
  getFileUrl(filename: string): string | null {
    if (!this.cloudflaredProcess || !this.isRunning || !this.publicUrl) {
      return null
    }

    const encodedFilename = encodeURIComponent(filename)
    return `${this.publicUrl}/${encodedFilename}`
  }

  /**
   * Stop the server and close the tunnel
   */
  async stop(): Promise<void> {
    if (this.cloudflaredProcess) {
      try {
        this.cloudflaredProcess.kill()
      } catch (error) {
        // Silently handle error
      }
      this.cloudflaredProcess = null
      this.publicUrl = ''
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          resolve()
        })
      })
      this.server = null
    }

    this.isRunning = false
  }
}

export const tunnelService = new TunnelService()
