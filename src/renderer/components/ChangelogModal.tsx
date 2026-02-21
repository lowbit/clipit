import { Megaphone } from 'lucide-react'
import changelog from '../../shared/changelog'

interface ChangelogModalProps {
  version: string
  onDismiss: () => void
}

export default function ChangelogModal({ version, onDismiss }: ChangelogModalProps) {
  const entry = changelog.find((e) => e.version === version)

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="tunnel-notice-header">
            <Megaphone size={48} className="tunnel-notice-icon" />
            <h2 className="modal-title">What's New in v{version}</h2>
          </div>

          <div className="tunnel-notice-content">
            <div className="tunnel-notice-points">
              {entry ? (
                entry.changes.map((change, i) => (
                  <div key={i} className="tunnel-notice-point">
                    <span className="tunnel-notice-bullet">&bull;</span>
                    <span>{change}</span>
                  </div>
                ))
              ) : (
                <div className="tunnel-notice-point">
                  <span className="tunnel-notice-bullet">&bull;</span>
                  <span>Bug fixes and improvements</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={onDismiss} style={{ width: '100%' }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
