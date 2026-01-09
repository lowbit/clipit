import { useApp } from '../context/AppContext'

export default function ToastContainer() {
  const { toasts, removeToast } = useApp()

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
