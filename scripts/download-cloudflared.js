const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const CLOUDFLARED_VERSION = '2024.12.2'

const URLS = {
  win32: `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-windows-amd64.exe`,
  linux: `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-amd64`
}

const resourcesDir = path.join(__dirname, '..', 'resources', 'cloudflared')

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

async function downloadForPlatform(platform) {
  const platformDir = path.join(resourcesDir, platform)

  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true })
  }

  const ext = platform === 'win32' ? '.exe' : ''
  const binaryPath = path.join(platformDir, `cloudflared${ext}`)

  if (fs.existsSync(binaryPath)) {
    console.log(`cloudflared already exists for ${platform}`)
    return
  }

  const url = URLS[platform]

  try {
    await downloadFile(url, binaryPath)

    if (platform === 'linux') {
      fs.chmodSync(binaryPath, 0o755)
    }

    console.log(`cloudflared downloaded for ${platform}`)
  } catch (error) {
    console.error(`Failed to download for ${platform}:`, error.message)
    throw error
  }
}

async function main() {
  console.log('Cloudflared Download Script')
  console.log('===========================\n')

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
    console.log(`\nDownloading cloudflared for ${platform}...`)
    try {
      await downloadForPlatform(platform)
    } catch (error) {
      console.error(`Failed to download for ${platform}:`, error.message)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
