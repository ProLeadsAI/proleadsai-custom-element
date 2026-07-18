import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import { loadConfiguredFonts, type WidgetConfig } from './utils/config'

// Resolve the widget CSS URL from the current script's location
function getWidgetCssUrl(): string {
  // Try to find our script tag
  const scripts = document.querySelectorAll('script[src]')
  for (const script of scripts) {
    const src = (script as HTMLScriptElement).src
    if (src.includes('proleadsai-widget') || src.includes('proleadsai-widget-ce')) {
      // Replace .js with .css, or find sibling CSS file
      const baseUrl = src.substring(0, src.lastIndexOf('/'))
      // CSS is in ../css/ relative to js/
      return baseUrl.replace('/js', '/css') + '/proleadsai-widget.css'
    }
  }
  // Fallback: try to find existing link tag
  const links = document.querySelectorAll('link[href*="proleadsai-widget"]')
  if (links.length > 0) {
    return (links[0] as HTMLLinkElement).href
  }
  return ''
}

// Shadow DOM custom element for full CSS isolation
class ProLeadsAIEstimatorElement extends HTMLElement {
  private _app: ReturnType<typeof createApp> | null = null

  connectedCallback() {
    // Read attributes and set global config
    const estimatorType: WidgetConfig['estimatorType'] = this.getAttribute('type') === 'solar' ? 'solar' : 'roofing'
    const config = {
      estimatorType,
      orgId: this.getAttribute('org-id') || '',
      apiBaseUrl: this.getAttribute('api-url') || 'https://app.proleadsai.com/api',
      disableWhenUnavailable: this.hasAttribute('disable-when-unavailable') && this.getAttribute('disable-when-unavailable') !== 'false',
      openTriggerId: this.getAttribute('open-trigger-id') || '',
      hideDefaultLauncher: this.hasAttribute('hide-default-launcher') && this.getAttribute('hide-default-launcher') !== 'false',
      googleMapsApiKey: this.getAttribute('google-maps-api-key') || '',
      primaryColor: this.getAttribute('primary-color') || (estimatorType === 'solar' ? '#2563eb' : '#facc15'),
      textColor: this.getAttribute('text-color') || '#1c1917',
      displayMode: (this.getAttribute('display-mode') as WidgetConfig['displayMode'] | null) || 'inline',
      buttonText: this.getAttribute('button-text') || (estimatorType === 'solar' ? 'See Solar Potential' : 'Get Roof Estimate'),
      buttonEmoji: this.getAttribute('button-emoji') ?? (estimatorType === 'solar' ? '☀️' : '🏠'),
      buttonPosition: (this.getAttribute('button-position') as WidgetConfig['buttonPosition'] | null) || 'bottom-right',
      // Inline/shortcode settings
      heading: this.getAttribute('heading') || '',
      subheading: this.getAttribute('subheading') || '',
      bgStyle: (this.getAttribute('bg-style') as WidgetConfig['bgStyle'] | null) || 'none',
      bgColor: this.getAttribute('bg-color') || '#f5f5f4',
      heroImage: this.getAttribute('hero-image') || '',
      marginTop: this.getAttribute('margin-top') || '',
      marginBottom: this.getAttribute('margin-bottom') || '',
      // Typography
      headingFont: this.getAttribute('heading-font') || '',
      headingColor: this.getAttribute('heading-color') || '#1c1917',
      textFont: this.getAttribute('text-font') || '',
      textColorShortcode: this.getAttribute('text-color-shortcode') || this.getAttribute('text-color') || '#44403c',
      headingSize: this.getAttribute('heading-size') || '',
      textSize: this.getAttribute('text-size') || '',
      countryCode: this.getAttribute('country-code') || (estimatorType === 'solar' ? 'gb' : 'us'),
      source: this.getAttribute('source') || 'widget',
      hideBranding: this.hasAttribute('hide-branding') && this.getAttribute('hide-branding') !== 'false',
      parentOrigin: this.getAttribute('parent-origin') || '',
      analyticsConsent: this.hasAttribute('analytics-consent') && this.getAttribute('analytics-consent') !== 'false',
    }
    
    console.log('[ProLeadsAI Widget] Config from attributes:', config)
    
    window.__PROLEADSAI_CONFIG__ = config

    // Fonts must be loaded in the main document so the shadow root can inherit them.
    loadConfiguredFonts(config)

    // Inject Google Places autocomplete styles into document head
    // (.pac-container is appended to <body> by Google, outside Shadow DOM)
    if (!document.getElementById('proleadsai-pac-styles')) {
      const pacStyle = document.createElement('style')
      pacStyle.id = 'proleadsai-pac-styles'
      pacStyle.textContent = `
        .pac-container {
          z-index: 100000 !important;
          background-color: white !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          margin-top: 5px !important;
          padding: 4px 0 !important;
          border: 1px solid #eee !important;
          font-family: inherit !important;
        }
        .pac-item {
          padding: 10px 12px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
        .pac-item:hover { background-color: #f7fafc !important; }
        .pac-item-query { font-size: 14px !important; }
        .pac-icon { margin-right: 8px !important; }
      `
      document.head.appendChild(pacStyle)
    }

    // Create Shadow DOM for full CSS isolation
    const shadow = this.attachShadow({ mode: 'open' })

    // Load widget CSS into Shadow DOM via <link> tag
    const cssUrl = getWidgetCssUrl()
    if (cssUrl) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = cssUrl
      shadow.appendChild(link)
    }

