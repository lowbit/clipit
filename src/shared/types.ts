// Shared types between main and renderer

export interface Game {
  name: string
  count: number
}

export interface Clip {
  path: string
  name: string
  game: string
  type: 'video' | 'image'
  sizeMb: number
  modified: number
  modifiedStr: string
}

export interface ClipInfo {
  type: 'video' | 'image'
  duration?: number
  width?: number
  height?: number
  codec?: string
}

export interface TrimResult {
  success: boolean
  output?: string
  sizeMb?: number
  error?: string
  savedAsCopy?: boolean
}

export type ShareDestination = 'tunnel' | 'streamable'

export interface ShareRequest {
  path: string
  destination?: ShareDestination
  encode?: boolean
  codec?: 'h264' | 'h265'
  quality?: 'high' | 'medium' | 'low'
  fps?: 'original' | '60' | '30'
  resolution?: 'original' | '1080' | '720'
}

export interface UploadProgress {
  percent: number
  uploadedMb: number
  totalMb: number
}

export interface ShareResult {
  success: boolean
  shareUrl?: string
  sharePath?: string
  alreadyShared?: boolean
  encoded?: boolean
  sizeMb?: number
  error?: string
}

export interface Settings {
  recordingsDir: string
  shareDir: string
  generateThumbnails: boolean
  hasSeenTunnelNotice: boolean
  encodeOnShare: boolean
  codec: 'h264' | 'h265'
  quality: 'high' | 'medium' | 'low'
  fps: 'original' | '60' | '30'
  resolution: 'original' | '1080' | '720'
  preferredEncoder: string
  streamableUsername: string
  streamablePassword: string
  lastSeenChangelog: string
}

export interface EncoderInfo {
  name: string
  type: 'nvidia' | 'amd' | 'intel' | 'cpu'
  available: boolean
}

// File filter for dialog
export interface FileFilter {
  name: string
  extensions: string[]
}

// Constants
export const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm']
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
