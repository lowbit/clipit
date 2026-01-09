import { Globe } from 'lucide-react'

interface TunnelNoticeModalProps {
  onDismiss: () => void
}

export default function TunnelNoticeModal({ onDismiss }: TunnelNoticeModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="tunnel-notice-header">
          <Globe size={48} className="tunnel-notice-icon" />
          <h2 className="modal-title">Important: Sharing Information</h2>
        </div>

        <div className="tunnel-notice-content">
          <p className="tunnel-notice-text">
            When you share videos or images, Clipit uses <strong>Cloudflare Tunnel</strong> to create temporary public links.
          </p>

          <div className="tunnel-notice-points">
            <div className="tunnel-notice-point">
              <span className="tunnel-notice-bullet">•</span>
              <span>The domain URL changes each time you restart the app</span>
            </div>
            <div className="tunnel-notice-point">
              <span className="tunnel-notice-bullet">•</span>
              <span>Links only work while your PC is on and the app is running</span>
            </div>
            <div className="tunnel-notice-point">
              <span className="tunnel-notice-bullet">•</span>
              <span>Shared links are temporary and will stop working when you close the app</span>
            </div>
            <div className="tunnel-notice-point">
              <span className="tunnel-notice-bullet">•</span>
              <span>No account or signup required - completely free</span>
            </div>
          </div>

          <p className="tunnel-notice-tip">
            <strong>Why?</strong> Clipit is open source and completely free. Files are shared directly from your PC without using any central servers. You maintain full control and privacy of your content!
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onDismiss} style={{ width: '100%' }}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
