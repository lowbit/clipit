import { createContext, useState, useEffect, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { Settings, Game, Clip, ClipInfo, EncoderInfo } from '../../shared/types'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppContextType {
  // Settings
  settings: Settings | null
  isConfigured: boolean
  updateSettings: (settings: Partial<Settings>) => Promise<void>
  pickDirectory: (title: string) => Promise<string | null>

  // Games & Clips
  games: Game[]
  clips: Clip[]
  selectedGame: string | null
  selectedClip: Clip | null
  clipInfo: ClipInfo | null
  selectGame: (game: string | null) => void
  selectClip: (clip: Clip | null) => void
  refreshGames: () => Promise<void>
  refreshClips: () => Promise<void>
  goHome: () => void

  // Navigation History
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void

  // Filter & Sort
  filter: 'all' | 'video' | 'image'
  sort: 'date' | 'name' | 'size'
  setFilter: (filter: 'all' | 'video' | 'image') => void
  setSort: (sort: 'date' | 'name' | 'size') => void
  filteredClips: Clip[]

  // Encoders
  encoders: EncoderInfo[]
  detectEncoders: () => Promise<void>

  // UI State
  loading: boolean
  loadingText: string
  setLoading: (loading: boolean, text?: string) => void
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  showTunnelNotice: boolean
  dismissTunnelNotice: () => Promise<void>

  // Updates
  updateStatus: 'none' | 'available' | 'downloading' | 'ready'
  updateVersion: string | null
  updateProgress: number
  downloadUpdate: () => void
  installUpdate: () => void
  dismissUpdate: () => void

  // Toasts
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
  removeToast: (id: number) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  // Settings
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Games & Clips
  const [games, setGames] = useState<Game[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [clipInfo, setClipInfo] = useState<ClipInfo | null>(null)

  // Filter & Sort
  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all')
  const [sort, setSort] = useState<'date' | 'name' | 'size'>('date')

  // Encoders
  const [encoders, setEncoders] = useState<EncoderInfo[]>([])

  // UI State
  const [loading, setLoadingState] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showTunnelNotice, setShowTunnelNotice] = useState(false)

  // Update state
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloading' | 'ready'>('none')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const [toastId, setToastId] = useState(0)

  // Navigation History
  const [navHistory, setNavHistory] = useState<(string | null)[]>([null])
  const [navIndex, setNavIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)

  const canGoBack = navIndex > 0
  const canGoForward = navIndex < navHistory.length - 1

  const addToHistory = useCallback((location: string | null) => {
    setNavHistory(prev => {
      // Remove any forward history
      const newHistory = prev.slice(0, navIndex + 1)
      // Don't add if it's the same as current location
      if (newHistory[newHistory.length - 1] === location) {
        return prev
      }
      // Add new location
      return [...newHistory, location]
    })
    setNavIndex(prev => prev + 1)
  }, [navIndex])

  const goBack = useCallback(() => {
    if (canGoBack) {
      setIsNavigating(true)
      setNavIndex(prev => prev - 1)
      const targetLocation = navHistory[navIndex - 1]
      setSelectedGame(targetLocation)
      setSelectedClip(null)
      setClipInfo(null)
      if (targetLocation) {
        window.clipit.getClips(targetLocation).then(setClips)
      } else {
        setClips([])
      }
      setTimeout(() => setIsNavigating(false), 0)
    }
  }, [canGoBack, navHistory, navIndex])

  const goForward = useCallback(() => {
    if (canGoForward) {
      setIsNavigating(true)
      setNavIndex(prev => prev + 1)
      const targetLocation = navHistory[navIndex + 1]
      setSelectedGame(targetLocation)
      setSelectedClip(null)
      setClipInfo(null)
      if (targetLocation) {
        window.clipit.getClips(targetLocation).then(setClips)
      } else {
        setClips([])
      }
      setTimeout(() => setIsNavigating(false), 0)
    }
  }, [canGoForward, navHistory, navIndex])

  const goHome = useCallback(() => {
    if (!isNavigating) {
      addToHistory(null)
    }
    setSelectedGame(null)
    setSelectedClip(null)
    setClipInfo(null)
    setClips([])
  }, [isNavigating, addToHistory])

  useEffect(() => {
    const loadInitialData = async () => {
      const configured = await window.clipit.isConfigured()
      setIsConfigured(configured)

      const loadedSettings = await window.clipit.getSettings()
      setSettings(loadedSettings)

      if (configured && !loadedSettings.hasSeenTunnelNotice) {
        setShowTunnelNotice(true)
      }

      if (configured) {
        const loadedGames = await window.clipit.getGames()
        setGames(loadedGames)
      }

      setIsInitializing(false)
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    const unsubSettings = window.clipit.onOpenSettings(() => {
      setShowSettings(true)
    })

    const unsubHome = window.clipit.onGoHome(() => {
      goHome()
    })

    return () => {
      unsubSettings()
      unsubHome()
    }
  }, [goHome])

  useEffect(() => {
    const unsubAvailable = window.clipit.onUpdateAvailable((info) => {
      setUpdateStatus('available')
      setUpdateVersion(info.version)
    })

    const unsubProgress = window.clipit.onUpdateDownloadProgress((progress) => {
      setUpdateStatus('downloading')
      setUpdateProgress(progress.percent)
    })

    const unsubDownloaded = window.clipit.onUpdateDownloaded((info) => {
      setUpdateStatus('ready')
      setUpdateVersion(info.version)
      setUpdateProgress(100)
    })

    const unsubError = window.clipit.onUpdateError((error) => {
      setToasts(prev => [...prev, {
        id: Date.now(),
        message: `Update failed: ${error.error}`,
        type: 'error' as const
      }])
      setUpdateStatus('none')
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  useEffect(() => {
    const loadClipInfo = async () => {
      if (selectedClip) {
        const info = await window.clipit.getClipInfo(selectedClip.path)
        setClipInfo(info)
      } else {
        setClipInfo(null)
      }
    }

    loadClipInfo()
  }, [selectedClip])

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const wasConfigured = isConfigured

    await window.clipit.setSettings(newSettings)
    const updated = await window.clipit.getSettings()
    setSettings(updated)

    const configured = await window.clipit.isConfigured()
    setIsConfigured(configured)

    // Show tunnel notice after first setup
    if (!wasConfigured && configured && !updated.hasSeenTunnelNotice) {
      setShowTunnelNotice(true)
    }

    if (newSettings.recordingsDir !== undefined && configured) {
      const loadedGames = await window.clipit.getGames()
      setGames(loadedGames)
    }
  }, [isConfigured])

  const pickDirectory = useCallback(async (title: string) => {
    return window.clipit.pickDirectory(title)
  }, [])

  const dismissTunnelNotice = useCallback(async () => {
    await window.clipit.setSettings({ hasSeenTunnelNotice: true })
    const updated = await window.clipit.getSettings()
    setSettings(updated)
    setShowTunnelNotice(false)
  }, [])

  const selectGame = useCallback(async (game: string | null) => {
    if (!isNavigating) {
      addToHistory(game)
    }
    setSelectedGame(game)
    setSelectedClip(null)
    setClipInfo(null)

    if (game) {
      const loadedClips = await window.clipit.getClips(game)
      setClips(loadedClips)
    } else {
      setClips([])
    }
  }, [isNavigating, addToHistory])

  const selectClip = useCallback((clip: Clip | null) => {
    setSelectedClip(clip)
  }, [])

  const refreshGames = useCallback(async () => {
    const loadedGames = await window.clipit.getGames()
    setGames(loadedGames)
  }, [])

  const refreshClips = useCallback(async () => {
    if (selectedGame) {
      const loadedClips = await window.clipit.getClips(selectedGame)
      setClips(loadedClips)
    }
  }, [selectedGame])

  const detectEncoders = useCallback(async () => {
    const detected = await window.clipit.detectEncoders()
    setEncoders(detected)
  }, [])

  const filteredClips = useMemo(() => {
    let result = [...clips]

    if (filter !== 'all') {
      result = result.filter(clip => clip.type === filter)
    }

    switch (sort) {
      case 'date':
        result.sort((a, b) => b.modified - a.modified)
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'size':
        result.sort((a, b) => b.sizeMb - a.sizeMb)
        break
    }

    return result
  }, [clips, filter, sort])

  const setLoading = useCallback((isLoading: boolean, text?: string) => {
    setLoadingState(isLoading)
    setLoadingText(text || '')
  }, [])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = toastId
    setToastId(prev => prev + 1)
    setToasts(prev => [...prev, { id, message, type }])

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [toastId])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const downloadUpdate = useCallback(() => {
    window.clipit.downloadUpdate()
  }, [])

  const installUpdate = useCallback(() => {
    window.clipit.installUpdate()
  }, [])

  const dismissUpdate = useCallback(() => {
    setUpdateStatus('none')
    setUpdateVersion(null)
    setUpdateProgress(0)
  }, [])

  const value: AppContextType = {
    settings,
    isConfigured,
    updateSettings,
    pickDirectory,
    games,
    clips,
    selectedGame,
    selectedClip,
    clipInfo,
    selectGame,
    selectClip,
    refreshGames,
    refreshClips,
    goHome,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    filter,
    sort,
    setFilter,
    setSort,
    filteredClips,
    encoders,
    detectEncoders,
    loading,
    loadingText,
    setLoading,
    showSettings,
    setShowSettings,
    showTunnelNotice,
    dismissTunnelNotice,
    updateStatus,
    updateVersion,
    updateProgress,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    toasts,
    addToast,
    removeToast
  }

  // Don't render anything until we've checked if the app is configured
  if (isInitializing) {
    return null
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
