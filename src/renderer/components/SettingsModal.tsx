import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Folder, FolderOpen, Film, Cpu, X, Save, Trash2 } from 'lucide-react'

export default function SettingsModal() {
  const { settings, updateSettings, pickDirectory, setShowSettings, encoders, detectEncoders, addToast } = useApp()

  const [recordingsDir, setRecordingsDir] = useState(settings?.recordingsDir || '')
  const [shareDir, setShareDir] = useState(settings?.shareDir || '')
  const [generateThumbnails, setGenerateThumbnails] = useState(settings?.generateThumbnails ?? true)
  const [encodeOnShare, setEncodeOnShare] = useState(settings?.encodeOnShare || false)
  const [codec, setCodec] = useState(settings?.codec || 'h264')
  const [quality, setQuality] = useState(settings?.quality || 'medium')
  const [fps, setFps] = useState(settings?.fps || 'original')
  const [resolution, setResolution] = useState(settings?.resolution || 'original')
  const [preferredEncoder, setPreferredEncoder] = useState(settings?.preferredEncoder || 'auto')

  useEffect(() => {
    if (encoders.length === 0) {
      detectEncoders()
    }
  }, [encoders.length, detectEncoders])

  const handlePickRecordings = async () => {
    const dir = await pickDirectory('Select Recordings Folder')
    if (dir) setRecordingsDir(dir)
  }

  const handlePickShare = async () => {
    const dir = await pickDirectory('Select Share Folder')
    if (dir) setShareDir(dir)
  }

  const handleClearShare = () => {
    setShareDir('')
  }

  const handleSave = async () => {
    await updateSettings({
      recordingsDir,
      shareDir,
      generateThumbnails,
      encodeOnShare,
      codec: codec as 'h264' | 'h265',
      quality: quality as 'high' | 'medium' | 'low',
      fps: fps as 'original' | '60' | '30',
      resolution: resolution as 'original' | '1080' | '720',
      preferredEncoder
    })
    addToast('Settings saved', 'success')
    setShowSettings(false)
  }

  const availableEncoders = encoders.filter(e => e.available)

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button
            className="modal-close-btn"
            onClick={() => setShowSettings(false)}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-section">
          <h3 className="modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={16} />
            <span>Folders</span>
          </h3>

          <div className="form-group">
            <label className="form-label">Recordings Folder</label>
            <div className="form-input-group">
              <input
                type="text"
                className="form-input"
                value={recordingsDir}
                onChange={(e) => setRecordingsDir(e.target.value)}
                placeholder="Select folder..."
                readOnly
              />
              <button className="btn btn-secondary" onClick={handlePickRecordings}>
                <FolderOpen size={16} />
                Browse
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Share Folder (Optional)</label>
            <div className="form-input-group">
              <input
                type="text"
                className="form-input"
                value={shareDir}
                onChange={(e) => setShareDir(e.target.value)}
                placeholder="Optional - Select folder or leave empty..."
                readOnly
              />
              <button className="btn btn-secondary" onClick={handlePickShare}>
                <FolderOpen size={16} />
                Browse
              </button>
              {shareDir && (
                <button
                  className="btn btn-danger"
                  onClick={handleClearShare}
                  title="Clear share folder"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Optional: If set, files will be copied here when sharing. If not set, files will be shared from their original location in the recordings folder.
            </p>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={generateThumbnails}
                onChange={(e) => setGenerateThumbnails(e.target.checked)}
              />
              Generate video thumbnails
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', marginLeft: '24px' }}>
              Small preview images will be generated the first time you open a game folder. If disabled, no thumbnails will be generated for videos.
            </p>
          </div>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={16} />
            <span>Encoding</span>
          </h3>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={encodeOnShare}
                onChange={(e) => setEncodeOnShare(e.target.checked)}
              />
              Encode when sharing (make files smaller)
            </label>
          </div>

          {encodeOnShare && (
            <>
              <div className="form-group">
                <label className="form-label">Preferred Encoder</label>
                <select
                  className="form-select"
                  value={preferredEncoder}
                  onChange={(e) => setPreferredEncoder(e.target.value)}
                >
                  <option value="auto">Auto (best available)</option>
                  {availableEncoders.map((encoder) => (
                    <option key={encoder.name} value={encoder.name}>
                      {encoder.name} ({encoder.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Codec</label>
                <select
                  className="form-select"
                  value={codec}
                  onChange={(e) => setCodec(e.target.value)}
                >
                  <option value="h264">H.264</option>
                  <option value="h265">H.265 (HEVC)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quality</label>
                <select
                  className="form-select"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">FPS</label>
                <select
                  className="form-select"
                  value={fps}
                  onChange={(e) => setFps(e.target.value)}
                >
                  <option value="original">Original</option>
                  <option value="60">60 FPS</option>
                  <option value="30">30 FPS</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resolution</label>
                <select
                  className="form-select"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                >
                  <option value="original">Original</option>
                  <option value="1080">1080p</option>
                  <option value="720">720p</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} />
            <span>Available Encoders</span>
          </h3>
          <div className="encoder-list">
            {encoders.map((encoder) => (
              <span
                key={encoder.name}
                className={`encoder-badge ${encoder.available ? 'available' : 'unavailable'}`}
              >
                {encoder.name}
              </span>
            ))}
          </div>
        </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
            <X size={16} />
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
