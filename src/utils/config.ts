// Configuration utility for the widget

export interface WidgetConfig {
  orgId: string
  apiBaseUrl: string
  googleMapsApiKey: string
  primaryColor: string
  textColor: string
  displayMode: 'inline' | 'floating'
  buttonText: string
  buttonEmoji: string
  buttonPosition: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'left-edge' | 'right-edge'
  // Inline/shortcode settings
  heading: string
  subheading: string
  bgStyle: 'none' | 'light' | 'dark' | 'custom'
  bgColor: string
  heroImage: string
  marginTop: string
  marginBottom: string
}

const DEFAULT_CONFIG: WidgetConfig = {
  orgId: '',
  apiBaseUrl: 'https://next.proleadsai.com/api',
  googleMapsApiKey: 'AIzaSyBc5YTUt-WuwKhEQyY3aoIcTob7tisYhmo',
  primaryColor: '#facc15',
  textColor: '#1c1917',
  displayMode: 'inline',
  buttonText: 'Get Roof Estimate',
  buttonEmoji: '🏠',
  buttonPosition: 'bottom-right',
  // Inline/shortcode settings
  heading: '',
  subheading: '',
  bgStyle: 'none',
  bgColor: '#f5f5f4',
  heroImage: '',
  marginTop: '',
  marginBottom: '',
}

export function getConfig(): WidgetConfig {
  // Try to get from window global (set by WordPress or parent)
  const windowConfig = window.__PROLEADSAI_CONFIG__ || {}

  // Try to get orgId from URL params
  let orgId = windowConfig.orgId || ''
  if (!orgId && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    orgId = urlParams.get('orgId') || urlParams.get('teamId') || ''
  }

  return {
    orgId,
    apiBaseUrl: windowConfig.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
    googleMapsApiKey: windowConfig.googleMapsApiKey || DEFAULT_CONFIG.googleMapsApiKey,
    primaryColor: windowConfig.primaryColor || DEFAULT_CONFIG.primaryColor,
    textColor: windowConfig.textColor || DEFAULT_CONFIG.textColor,
    displayMode: (windowConfig.displayMode as WidgetConfig['displayMode']) || DEFAULT_CONFIG.displayMode,
    buttonText: windowConfig.buttonText || DEFAULT_CONFIG.buttonText,
    buttonEmoji: windowConfig.buttonEmoji ?? DEFAULT_CONFIG.buttonEmoji,
    buttonPosition: (windowConfig.buttonPosition as WidgetConfig['buttonPosition']) || DEFAULT_CONFIG.buttonPosition,
    heading: windowConfig.heading || DEFAULT_CONFIG.heading,
    subheading: windowConfig.subheading || DEFAULT_CONFIG.subheading,
    bgStyle: (windowConfig.bgStyle as WidgetConfig['bgStyle']) || DEFAULT_CONFIG.bgStyle,
    bgColor: windowConfig.bgColor || DEFAULT_CONFIG.bgColor,
    heroImage: windowConfig.heroImage || DEFAULT_CONFIG.heroImage,
    marginTop: windowConfig.marginTop || DEFAULT_CONFIG.marginTop,
    marginBottom: windowConfig.marginBottom || DEFAULT_CONFIG.marginBottom,
  }
}

export function getSessionId(): string {
  // Try URL params first
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const urlSessionId = urlParams.get('sessionId')
    if (urlSessionId) return urlSessionId
  }

  // Try window global
  if (window.sessionId) return window.sessionId

  // Try localStorage
  try {
    const stored = localStorage.getItem('proleadsai_session_id')
    if (stored) {
      window.sessionId = stored
      return stored
    }
  } catch {
    // localStorage not available
  }

  // Generate new
  const newId = `roof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  window.sessionId = newId
  try {
    localStorage.setItem('proleadsai_session_id', newId)
  } catch {
    // localStorage not available
  }
  return newId
}
