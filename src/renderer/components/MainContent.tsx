import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import Timeline from './Timeline'
import { Play, Pause, RotateCcw, Scissors, Share2, Trash2, Volume2, VolumeX, Loader2 } from 'lucide-react'

type ShareDestination = 'tunnel' | 'streamable'

export default function MainContent() {
  const { selectedClip, clipInfo, refreshClips, refreshGames, selectClip, setLoading, addToast, settings } = useApp()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [saveAsCopy, setSaveAsCopy] = useState(true)
  const [showSaveDropdown, setShowSaveDropdown] = useState(false)
  const saveDropdownRef = useRef<HTMLDivElement>(null)
  const [shareDestination, setShareDestination] = useState<ShareDestination>('tunnel')
  const [showShareDropdown, setShowShareDropdown] = useState(false)
  const shareDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('clipit:saveAsCopy')
    if (saved !== null) {
      setSaveAsCopy(saved === 'true')
    }
    const savedDest = localStorage.getItem('clipit:shareDestination')
    if (savedDest === 'tunnel' || savedDest === 'streamable') {
      setShareDestination(savedDest)
    }
  }, [])

  useEffect(() => {
    if (clipInfo?.duration) {
      setDuration(clipInfo.duration)
      setTrimStart(0)
      setTrimEnd(clipInfo.duration)
      setCurrentTime(0)
    }
  }, [clipInfo, selectedClip])

  useEffect(() => {
    if (selectedClip?.type === 'video') {
      setIsVideoLoading(true)
      setIsPlaying(false)
    }
  }, [selectedClip])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setTrimEnd(videoRef.current.duration)
      setIsVideoLoading(false)
    }
  }, [])

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [])

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleResetTrim = useCallback(() => {
    setTrimStart(0)
    setTrimEnd(duration)
  }, [duration])

  const handleSaveOptionChange = useCallback((saveAsCopyOption: boolean) => {
    setSaveAsCopy(saveAsCopyOption)
    localStorage.setItem('clipit:saveAsCopy', String(saveAsCopyOption))
    setShowSaveDropdown(false)
  }, [])

  const handleShareDestinationChange = useCallback((dest: ShareDestination) => {
    setShareDestination(dest)
    localStorage.setItem('clipit:shareDestination', dest)
    setShowShareDropdown(false)
  }, [])

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const handleSetTrimStart = useCallback((time: number) => {
    setTrimStart(time)
    // If setting inset after current outset, move outset to end
    if (time > trimEnd) {
      setTrimEnd(duration)
    }
  }, [trimEnd, duration])

  const handleTrim = useCallback(async () => {
    if (!selectedClip) return

    setLoading(true, saveAsCopy ? 'Saving copy...' : 'Processing trim...')

    try {
      const result = await window.clipit.trim(selectedClip.path, trimStart, trimEnd, saveAsCopy)

      if (result.success) {
        if (saveAsCopy) {
          addToast(`Saved copy: ${result.sizeMb} MB`, 'success')
        } else {
          addToast(`Video trimmed: ${result.sizeMb} MB`, 'success')
        }
        await refreshClips()
        await refreshGames() // Update game counts
        handleResetTrim()
      } else {
        addToast(result.error || 'Trim failed', 'error')
      }
    } catch (error) {
      addToast('Trim failed', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedClip, trimStart, trimEnd, saveAsCopy, setLoading, addToast, refreshClips, refreshGames, handleResetTrim])

  const handleShare = useCallback(async () => {
    if (!selectedClip) return

    const isStreamable = shareDestination === 'streamable'

    try {
      const currentSettings = await window.clipit.getSettings()

      if (isStreamable && (!currentSettings.streamableUsername || !currentSettings.streamablePassword)) {
        addToast('Streamable credentials not configured. Go to Settings > Accounts.', 'error')
        return
      }

      // Show encoding message if encoding is enabled and file is a video
      const isVideo = selectedClip.type === 'video'
      if (currentSettings.encodeOnShare && isVideo) {
        setLoading(true, 'Encoding video...')
        // Small delay to show the encoding message
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        setLoading(true, isStreamable ? 'Uploading to Streamable...' : 'Preparing to share...')
      }

      // Set up upload progress listener for Streamable
      let cleanupProgress: (() => void) | null = null
      if (isStreamable) {
        cleanupProgress = window.clipit.onUploadProgress((progress) => {
          setLoading(true, `Uploading to Streamable... ${progress.percent}%`)
        })
      }

      try {
        const result = await window.clipit.share({
          path: selectedClip.path,
          destination: shareDestination,
          encode: currentSettings.encodeOnShare,
          codec: currentSettings.codec,
          quality: currentSettings.quality,
          fps: currentSettings.fps,
          resolution: currentSettings.resolution
        })

        if (result.success) {
          if (result.shareUrl) {
            await window.clipit.copyToClipboard(result.shareUrl)
            if (isStreamable) {
              addToast('Streamable URL copied to clipboard!', 'success')
            } else {
              addToast(result.alreadyShared ? 'URL copied to clipboard!' : 'Share URL copied to clipboard!', 'success')
              // Notify sidebar that tunnel state may have changed
              window.dispatchEvent(new Event('tunnel-state-changed'))
            }
          } else {
            addToast('Shared successfully', 'success')
          }
        } else {
          addToast(result.error || 'Share failed', 'error')
        }
      } finally {
        if (cleanupProgress) cleanupProgress()
      }
    } catch (error) {
      addToast('Share failed', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedClip, shareDestination, setLoading, addToast])

  const handleDelete = useCallback(async () => {
    if (!selectedClip) return

    if (!confirm(`Delete ${selectedClip.name}?`)) return

    setLoading(true, 'Deleting...')

    try {
      const result = await window.clipit.deleteFile(selectedClip.path)

      if (result.success) {
        addToast('Deleted', 'success')
        // Clear selection before refreshing clips to avoid showing deleted file
        selectClip(null)
        await refreshClips()
        await refreshGames() // Update game counts
      } else {
        addToast(result.error || 'Delete failed', 'error')
      }
    } catch (error) {
      addToast('Delete failed', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedClip, setLoading, addToast, selectClip, refreshClips, refreshGames])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedClip || selectedClip.type !== 'video') return
      if (e.target instanceof HTMLInputElement) return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
        case 'i':
          handleSetTrimStart(currentTime)
          break
        case 'o':
          setTrimEnd(currentTime)
          break
        case 'r':
          handleResetTrim()
          break
        case 'm':
          handleToggleMute()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClip, currentTime, handlePlayPause, handleResetTrim, handleSetTrimStart, handleToggleMute])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
        setShowSaveDropdown(false)
      }
    }

    if (showSaveDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSaveDropdown])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShowShareDropdown(false)
      }
    }

    if (showShareDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareDropdown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  if (!selectedClip) {
    return (
      <div className="main-content">
        <div className="player-container">
          <div className="no-selection">Select a clip to view</div>
        </div>
      </div>
    )
  }

  const isVideo = selectedClip.type === 'video'

  return (
    <div className="main-content">
      <div className="player-container">
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              className="video-player"
              src={window.clipit.getVideoUrl(selectedClip.path)}
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={handlePlayPause}
              onError={(e) => {
                console.error('[Video Player] Error loading video:', selectedClip.path, e)
                addToast('Failed to load video', 'error')
                setIsVideoLoading(false)
              }}
            />
            {isVideoLoading && (
              <div className="video-loading-overlay">
                <Loader2 size={48} className="video-loading-spinner" />
              </div>
            )}
            {!isVideoLoading && (
              <>
                <div className="video-hover-overlay">
                  {isPlaying ? <Pause size={80} /> : <Play size={80} />}
                </div>
                <div className="playback-time-overlay">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                <div
                  className="mute-indicator"
                  title={isMuted ? 'Audio Muted (Click or M to unmute)' : 'Audio On (Click or M to mute)'}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleMute()
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </div>
              </>
            )}
          </>
        ) : (
          <img
            className="image-viewer"
            src={window.clipit.getImageUrl(selectedClip.path)}
            alt={selectedClip.name}
            onError={(e) => {
              console.error('[Image Viewer] Error loading image:', selectedClip.path, e)
              addToast('Failed to load image', 'error')
            }}
          />
        )}
      </div>

      <div className="controls">
        {isVideo && (
          <div className="shortcuts-hint">
            <div className="shortcut-item">
              <kbd>Space</kbd>
              <span>Play/Pause</span>
            </div>
            <div className="shortcut-item">
              <kbd>M</kbd>
              <span>Mute</span>
            </div>
            <div className="shortcut-item">
              <kbd>I</kbd>
              <span>Set In</span>
            </div>
            <div className="shortcut-item">
              <kbd>O</kbd>
              <span>Set Out</span>
            </div>
            <div className="shortcut-item">
              <kbd>R</kbd>
              <span>Reset</span>
            </div>
          </div>
        )}

        {isVideo && (
          <>
            <Timeline
              duration={duration}
              currentTime={currentTime}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onSeek={handleSeek}
              onTrimStartChange={handleSetTrimStart}
              onTrimEndChange={setTrimEnd}
            />

            <div className="time-display">
              <span className="time-trim-start">{formatTime(trimStart)}</span>
              <span>{formatTime(trimEnd - trimStart)}</span>
              <span className="time-trim-end">{formatTime(trimEnd)}</span>
            </div>
          </>
        )}

        {!isVideo && clipInfo && (
          <div className="image-info">
            {clipInfo.width} × {clipInfo.height} • {selectedClip.sizeMb} MB
          </div>
        )}

        <div className="action-buttons">
          {isVideo && (
            <>
              <button className="btn btn-secondary" onClick={handlePlayPause}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="btn btn-secondary" onClick={handleResetTrim}>
                <RotateCcw size={16} />
                Reset
              </button>
              <div className="split-button-container" ref={saveDropdownRef}>
                <button
                  className="btn btn-primary split-button-main"
                  onClick={handleTrim}
                  disabled={trimStart === 0 && trimEnd === duration}
                >
                  <Scissors size={16} />
                  {saveAsCopy ? 'Save Copy' : 'Overwrite Original'}
                </button>
                <button
                  className="btn btn-primary split-button-arrow"
                  onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                  disabled={trimStart === 0 && trimEnd === duration}
                />
                {showSaveDropdown && (
                  <div className="split-button-dropdown">
                    <button
                      className={`split-button-option ${saveAsCopy ? 'selected' : ''}`}
                      onClick={() => handleSaveOptionChange(true)}
                    >
                      Save Copy
                    </button>
                    <button
                      className={`split-button-option ${!saveAsCopy ? 'selected' : ''}`}
                      onClick={() => handleSaveOptionChange(false)}
                    >
                      Overwrite Original
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="split-button-container" ref={shareDropdownRef}>
            <button className="btn btn-secondary split-button-main" onClick={handleShare}>
              <Share2 size={16} />
              {shareDestination === 'streamable' ? 'Streamable' : 'Tunnel'}
            </button>
            <button
              className="btn btn-secondary split-button-arrow"
              onClick={() => setShowShareDropdown(!showShareDropdown)}
            />
            {showShareDropdown && (
              <div className="split-button-dropdown">
                <button
                  className={`split-button-option ${shareDestination === 'tunnel' ? 'selected' : ''}`}
                  onClick={() => handleShareDestinationChange('tunnel')}
                >
                  Tunnel
                </button>
                <button
                  className={`split-button-option ${shareDestination === 'streamable' ? 'selected' : ''} ${!settings?.streamableUsername || !settings?.streamablePassword ? 'disabled' : ''}`}
                  onClick={() => {
                    if (settings?.streamableUsername && settings?.streamablePassword) {
                      handleShareDestinationChange('streamable')
                    } else {
                      addToast('Configure Streamable credentials in Settings > Accounts first', 'info')
                      setShowShareDropdown(false)
                    }
                  }}
                >
                  Streamable
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
