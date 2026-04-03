// Configuration utility for the widget

export interface WidgetConfig {
  orgId: string
  apiBaseUrl: string
  disableWhenUnavailable: boolean
  openTriggerId: string
  hideDefaultLauncher: boolean
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
  // Typography
  headingFont: string
  headingColor: string
  textFont: string
  textColorShortcode: string
  headingSize: string
  textSize: string
}

const DEFAULT_CONFIG: WidgetConfig = {
  orgId: '',
  apiBaseUrl: 'https://app.proleadsai.com/api',
  disableWhenUnavailable: false,
  openTriggerId: '',
  hideDefaultLauncher: false,
  googleMapsApiKey: '',
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
  // Typography
  headingFont: '',
  headingColor: '#1c1917',
  textFont: '',
  textColorShortcode: '#44403c',
  headingSize: '',
  textSize: '',
}

function parseBooleanish(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false
  }
  return fallback
}

function readSearchParam(searchParams: URLSearchParams, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = searchParams.get(key)
    if (value !== null)
      return value
  }
  return undefined
}

function getConfigFromUrl(): Partial<WidgetConfig> {
  if (typeof window === 'undefined')
    return {}

  const searchParams = new URLSearchParams(window.location.search)

  return {
    orgId: readSearchParam(searchParams, 'org-id', 'orgId', 'team-id', 'teamId') || '',
    apiBaseUrl: readSearchParam(searchParams, 'api-url', 'apiUrl') || '',
    disableWhenUnavailable: parseBooleanish(
      readSearchParam(searchParams, 'disable-when-unavailable', 'disableWhenUnavailable'),
      DEFAULT_CONFIG.disableWhenUnavailable,
    ),
    openTriggerId: readSearchParam(searchParams, 'open-trigger-id', 'openTriggerId') || '',
    hideDefaultLauncher: parseBooleanish(
      readSearchParam(searchParams, 'hide-default-launcher', 'hideDefaultLauncher'),
      DEFAULT_CONFIG.hideDefaultLauncher,
    ),
    googleMapsApiKey: readSearchParam(searchParams, 'google-maps-api-key', 'googleMapsApiKey') || '',
    primaryColor: readSearchParam(searchParams, 'primary-color', 'primaryColor') || '',
    textColor: readSearchParam(searchParams, 'text-color', 'textColor') || '',
    displayMode: (readSearchParam(searchParams, 'display-mode', 'displayMode') as WidgetConfig['displayMode'] | undefined) || undefined,
    buttonText: readSearchParam(searchParams, 'button-text', 'buttonText') || '',
    buttonEmoji: readSearchParam(searchParams, 'button-emoji', 'buttonEmoji') || '',
    buttonPosition: (readSearchParam(searchParams, 'button-position', 'buttonPosition') as WidgetConfig['buttonPosition'] | undefined) || undefined,
    heading: readSearchParam(searchParams, 'heading') || '',
    subheading: readSearchParam(searchParams, 'subheading') || '',
    bgStyle: (readSearchParam(searchParams, 'bg-style', 'bgStyle') as WidgetConfig['bgStyle'] | undefined) || undefined,
    bgColor: readSearchParam(searchParams, 'bg-color', 'bgColor') || '',
    heroImage: readSearchParam(searchParams, 'hero-image', 'heroImage') || '',
    marginTop: readSearchParam(searchParams, 'margin-top', 'marginTop') || '',
    marginBottom: readSearchParam(searchParams, 'margin-bottom', 'marginBottom') || '',
    headingFont: readSearchParam(searchParams, 'heading-font', 'headingFont') || '',
    headingColor: readSearchParam(searchParams, 'heading-color', 'headingColor') || '',
    textFont: readSearchParam(searchParams, 'text-font', 'textFont') || '',
    textColorShortcode: readSearchParam(searchParams, 'text-color-shortcode', 'textColorShortcode') || '',
    headingSize: readSearchParam(searchParams, 'heading-size', 'headingSize') || '',
    textSize: readSearchParam(searchParams, 'text-size', 'textSize') || '',
  }
}

export function getConfig(): WidgetConfig {
  // Try to get from window global (set by WordPress or parent)
  const windowConfig = (window.__PROLEADSAI_CONFIG__ || {}) as Partial<WidgetConfig>
  const urlConfig = getConfigFromUrl()

  return {
    orgId: windowConfig.orgId || urlConfig.orgId || DEFAULT_CONFIG.orgId,
    apiBaseUrl: windowConfig.apiBaseUrl || urlConfig.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
    disableWhenUnavailable: parseBooleanish(
      windowConfig.disableWhenUnavailable ?? urlConfig.disableWhenUnavailable,
      DEFAULT_CONFIG.disableWhenUnavailable,
    ),
    openTriggerId: windowConfig.openTriggerId || urlConfig.openTriggerId || DEFAULT_CONFIG.openTriggerId,
    hideDefaultLauncher: parseBooleanish(
      windowConfig.hideDefaultLauncher ?? urlConfig.hideDefaultLauncher,
      DEFAULT_CONFIG.hideDefaultLauncher,
    ),
    googleMapsApiKey: windowConfig.googleMapsApiKey || urlConfig.googleMapsApiKey || DEFAULT_CONFIG.googleMapsApiKey,
    primaryColor: windowConfig.primaryColor || urlConfig.primaryColor || DEFAULT_CONFIG.primaryColor,
    textColor: windowConfig.textColor || urlConfig.textColor || DEFAULT_CONFIG.textColor,
    displayMode: (windowConfig.displayMode as WidgetConfig['displayMode']) || urlConfig.displayMode || DEFAULT_CONFIG.displayMode,
    buttonText: windowConfig.buttonText || urlConfig.buttonText || DEFAULT_CONFIG.buttonText,
    buttonEmoji: windowConfig.buttonEmoji ?? urlConfig.buttonEmoji ?? DEFAULT_CONFIG.buttonEmoji,
    buttonPosition: (windowConfig.buttonPosition as WidgetConfig['buttonPosition']) || urlConfig.buttonPosition || DEFAULT_CONFIG.buttonPosition,
    heading: windowConfig.heading || urlConfig.heading || DEFAULT_CONFIG.heading,
    subheading: windowConfig.subheading || urlConfig.subheading || DEFAULT_CONFIG.subheading,
    bgStyle: (windowConfig.bgStyle as WidgetConfig['bgStyle']) || urlConfig.bgStyle || DEFAULT_CONFIG.bgStyle,
    bgColor: windowConfig.bgColor || urlConfig.bgColor || DEFAULT_CONFIG.bgColor,
    heroImage: windowConfig.heroImage || urlConfig.heroImage || DEFAULT_CONFIG.heroImage,
    marginTop: windowConfig.marginTop || urlConfig.marginTop || DEFAULT_CONFIG.marginTop,
    marginBottom: windowConfig.marginBottom || urlConfig.marginBottom || DEFAULT_CONFIG.marginBottom,
    headingFont: windowConfig.headingFont || urlConfig.headingFont || DEFAULT_CONFIG.headingFont,
    headingColor: windowConfig.headingColor || urlConfig.headingColor || DEFAULT_CONFIG.headingColor,
    textFont: windowConfig.textFont || urlConfig.textFont || DEFAULT_CONFIG.textFont,
    textColorShortcode: windowConfig.textColorShortcode || urlConfig.textColorShortcode || DEFAULT_CONFIG.textColorShortcode,
    headingSize: windowConfig.headingSize || urlConfig.headingSize || DEFAULT_CONFIG.headingSize,
    textSize: windowConfig.textSize || urlConfig.textSize || DEFAULT_CONFIG.textSize,
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