    // Create teleport target inside Shadow DOM (for modals, overlays, panels)
    const teleportTarget = document.createElement('div')
    teleportTarget.id = 'proleadsai-teleport'
    shadow.appendChild(teleportTarget)

    // Expose shadow root and teleport target globally so Vue components can use them
    window.__PROLEADSAI_SHADOW_ROOT__ = shadow
    window.__PROLEADSAI_TELEPORT__ = teleportTarget

    // Create Vue mount container inside Shadow DOM
    const container = document.createElement('div')
    shadow.appendChild(container)

    // Mount Vue app
    this._app = createApp(App)
    this._app.mount(container)
  }

  disconnectedCallback() {
    if (this._app) {
      this._app.unmount()
      this._app = null
    }
  }
}

// Register the custom element
class RoofEstimatorElement extends ProLeadsAIEstimatorElement {}

if (!customElements.get('proleadsai-estimator'))
  customElements.define('proleadsai-estimator', ProLeadsAIEstimatorElement)
if (!customElements.get('roof-estimator'))
  customElements.define('roof-estimator', RoofEstimatorElement)

// Also export for manual registration
export { ProLeadsAIEstimatorElement, RoofEstimatorElement }

window.ProLeadsAI = {
  mount(selector: string | HTMLElement, options: Record<string, unknown> = {}) {
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector

    if (!container) {
      console.error('ProLeadsAI: Container not found')
      return
    }

    // Mirror every supported option to attributes. connectedCallback is the
    // canonical configuration path, so programmatic mounts and HTML embeds
    // behave identically instead of the attribute defaults replacing options.
    const element = document.createElement('proleadsai-estimator')
    element.setAttribute('type', options.type === 'solar' ? 'solar' : 'roofing')
    element.setAttribute('org-id', (options.orgId as string) || (options.teamId as string) || '')
    element.setAttribute('api-url', (options.apiUrl as string) || 'https://app.proleadsai.com/api')

    const stringOptions: Array<[string, string]> = [
      ['openTriggerId', 'open-trigger-id'],
      ['googleMapsApiKey', 'google-maps-api-key'],
      ['primaryColor', 'primary-color'],
      ['textColor', 'text-color'],
      ['displayMode', 'display-mode'],
      ['buttonText', 'button-text'],
      ['buttonEmoji', 'button-emoji'],
      ['buttonPosition', 'button-position'],
      ['heading', 'heading'],
      ['subheading', 'subheading'],
      ['bgStyle', 'bg-style'],
      ['bgColor', 'bg-color'],
      ['heroImage', 'hero-image'],
      ['marginTop', 'margin-top'],
      ['marginBottom', 'margin-bottom'],
      ['headingFont', 'heading-font'],
      ['headingColor', 'heading-color'],
      ['textFont', 'text-font'],
      ['textColorShortcode', 'text-color-shortcode'],
      ['headingSize', 'heading-size'],
      ['textSize', 'text-size'],
      ['countryCode', 'country-code'],
      ['source', 'source'],
      ['parentOrigin', 'parent-origin'],
    ]
    for (const [optionName, attributeName] of stringOptions) {
      const value = options[optionName]
      if (value !== undefined && value !== null)
        element.setAttribute(attributeName, String(value))
    }

    if (!options.countryCode)
      element.setAttribute('country-code', options.type === 'solar' ? 'gb' : 'us')
    if (!options.source)
      element.setAttribute('source', 'javascript-api')

    const booleanOptions: Array<[string, string]> = [
      ['disableWhenUnavailable', 'disable-when-unavailable'],
      ['hideDefaultLauncher', 'hide-default-launcher'],
      ['hideBranding', 'hide-branding'],
      ['analyticsConsent', 'analytics-consent'],
    ]
    for (const [optionName, attributeName] of booleanOptions) {
      const value = options[optionName]
      if (value === true || value === 1 || value === 'true')
        element.setAttribute(attributeName, 'true')
    }

    container.appendChild(element)
  },
  openSearch() {
    window.dispatchEvent(new CustomEvent('proleadsai:open-search'))
  },
  openEstimator(type = 'roofing') {
    window.dispatchEvent(new CustomEvent('proleadsai:open-search', { detail: { estimatorType: type } }))
  },
}
