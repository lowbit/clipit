import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Home, Globe, Settings, Loader2, Folder, FolderOpen, Video, Image, Eye, Trash2, Edit, Copy, ChevronLeft, ChevronRight, ChevronRight as Separator, RefreshCw } from 'lucide-react'
import type { Clip } from '../../shared/types'

export default function Sidebar() {
  const {
    games,
    selectedGame,
    selectGame,
    filteredClips,
    selectedClip,
    selectedClips,
    selectClip,
    selectAllClips,
    clearSelection,
    filter,
    setFilter,
    sort,
    setSort,
    goHome,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    setShowSettings,
    settings,
    refreshClips,
    refreshGames,
    addToast
  } = useApp()

  // Tunnel state
  const [tunnelInfo, setTunnelInfo] = useState<{ url: string; isActive: boolean; port: number }>({
    url: '',
    isActive: false,
    port: 0
  })
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ clip: Clip; x: number; y: number } | null>(null)
  const [renameClip, setRenameClip] = useState<Clip | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Load tunnel info and app version on mount
  useEffect(() => {
    const loadTunnelInfo = async () => {
      const info = await window.clipit.getTunnelInfo()
      setTunnelInfo(info)
    }
    loadTunnelInfo()

    const loadAppVersion = async () => {
      const version = await window.clipit.getAppVersion()
      setAppVersion(version)
    }
    loadAppVersion()

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

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, clip: Clip) => {
    e.preventDefault()
    // If right-clicked clip is not in selection, select only it
    const isInSelection = selectedClips.some(c => c.path === clip.path)
    if (!isInSelection) {
      selectClip(clip)
    }
    setContextMenu({ clip, x: e.clientX, y: e.clientY })
  }

  const handleShowInExplorer = async () => {
    if (!contextMenu) return
    const result = await window.clipit.showInExplorer(contextMenu.clip.path)
    if (!result.success) {
      addToast(result.error || 'Failed to show in explorer', 'error')
    }
    setContextMenu(null)
  }

  const handleCopyPath = async () => {
    if (!contextMenu) return
    await window.clipit.copyToClipboard(contextMenu.clip.path)
    addToast('Path copied to clipboard', 'success')
    setContextMenu(null)
  }

  const handleRenameStart = () => {
    if (!contextMenu) return
    setRenameClip(contextMenu.clip)
    setRenameValue(contextMenu.clip.name.replace(/\.[^.]+$/, ''))
    setContextMenu(null)
  }

  const handleRenameSubmit = async () => {
    if (!renameClip || !renameValue.trim()) return

    const result = await window.clipit.renameFile(renameClip.path, renameValue.trim())
    if (result.success) {
      addToast('File renamed successfully', 'success')
      await refreshClips()
      await refreshGames()
      // If renamed clip was selected, clear selection
      if (selectedClip?.path === renameClip.path) {
        selectClip(null)
      }
    } else {
      addToast(result.error || 'Failed to rename file', 'error')
    }
    setRenameClip(null)
    setRenameValue('')
  }

  const handleRenameCancel = () => {
    setRenameClip(null)
    setRenameValue('')
  }

  const handleDeleteFromContext = async () => {
    if (!contextMenu) return
    setContextMenu(null)

    const filesToDelete = selectedClips.length > 1 ? selectedClips : [contextMenu.clip]
    const fileNames = filesToDelete.length === 1
      ? filesToDelete[0].name
      : `${filesToDelete.length} files`

    if (!confirm(`Delete ${fileNames}?`)) return

    let successCount = 0
    let errorCount = 0

    for (const clip of filesToDelete) {
      const result = await window.clipit.deleteFile(clip.path)
      if (result.success) {
        successCount++
      } else {
        errorCount++
        addToast(result.error || `Failed to delete ${clip.name}`, 'error')
      }
    }

    if (successCount > 0) {
      addToast(`${successCount} file${successCount > 1 ? 's' : ''} deleted`, 'success')
      clearSelection()
      await refreshClips()
      await refreshGames()
    }
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // Auto-focus rename input
  useEffect(() => {
    if (renameClip && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameClip])

  const handleDeleteSelected = async () => {
    if (selectedClips.length === 0) return

    const fileNames = selectedClips.length === 1
      ? selectedClips[0].name
      : `${selectedClips.length} files`

    if (!confirm(`Delete ${fileNames}?`)) return

    let successCount = 0
    let errorCount = 0

    for (const clip of selectedClips) {
      const result = await window.clipit.deleteFile(clip.path)
      if (result.success) {
        successCount++
      } else {
        errorCount++
        addToast(result.error || `Failed to delete ${clip.name}`, 'error')
      }
    }

    if (successCount > 0) {
      addToast(`${successCount} file${successCount > 1 ? 's' : ''} deleted`, 'success')
      clearSelection()
      await refreshClips()
      await refreshGames()
    }
  }

  // Mouse button 4/5 support for back/forward navigation
  useEffect(() => {
    const handleMouseButton = (e: MouseEvent) => {
      // Button 3 is MB4 (back), Button 4 is MB5 (forward)
      if (e.button === 3) {
        e.preventDefault()
        goBack()
      } else if (e.button === 4) {
        e.preventDefault()
        goForward()
      }
    }

    window.addEventListener('mousedown', handleMouseButton)
    return () => window.removeEventListener('mousedown', handleMouseButton)
  }, [goBack, goForward])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement) return

      if (e.key === 'Escape') {
        if (selectedClips.length > 0) {
          clearSelection()
        } else if (selectedGame) {
          selectGame(null)
        }
      }

      // Ctrl+A - Select all clips
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && selectedGame) {
        e.preventDefault()
        selectAllClips()
      }

      // F2 - Rename selected clip (only works for single selection)
      if (e.key === 'F2' && selectedClips.length === 1 && !renameClip) {
        e.preventDefault()
        setRenameClip(selectedClips[0])
        setRenameValue(selectedClips[0].name.replace(/\.[^.]+$/, ''))
      }

      // Delete - Delete selected clips
      if (e.key === 'Delete' && selectedClips.length > 0 && !renameClip) {
        e.preventDefault()
        handleDeleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGame, selectedClips, selectGame, selectAllClips, clearSelection, renameClip, handleDeleteSelected])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (selectedGame) {
      await refreshClips()
      await refreshGames()
    } else {
      await refreshGames()
    }
    // Keep spinning for at least 500ms for visual feedback
    setTimeout(() => setIsRefreshing(false), 500)
  }

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

      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-bar">
        <div className="breadcrumb-nav-buttons">
          <button
            className="breadcrumb-nav-btn"
            onClick={goBack}
            disabled={!canGoBack}
            title="Go Back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="breadcrumb-nav-btn"
            onClick={goForward}
            disabled={!canGoForward}
            title="Go Forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="breadcrumb-path">
          <button className="breadcrumb-item breadcrumb-home" onClick={goHome}>
            <span>Home</span>
          </button>
          {selectedGame && (
            <>
              <Separator size={12} className="breadcrumb-separator" />
              <span className="breadcrumb-item breadcrumb-current">
                <span>{selectedGame}</span>
              </span>
            </>
          )}
        </div>
        {!selectedGame && (
          <button
            className="breadcrumb-nav-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh folders"
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={16} style={isRefreshing ? { animation: 'spin 0.6s linear infinite' } : {}} />
          </button>
        )}
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

      <div
        className="sidebar-content"
        onClick={(e) => {
          // Clear selection when clicking empty space
          if (e.target === e.currentTarget) {
            clearSelection()
          }
        }}
      >
        {selectedGame ? (
          // Show clips for selected game
          filteredClips.map((clip) => {
            const isRenaming = renameClip?.path === clip.path
            const isSelected = selectedClips.some(c => c.path === clip.path)
            return (
              <div
                key={clip.path}
                className={`list-item ${isSelected ? 'selected' : ''} ${isRenaming ? 'renaming' : ''}`}
                onClick={(e) => {
                  if (isRenaming) return
                  const isCtrl = e.ctrlKey || e.metaKey
                  const isShift = e.shiftKey
                  selectClip(clip, isCtrl, isShift)
                }}
                onContextMenu={(e) => !isRenaming && handleContextMenu(e, clip)}
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
                  {isRenaming ? (
                    <div className="list-item-rename">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit()
                          if (e.key === 'Escape') handleRenameCancel()
                        }}
                        onBlur={handleRenameCancel}
                        className="rename-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="list-item-name">{clip.name}</div>
                      <div className="list-item-meta">
                        {clip.sizeMb} MB • {clip.modifiedStr}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })
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
          <span className="sidebar-footer-settings-content">
            <span className="sidebar-footer-settings-text">Settings</span>
            {appVersion && <span className="sidebar-footer-settings-version">v{appVersion}</span>}
          </span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedClips.length > 1 && (
            <>
              <div className="context-menu-header">
                {selectedClips.length} files selected
              </div>
              <div className="context-menu-divider" />
            </>
          )}
          {selectedClips.length === 1 && (
            <>
              <button className="context-menu-item" onClick={handleShowInExplorer}>
                <Eye size={16} />
                <span>Show in Explorer</span>
              </button>
              <button className="context-menu-item" onClick={handleRenameStart}>
                <Edit size={16} />
                <span>Rename</span>
              </button>
              <button className="context-menu-item" onClick={handleCopyPath}>
                <Copy size={16} />
                <span>Copy Path</span>
              </button>
              <div className="context-menu-divider" />
            </>
          )}
          <button className="context-menu-item" onClick={async () => {
            setContextMenu(null)
            await handleRefresh()
          }}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item context-menu-item-danger" onClick={handleDeleteFromContext}>
            <Trash2 size={16} />
            <span>Delete{selectedClips.length > 1 ? ` (${selectedClips.length})` : ''}</span>
          </button>
        </div>
      )}
    </div>
  )
}
