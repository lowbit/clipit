import { useApp } from '../context/AppContext'
import { CheckCircle, AlertCircle, Info, Copy } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useApp()

  const getIcon = (toast: { message: string; type: string }) => {
    if (toast.message.includes('URL copied') || toast.message.includes('copied')) {
      return <Copy size={18} />
    }
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={18} />
      case 'error':
        return <AlertCircle size={18} />
      default:
        return <Info size={18} />
    }
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type} ${toast.message.includes('URL copied') ? 'toast-prominent' : ''}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast-icon">{getIcon(toast)}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
