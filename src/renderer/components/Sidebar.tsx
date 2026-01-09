import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Home, Globe, Settings, Loader2, Folder, FolderOpen, Video, Image } from 'lucide-react'

export default function Sidebar() {
  const {
    games,
    selectedGame,
    selectGame,
    filteredClips,
    selectedClip,
    selectClip,
    filter,
    setFilter,
    sort,
    setSort,
    goHome,
    setShowSettings,
    settings
  } = useApp()

  // Tunnel state
  const [tunnelInfo, setTunnelInfo] = useState<{ url: string; isActive: boolean; port: number }>({
    url: '',
    isActive: false,
    port: 0
  })
  const [tunnelLoading, setTunnelLoading] = useState(false)

  // Load tunnel info on mount and listen for updates
  useEffect(() => {
    const loadTunnelInfo = async () => {
      const info = await window.clipit.getTunnelInfo()
      setTunnelInfo(info)
    }
    loadTunnelInfo()

    // Listen for tunnel state changes from other components
    const handleTunnelUpdate = () => {
      loadTunnelInfo()
    }
    window.addEventListener('tunnel-state-changed', handleTunnelUpdate)
    return () => window.removeEventListener('tunnel-state-changed', handleTunnelUpdate)
  }, [])

  // Handle tunnel toggle
  const handleTunnelToggle = async () => {
    setTunnelLoading(true)
    try {
      if (tunnelInfo.isActive) {
        await window.clipit.stopTunnel()
        const info = await window.clipit.getTunnelInfo()
        setTunnelInfo(info)
        window.dispatchEvent(new Event('tunnel-state-changed'))
      } else {
        const info = await window.clipit.startTunnel()
        setTunnelInfo(info)
        window.dispatchEvent(new Event('tunnel-state-changed'))
      }
    } finally {
      setTunnelLoading(false)
    }
  }

  // Handle Escape key for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedClip) {
          selectClip(null)
        } else if (selectedGame) {
          selectGame(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGame, selectedClip, selectGame, selectClip])

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button
          className="home-icon-btn"
          onClick={goHome}
          title="Go Home"
        >
          <Home size={20} />
        </button>
        <div style={{ flex: 1 }}>
          {selectedGame ? (
            <>
              <div className="sidebar-title">{selectedGame}</div>
              <div className="sidebar-subtitle">{filteredClips.length} clips</div>
            </>
          ) : (
            <>
              <div className="sidebar-title">Clipit</div>
              <div className="sidebar-subtitle">{games.length} games</div>
            </>
          )}
        </div>
      </div>

      {selectedGame && (
        <>
          <div className="sort-bar">
            <span className="sort-label">Sort by:</span>
            <select
              className="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'date' | 'name' | 'size')}
            >
              <option value="date">Newest First</option>
              <option value="name">Name A-Z</option>
              <option value="size">Largest First</option>
            </select>
          </div>
          <div className="filter-bar">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'video' ? 'active' : ''}`}
              onClick={() => setFilter('video')}
            >
              Videos
            </button>
            <button
              className={`filter-btn ${filter === 'image' ? 'active' : ''}`}
              onClick={() => setFilter('image')}
            >
              Images
            </button>
          </div>
        </>
      )}

      <div className="sidebar-content">
        {selectedGame ? (
          // Show clips for selected game
          filteredClips.map((clip) => (
            <div
              key={clip.path}
              className={`list-item ${selectedClip?.path === clip.path ? 'selected' : ''}`}
              onClick={() => selectClip(clip)}
            >
              <div className="list-item-thumb-container">
                <img
                  src={window.clipit.getThumbnailUrl(clip.path)}
                  alt=""
                  className="list-item-thumb"
                  loading="lazy"
                  onError={(e) => {
                    // Hide broken thumbnails
                    (e.target as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
                <div className="list-item-type-badge">
                  {clip.type === 'video' ? (
                    <Video size={12} />
                  ) : (
                    <Image size={12} />
                  )}
                </div>
              </div>
              <div className="list-item-info">
                <div className="list-item-name">{clip.name}</div>
                <div className="list-item-meta">
                  {clip.sizeMb} MB • {clip.modifiedStr}
                </div>
              </div>
            </div>
          ))
        ) : (
          // Show games list
          games.map((game) => (
            <div
              key={game.name}
              className={`list-item ${game.name === 'Uncategorized' ? 'list-item-uncategorized' : ''}`}
              onClick={() => selectGame(game.name)}
            >
              {game.name === 'Uncategorized' && (
                <FolderOpen size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <div className="list-item-info">
                <div className="list-item-name">
                  {game.name}
                  {game.name === 'Uncategorized' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      (Root folder)
                    </span>
                  )}
                </div>
              </div>
              <span className="list-item-count">{game.count}</span>
            </div>
          ))
        )}

        {selectedGame && filteredClips.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">No clips found</div>
            <div className="empty-state-text">
              {filter === 'all'
                ? 'This game folder is empty'
                : `No ${filter}s in this folder`}
            </div>
          </div>
        )}

        {!selectedGame && games.length === 0 && !settings?.recordingsDir && (
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <div className="empty-state-title">No recordings folder set</div>
            <div className="empty-state-text">
              Please set your recordings folder in settings to get started
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowSettings(true)}
              style={{ marginTop: '12px' }}
            >
              <Folder size={16} />
              Open Settings
            </button>
          </div>
        )}

        {!selectedGame && games.length === 0 && settings?.recordingsDir && (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-title">No games found</div>
            <div className="empty-state-text">
              Your recordings folder is empty or has no game subfolders
            </div>
            <div className="empty-state-hint">
              {settings.recordingsDir}
            </div>
          </div>
        )}
      </div>

      {/* Discord-style bottom panel */}
      <div className="sidebar-footer">
        {/* Server status and controls */}
        <div className="sidebar-footer-section">
          <button
            className={`sidebar-footer-tunnel ${tunnelInfo.isActive ? 'active' : ''} ${tunnelLoading ? 'loading' : ''}`}
            onClick={handleTunnelToggle}
            disabled={tunnelLoading}
            title={tunnelLoading ? 'Connecting...' : tunnelInfo.isActive ? 'Click to stop server' : 'Click to start server'}
          >
            <div className="sidebar-footer-tunnel-info">
              <span className="sidebar-footer-tunnel-icon">
                <Globe size={18} />
              </span>
              <div className="sidebar-footer-tunnel-text">
                <div className="sidebar-footer-tunnel-label">Server</div>
                <div className="sidebar-footer-tunnel-status">
                  {tunnelLoading ? (
                    <span className="status-loading">Connecting...</span>
                  ) : tunnelInfo.isActive ? (
                    <span className="status-active">Online</span>
                  ) : (
                    <span className="status-inactive">Offline</span>
                  )}
                </div>
              </div>
            </div>
            <div className="sidebar-footer-toggle">
              {tunnelLoading ? (
                <Loader2 size={14} className="spinner-icon" />
              ) : tunnelInfo.isActive ? (
                '🟢'
              ) : (
                '🔴'
              )}
            </div>
          </button>
          <div className="sidebar-footer-tunnel-url">
            <input
              type="text"
              value={tunnelInfo.isActive && tunnelInfo.url ? tunnelInfo.url : 'Unavailable - Server offline'}
              readOnly
              onClick={(e) => {
                if (tunnelInfo.isActive && tunnelInfo.url) {
                  e.currentTarget.select()
                  window.clipit.copyToClipboard(tunnelInfo.url)
                }
              }}
              title={tunnelInfo.isActive && tunnelInfo.url ? 'Click to copy' : 'Server is offline'}
              disabled={!tunnelInfo.isActive}
            />
          </div>
        </div>

        {/* Settings button */}
        <button
          className="sidebar-footer-settings"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <span className="sidebar-footer-settings-icon">
            <Settings size={18} />
          </span>
          <span className="sidebar-footer-settings-text">Settings</span>
        </button>
      </div>
    </div>
  )
}
