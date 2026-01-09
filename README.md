# Clipit

Desktop app for managing and sharing game clips. Organize recordings by game, trim videos, re-encode with hardware acceleration, and share via temporary public links.

## Features

- Browse recordings organized by game title
- Video trimming with frame-accurate preview
- Hardware-accelerated encoding (NVIDIA NVENC, AMD VCE, Intel QSV)
- Temporary public sharing with Cloudflare tunnels
- Auto-updates via GitHub releases
- Cross-platform (Windows, Linux)

## Installation

Download the latest release for your platform:

**Windows:** Run `Clipit Setup X.X.X.exe`
**Linux (AppImage):** `chmod +x Clipit-X.X.X.AppImage && ./Clipit-X.X.X.AppImage`
**Linux (DEB):** `sudo dpkg -i clipit_X.X.X_amd64.deb`

## Development

### Install dependencies
```bash
npm install
```

### Download required binaries
```bash
npm run download-ffmpeg
npm run download-cloudflared
```

### Run in development
```bash
npm run dev
```

### Build for production
```bash
npm run build          # Current platform
npm run build:win      # Windows only
npm run build:linux    # Linux only
```

Builds are output to `release/` directory.

## Tech Stack

- Electron + React + TypeScript
- FFmpeg for video processing
- Cloudflare Tunnel for sharing
- electron-builder for packaging

## License

MIT
