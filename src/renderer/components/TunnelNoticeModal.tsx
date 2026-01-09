import { Globe } from 'lucide-react'

interface TunnelNoticeModalProps {
  onDismiss: () => void
}

export default function TunnelNoticeModal({ onDismiss }: TunnelNoticeModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="tunnel-notice-header">
            <Globe size={48} className="tunnel-notice-icon" />
            <h2 className="modal-title">Important: Sharing Information</h2>
          </div>

          <div className="tunnel-notice-content">
            <p className="tunnel-notice-text">
              Clipit uses <strong>Cloudflare Tunnel</strong> to share files directly from your PC.<br />
              No signup required.
            </p>

            <div className="tunnel-notice-points">
              <div className="tunnel-notice-point">
                <span className="tunnel-notice-bullet">•</span>
                <span>Control the server with the toggle at <strong>bottom left</strong></span>
              </div>
              <div className="tunnel-notice-point">
                <span className="tunnel-notice-bullet">•</span>
                <span>Each time you start/stop/restart, you get a <strong>new domain</strong></span>
              </div>
              <div className="tunnel-notice-point">
                <span className="tunnel-notice-bullet">•</span>
                <span>Old shared links will stop working with the new domain</span>
              </div>
              <div className="tunnel-notice-point">
                <span className="tunnel-notice-bullet">•</span>
                <span>Links only work while the server is running</span>
              </div>
            </div>

            <p className="tunnel-notice-tip">
              <strong>By design:</strong> Perfect for quick shares between friends.<br />
              You maintain full control and privacy of your content!
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={onDismiss} style={{ width: '100%' }}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
