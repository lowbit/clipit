import { useRef, useState, useEffect, useCallback } from 'react'

interface TimelineProps {
  duration: number
  currentTime: number
  trimStart: number
  trimEnd: number
  onSeek: (time: number) => void
  onTrimStartChange: (time: number) => void
  onTrimEndChange: (time: number) => void
}

export default function Timeline({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  onSeek,
  onTrimStartChange,
  onTrimEndChange
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null)

  const getTimeFromPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    return ratio * duration
  }, [duration])

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'playhead') => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(type)
  }, [])

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return
    const time = getTimeFromPosition(e.clientX)
    onSeek(time)
  }, [dragging, getTimeFromPosition, onSeek])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX)

      switch (dragging) {
        case 'start':
          onTrimStartChange(Math.min(time, trimEnd - 0.1))
          break
        case 'end':
          onTrimEndChange(Math.max(time, trimStart + 0.1))
          break
        case 'playhead':
          onSeek(time)
          break
      }
    }

    const handleMouseUp = () => {
      setDragging(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, getTimeFromPosition, onSeek, onTrimStartChange, onTrimEndChange, trimStart, trimEnd])

  const startPercent = duration > 0 ? (trimStart / duration) * 100 : 0
  const endPercent = duration > 0 ? (trimEnd / duration) * 100 : 100
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="timeline" ref={containerRef} onClick={handleTimelineClick}>
      {/* Background bar */}
      <div className="timeline-bar" />

      {/* Selected range */}
      <div
        className="timeline-progress"
        style={{
          left: `${startPercent}%`,
          width: `${endPercent - startPercent}%`
        }}
      />

      {/* Start handle */}
      <div
        className="timeline-handle start"
        style={{ left: `${startPercent}%`, transform: 'translateX(-50%)' }}
        onMouseDown={(e) => handleMouseDown(e, 'start')}
      />

      {/* End handle */}
      <div
        className="timeline-handle end"
        style={{ left: `${endPercent}%`, transform: 'translateX(-50%)' }}
        onMouseDown={(e) => handleMouseDown(e, 'end')}
      />

      {/* Playhead */}
      <div
        className="timeline-playhead"
        style={{ left: `${playheadPercent}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  )
}
