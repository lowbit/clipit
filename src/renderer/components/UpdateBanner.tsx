import { Download, X, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface UpdateBannerProps {
  status: 'available' | 'downloading' | 'ready'
  version?: string
  progress?: number
  onDownload: () => void
  onInstall: () => void
  onDismiss: () => void
}

export default function UpdateBanner({
  status,
  version,
  progress,
  onDownload,
  onInstall,
  onDismiss
}: UpdateBannerProps) {
  const [isDownloadClicked, setIsDownloadClicked] = useState(false)
  const [isInstallClicked, setIsInstallClicked] = useState(false)
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {status === 'downloading' ? (
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
        ) : status === 'ready' ? (
          <Download size={18} />
        ) : (
          <Download size={18} />
        )}

        <div style={{ flex: 1 }}>
          {status === 'available' && (
            <div>
              <strong>Update Available</strong>
              {version && <span style={{ marginLeft: '8px', opacity: 0.9 }}>Version {version}</span>}
            </div>
          )}

          {status === 'downloading' && (
            <div>
              <strong>Downloading Update...</strong>
              {progress !== undefined && (
                <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                  {Math.round(progress)}%
                </span>
              )}
            </div>
          )}

          {status === 'ready' && (
            <div>
              <strong>Update Ready!</strong>
              {version && <span style={{ marginLeft: '8px', opacity: 0.9 }}>Version {version} downloaded</span>}
            </div>
          )}
        </div>

        {status === 'downloading' && progress !== undefined && (
          <div style={{
            width: '120px',
            height: '6px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'white',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {status === 'available' && (
          <button
            onClick={() => {
              setIsDownloadClicked(true)
              onDownload()
            }}
            disabled={isDownloadClicked}
            style={{
              backgroundColor: isDownloadClicked ? '#e5e7eb' : 'white',
              color: isDownloadClicked ? '#9ca3af' : '#2563eb',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isDownloadClicked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isDownloadClicked ? 0.6 : 1
            }}
          >
            <Download size={16} />
            Download
          </button>
        )}

        {status === 'ready' && (
          <button
            onClick={() => {
              setIsInstallClicked(true)
              onInstall()
            }}
            disabled={isInstallClicked}
            style={{
              backgroundColor: isInstallClicked ? '#e5e7eb' : 'white',
              color: isInstallClicked ? '#9ca3af' : '#2563eb',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isInstallClicked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isInstallClicked ? 0.6 : 1
            }}
          >
            <RefreshCw size={16} />
            Restart & Install
          </button>
        )}

        {status !== 'downloading' && (
          <button
            onClick={onDismiss}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.8
            }}
            title="Dismiss"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
