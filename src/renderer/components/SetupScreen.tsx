import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function SetupScreen() {
  const { settings, updateSettings, pickDirectory, detectEncoders, encoders, addToast } = useApp()
  const [recordingsDir, setRecordingsDir] = useState(settings?.recordingsDir || '')
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    // Detect encoders on mount
    const detect = async () => {
      setDetecting(true)
      await detectEncoders()
      setDetecting(false)
    }
    detect()
  }, [detectEncoders])

  const handlePickRecordings = async () => {
    const dir = await pickDirectory('Select Recordings Folder')
    if (dir) {
      setRecordingsDir(dir)
    }
  }

  const handleContinue = async () => {
    if (!recordingsDir) {
      addToast('Please select a recordings folder', 'error')
      return
    }

    await updateSettings({ recordingsDir })
    addToast('Setup complete!', 'success')
  }

  return (
    <div className="setup-screen">
      <h1 className="setup-title">Welcome to Clipit</h1>
      <p className="setup-subtitle">
        Manage and share your game recordings with ease
      </p>

      <div className="setup-form">
        <div className="form-group">
          <label className="form-label">Recordings Folder *</label>
          <div className="form-input-group">
            <input
              type="text"
              className="form-input"
              value={recordingsDir}
              onChange={(e) => setRecordingsDir(e.target.value)}
              placeholder="Select folder where your clips are saved..."
              readOnly
            />
            <button className="btn btn-secondary" onClick={handlePickRecordings}>
              Browse
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            This is where your game recordings are stored (e.g., NVIDIA recordings folder)
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Detected Hardware Encoders</label>
          {detecting ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Detecting...</p>
          ) : (
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
          )}
        </div>

        <div style={{ marginTop: '32px' }}>
          <button
            className="btn btn-primary"
            onClick={handleContinue}
            disabled={!recordingsDir}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}
