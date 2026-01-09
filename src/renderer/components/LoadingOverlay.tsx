
interface LoadingOverlayProps {
  text?: string
}

export default function LoadingOverlay({ text }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      {text && <div className="loading-text">{text}</div>}
    </div>
  )
}
