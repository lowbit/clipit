import { spawn } from 'child_process'
import { getFFmpegPath, getFFprobePath } from '../utils/ffmpegBinary'
import type { EncoderInfo } from '../../shared/types'

/**
 * Execute FFmpeg command and return result
 */
export async function executeFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath()
    const process = spawn(ffmpegPath, args)

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`))
      }
    })

    process.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Execute FFprobe command and return JSON result
 */
export async function executeFFprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffprobePath = getFFprobePath()
    const process = spawn(ffprobePath, args)

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`FFprobe exited with code ${code}: ${stderr}`))
      }
    })

    process.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const result = await executeFFprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      filePath
    ])
    const data = JSON.parse(result)
    return parseFloat(data.format.duration) || 60.0
  } catch {
    return 60.0
  }
}

/**
 * Get video codec name
 */
export async function getVideoCodec(filePath: string): Promise<string | null> {
  try {
    const result = await executeFFprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      filePath
    ])
    const data = JSON.parse(result)
    return data.streams?.[0]?.codec_name || null
  } catch {
    return null
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const result = await executeFFprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      filePath
    ])
    const data = JSON.parse(result)
    const stream = data.streams?.[0]
    return {
      width: stream?.width || 0,
      height: stream?.height || 0
    }
  } catch {
    return { width: 0, height: 0 }
  }
}

/**
 * Detect available hardware encoders
 */
export async function detectAvailableEncoders(): Promise<EncoderInfo[]> {
  const encoders: EncoderInfo[] = [
    { name: 'h264_nvenc', type: 'nvidia', available: false },
    { name: 'hevc_nvenc', type: 'nvidia', available: false },
    { name: 'h264_amf', type: 'amd', available: false },
    { name: 'hevc_amf', type: 'amd', available: false },
    { name: 'h264_qsv', type: 'intel', available: false },
    { name: 'hevc_qsv', type: 'intel', available: false },
    { name: 'libx264', type: 'cpu', available: true }, // CPU always available
    { name: 'libx265', type: 'cpu', available: true }
  ]

  for (const encoder of encoders) {
    if (encoder.type === 'cpu') continue // Skip CPU encoders, they're always available

    try {
      await executeFFmpeg([
        '-f', 'lavfi',
        '-i', 'nullsrc=s=256x256:d=0.1',
        '-c:v', encoder.name,
        '-frames:v', '1',
        '-f', 'null',
        process.platform === 'win32' ? 'NUL' : '/dev/null'
      ])
      encoder.available = true
    } catch {
      encoder.available = false
    }
  }

  return encoders
}

/**
 * Get the best available encoder for a codec type
 */
export async function getBestEncoder(codec: 'h264' | 'h265', preferredEncoder?: string): Promise<string> {
  const encoders = await detectAvailableEncoders()

  const priority = codec === 'h264'
    ? ['h264_nvenc', 'h264_amf', 'h264_qsv', 'libx264']
    : ['hevc_nvenc', 'hevc_amf', 'hevc_qsv', 'libx265']

  if (preferredEncoder && preferredEncoder !== 'auto') {
    const preferred = encoders.find(e => e.name === preferredEncoder && e.available)
    if (preferred) return preferred.name
  }

  for (const name of priority) {
    const encoder = encoders.find(e => e.name === name && e.available)
    if (encoder) return encoder.name
  }

  return codec === 'h264' ? 'libx264' : 'libx265'
}
