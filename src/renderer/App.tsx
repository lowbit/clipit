import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import SettingsModal from './components/SettingsModal'
import TunnelNoticeModal from './components/TunnelNoticeModal'
import ChangelogModal from './components/ChangelogModal'
import SetupScreen from './components/SetupScreen'
import LoadingOverlay from './components/LoadingOverlay'
import ToastContainer from './components/ToastContainer'
import UpdateBanner from './components/UpdateBanner'

function AppContent() {
  const {
    isConfigured,
    loading,
    loadingText,
    showSettings,
    showTunnelNotice,
    dismissTunnelNotice,
    showChangelog,
    dismissChangelog,
    updateStatus,
    updateVersion,
    updateProgress,
    downloadUpdate,
    installUpdate,
    dismissUpdate
  } = useApp()

  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.clipit.getAppVersion().then(setAppVersion)
  }, [])

  if (!isConfigured) {
    return (
      <>
        {updateStatus !== 'none' && (
          <UpdateBanner
            status={updateStatus}
            version={updateVersion || undefined}
            progress={updateProgress}
            onDownload={downloadUpdate}
            onInstall={installUpdate}
            onDismiss={dismissUpdate}
          />
        )}
        <SetupScreen />
        <ToastContainer />
      </>
    )
  }

  return (
    <div className="app">
      {updateStatus !== 'none' && (
        <UpdateBanner
          status={updateStatus}
          version={updateVersion || undefined}
          progress={updateProgress}
          onDownload={downloadUpdate}
          onInstall={installUpdate}
          onDismiss={dismissUpdate}
        />
      )}
      <Sidebar />
      <MainContent />
      {showSettings && <SettingsModal />}
      {showTunnelNotice && <TunnelNoticeModal onDismiss={dismissTunnelNotice} />}
      {showChangelog && <ChangelogModal version={appVersion} onDismiss={dismissChangelog} />}
      {loading && <LoadingOverlay text={loadingText} />}
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
