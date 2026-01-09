import { spawn } from 'child_process'
import { getFFmpegPath, ffmpegExists } from '../utils/ffmpegBinary'
import { getBestEncoder, getVideoCodec } from './FFmpegService'

interface EncodeOptions {
  codec: 'h264' | 'h265'
  quality: 'high' | 'medium' | 'low'
  fps: 'original' | '60' | '30'
  resolution: 'original' | '1080' | '720'
  preferredEncoder?: string
}

interface EncodeResult {
  success: boolean
  error?: string
}

// Quality values for different encoders
const qualityMap: Record<string, Record<string, string>> = {
  // NVENC uses QP/CQ values
  h264_nvenc: { high: '18', medium: '23', low: '28' },
  hevc_nvenc: { high: '20', medium: '26', low: '32' },
  // AMF uses QP values
  h264_amf: { high: '18', medium: '23', low: '28' },
  hevc_amf: { high: '20', medium: '26', low: '32' },
  // QSV uses global quality
  h264_qsv: { high: '18', medium: '23', low: '28' },
  hevc_qsv: { high: '20', medium: '26', low: '32' },
  // CPU uses CRF values
  libx264: { high: '18', medium: '23', low: '28' },
  libx265: { high: '20', medium: '26', low: '32' }
}

// Encoder arguments by type
const encoderArgs: Record<string, string[]> = {
  h264_nvenc: ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '{q}', '-b:v', '0'],
  hevc_nvenc: ['-c:v', 'hevc_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '{q}', '-b:v', '0', '-tag:v', 'hvc1'],
  h264_amf: ['-c:v', 'h264_amf', '-quality', 'balanced', '-rc', 'vbr_latency', '-qp_i', '{q}', '-qp_p', '{q}'],
  hevc_amf: ['-c:v', 'hevc_amf', '-quality', 'balanced', '-rc', 'vbr_latency', '-qp_i', '{q}', '-qp_p', '{q}'],
  h264_qsv: ['-c:v', 'h264_qsv', '-preset', 'medium', '-global_quality', '{q}'],
  hevc_qsv: ['-c:v', 'hevc_qsv', '-preset', 'medium', '-global_quality', '{q}'],
  libx264: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '{q}'],
  libx265: ['-c:v', 'libx265', '-preset', 'medium', '-crf', '{q}', '-tag:v', 'hvc1']
}

/**
 * Encode a video file with specified options
 */
export async function encodeVideo(
  sourcePath: string,
  outputPath: string,
  options: EncodeOptions
): Promise<EncodeResult> {
  if (!ffmpegExists()) {
    return { success: false, error: 'FFmpeg not found. Please run: npm run download-ffmpeg' }
  }

  const encoder = await getBestEncoder(options.codec, options.preferredEncoder)
  const q = qualityMap[encoder]?.[options.quality] || '23'

  // Get source codec for potential hardware decoding
  const sourceCodec = await getVideoCodec(sourcePath)
  const isAv1 = sourceCodec === 'av1'

  // Build video filters
  const vfFilters: string[] = []
  if (options.resolution !== 'original') {
    vfFilters.push(`scale=-2:${options.resolution}`)
  }
  if (options.fps !== 'original') {
    vfFilters.push(`fps=${options.fps}`)
  }

  // Build decode options for AV1 sources
  const decodeOptions = isAv1 && encoder.includes('nvenc')
    ? ['-hwaccel', 'cuda', '-c:v', 'av1_cuvid']
    : []

  // Build encoder arguments
  const encArgs = (encoderArgs[encoder] || encoderArgs.libx264).map(arg =>
    arg.replace('{q}', q)
  )

  // Build full command
  const cmd: string[] = []
  cmd.push(...decodeOptions)
  cmd.push('-i', sourcePath)

  if (vfFilters.length > 0) {
    cmd.push('-vf', vfFilters.join(','))
  }

  cmd.push(...encArgs)
  cmd.push('-c:a', 'aac', '-b:a', '128k')
  cmd.push('-y', outputPath)

  return new Promise((resolve) => {
    const ffmpegPath = getFFmpegPath()
    const process = spawn(ffmpegPath, cmd)

    let stderr = ''

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: stderr })
      }
    })

    process.on('error', (error) => {
      resolve({ success: false, error: String(error) })
    })
  })
}
