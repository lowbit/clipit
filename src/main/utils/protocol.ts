import { protocol } from 'electron'
import fs from 'fs'
import path from 'path'
import { getThumbnail } from '../services/ThumbnailService'

/**
 * Parse file path from custom protocol URL
 * URL format: clipit-video:///D:/folder/file.mp4
 * Returns: D:\folder\file.mp4 (on Windows)
 */
function parseFilePath(url: string, scheme: string): string {
  // Remove scheme (e.g., 'clipit-video:///')
  let filePath = url.replace(`${scheme}:///`, '')

  // Also handle variations like clipit-video:// (two slashes)
  if (filePath === url) {
    filePath = url.replace(`${scheme}://`, '')
  }

  // Also handle double slash format just in case
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1)
  }

  filePath = decodeURIComponent(filePath)

  // Fix Windows drive letter format: "d/path" -> "D:\path"
  if (process.platform === 'win32') {
    // Check if it looks like a drive letter (single letter followed by /)
    const driveMatch = filePath.match(/^([a-zA-Z])\//);
    if (driveMatch) {
      const driveLetter = driveMatch[1].toUpperCase()
      filePath = filePath.replace(/^[a-zA-Z]\//, `${driveLetter}:\\`)
    }
    filePath = filePath.replace(/\//g, '\\')
  }

  return filePath
}

/**
 * Register custom protocols for serving local files
 */
export function registerProtocols() {
  // Video streaming protocol with range request support
  protocol.handle('clipit-video', async (request) => {
    try {
      const filePath = parseFilePath(request.url, 'clipit-video')

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 })
      }

      const stats = fs.statSync(filePath)
      const fileSize = stats.size
      const rangeHeader = request.headers.get('Range')

      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm'
      }
      const mimeType = mimeTypes[ext] || 'video/mp4'

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (!match) {
          return new Response('Invalid range', { status: 416 })
        }

        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
        const length = end - start + 1

        const buffer = Buffer.alloc(length)
        const fd = fs.openSync(filePath, 'r')
        fs.readSync(fd, buffer, 0, length, start)
        fs.closeSync(fd)

        return new Response(buffer, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(length),
            'Content-Type': mimeType
          }
        })
      }

      const data = fs.readFileSync(filePath)
      return new Response(data, {
        headers: {
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize)
        }
      })
    } catch (error) {
      return new Response('Internal server error', { status: 500 })
    }
  })

  // Image serving protocol
  protocol.handle('clipit-image', async (request) => {
    try {
      const filePath = parseFilePath(request.url, 'clipit-image')

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 })
      }

      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp'
      }
      const mimeType = mimeTypes[ext] || 'image/jpeg'

      const data = fs.readFileSync(filePath)
      return new Response(data, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache'
        }
      })
    } catch (error) {
      return new Response('Internal server error', { status: 500 })
    }
  })

  // Thumbnail serving protocol
  protocol.handle('clipit-thumb', async (request) => {
    try {
      // Parse the URL to extract path and query params
      // URL format: clipit-thumb://D%3A%5CRecordings%5Cfile.mp4?time=5
      let urlStr = request.url
      let time = '5'

      // Extract time parameter if present
      const queryIndex = urlStr.indexOf('?')
      if (queryIndex !== -1) {
        const queryStr = urlStr.substring(queryIndex + 1)
        const params = new URLSearchParams(queryStr)
        time = params.get('time') || '5'
        urlStr = urlStr.substring(0, queryIndex)
      }

      const filePath = parseFilePath(urlStr, 'clipit-thumb')

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 })
      }

      const thumbnailData = await getThumbnail(filePath, parseFloat(time))

      if (!thumbnailData) {
        return new Response('', { status: 204 })
      }

      return new Response(new Uint8Array(thumbnailData), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'max-age=3600'
        }
      })
    } catch (error) {
      return new Response('Internal server error', { status: 500 })
    }
  })
}
