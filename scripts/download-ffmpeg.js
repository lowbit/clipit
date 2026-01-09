const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const FFMPEG_VERSION = 'n8.0.1'

const URLS = {
  win32: `https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-${FFMPEG_VERSION}-win64-gpl.zip`,
  linux: `https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-${FFMPEG_VERSION}-linux64-gpl.tar.xz`
}

const FALLBACK_URLS = {
  win32: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
  linux: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
}

const resourcesDir = path.join(__dirname, '..', 'resources', 'ffmpeg')

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`)

    const file = fs.createWriteStream(destPath)

    const request = (url, redirectCount = 0) => {
      if (redirectCount > 10) {
        reject(new Error('Too many redirects'))
        return
      }

      const protocol = url.startsWith('https') ? https : require('http')

      protocol.get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          let redirectUrl = response.headers.location
          if (!redirectUrl.startsWith('http')) {
            const urlObj = new URL(url)
            redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`
          }
          console.log(`Redirecting to: ${redirectUrl}`)
          request(redirectUrl, redirectCount + 1)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }

        const total = parseInt(response.headers['content-length'], 10)
        let downloaded = 0

        response.on('data', (chunk) => {
          downloaded += chunk.length
          if (total) {
            const percent = Math.round((downloaded / total) * 100)
            process.stdout.write(`\rProgress: ${percent}%`)
          }
        })

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          console.log('\nDownload complete')
          resolve()
        })
      }).on('error', (err) => {
        fs.unlink(destPath, () => {})
        reject(err)
      })
    }

    request(url)
  })
}

async function extractZip(zipPath, destDir) {
  console.log('Extracting ZIP...')

  if (process.platform === 'win32') {
    execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`)
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`)
  }
}

async function extractTarXz(tarPath, destDir) {
  console.log('Extracting tar.xz...')
  execSync(`tar -xf "${tarPath}" -C "${destDir}"`)
}

async function downloadForPlatform(platform) {
  const platformDir = path.join(resourcesDir, platform)

  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true })
  }

  const ext = platform === 'win32' ? '.exe' : ''
  const ffmpegPath = path.join(platformDir, `ffmpeg${ext}`)
  const ffprobePath = path.join(platformDir, `ffprobe${ext}`)

  if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
    console.log(`FFmpeg already exists for ${platform}`)
    return
  }

  const tempDir = path.join(resourcesDir, 'temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const url = FALLBACK_URLS[platform]
  const archiveExt = platform === 'win32' ? '.zip' : '.tar.xz'
  const archivePath = path.join(tempDir, `ffmpeg-${platform}${archiveExt}`)

  try {
    await downloadFile(url, archivePath)

    const extractDir = path.join(tempDir, platform)
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true })
    }

    if (platform === 'win32') {
      await extractZip(archivePath, extractDir)
    } else {
      await extractTarXz(archivePath, extractDir)
    }

    console.log('Locating binaries...')
    const binFiles = findBinaries(extractDir, platform)

    if (binFiles.ffmpeg) {
      fs.copyFileSync(binFiles.ffmpeg, ffmpegPath)
      console.log(`Copied ffmpeg to ${ffmpegPath}`)
    }

    if (binFiles.ffprobe) {
      fs.copyFileSync(binFiles.ffprobe, ffprobePath)
      console.log(`Copied ffprobe to ${ffprobePath}`)
    }

    if (platform === 'linux') {
      fs.chmodSync(ffmpegPath, 0o755)
      fs.chmodSync(ffprobePath, 0o755)
    }

    console.log(`FFmpeg downloaded for ${platform}`)
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }
}

function findBinaries(dir, platform) {
  const ext = platform === 'win32' ? '.exe' : ''
  const result = { ffmpeg: null, ffprobe: null }

  function search(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        search(fullPath)
      } else if (entry.isFile()) {
        if (entry.name === `ffmpeg${ext}`) {
          result.ffmpeg = fullPath
        } else if (entry.name === `ffprobe${ext}`) {
          result.ffprobe = fullPath
        }
      }
    }
  }

  search(dir)
  return result
}

async function main() {
  console.log('FFmpeg Download Script')
  console.log('======================\n')

  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true })
  }

  const args = process.argv.slice(2)
  let platforms = ['win32', 'linux']

  if (args.includes('--win') || args.includes('--windows')) {
    platforms = ['win32']
  } else if (args.includes('--linux')) {
    platforms = ['linux']
  } else if (args.includes('--current')) {
    platforms = [process.platform === 'win32' ? 'win32' : 'linux']
  }

  for (const platform of platforms) {
    console.log(`\nDownloading FFmpeg for ${platform}...`)
    try {
      await downloadForPlatform(platform)
    } catch (error) {
      console.error(`Failed to download for ${platform}:`, error.message)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
