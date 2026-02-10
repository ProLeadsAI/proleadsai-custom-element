import './style.css'
import { createApp } from 'vue'
import App from './App.vue'

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
class RoofEstimatorElement extends HTMLElement {
  private _app: ReturnType<typeof createApp> | null = null

  connectedCallback() {
    // Read attributes and set global config
    const config = {
      orgId: this.getAttribute('org-id') || '',
      apiBaseUrl: this.getAttribute('api-url') || 'https://app.proleadsai.com/api',
      googleMapsApiKey: this.getAttribute('google-maps-api-key') || '',
      primaryColor: this.getAttribute('primary-color') || '#facc15',
      textColor: this.getAttribute('text-color') || '#1c1917',
      displayMode: this.getAttribute('display-mode') || 'inline',
      buttonText: this.getAttribute('button-text') || 'Get Roof Estimate',
      buttonEmoji: this.getAttribute('button-emoji') ?? '🏠',
      buttonPosition: this.getAttribute('button-position') || 'bottom-right',
      // Inline/shortcode settings
      heading: this.getAttribute('heading') || '',
      subheading: this.getAttribute('subheading') || '',
      bgStyle: this.getAttribute('bg-style') || 'none',
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
    }
    
    console.log('[ProLeadsAI Widget] Config from attributes:', config)
    
    window.__PROLEADSAI_CONFIG__ = config

    // Load Google Fonts into document head (fonts must be in main document to work in Shadow DOM)
    const fontsToLoad = [config.headingFont, config.textFont].filter(Boolean)
    if (fontsToLoad.length > 0) {
      const uniqueFonts = [...new Set(fontsToLoad)]
      const fontFamilies = uniqueFonts.map(f => f.replace(/ /g, '+')).join('&family=')
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
    }

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
customElements.define('roof-estimator', RoofEstimatorElement)

// Also export for manual registration
export { RoofEstimatorElement }

// Global mount function for non-custom-element usage
declare global {
  interface Window {
    ProLeadsAI: {
      mount: (selector: string | HTMLElement, options?: Record<string, unknown>) => void
    }
  }
}

window.ProLeadsAI = {
  mount(selector: string | HTMLElement, options: Record<string, unknown> = {}) {
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector

    if (!container) {
      console.error('ProLeadsAI: Container not found')
      return
    }

    // Set global config
    window.__PROLEADSAI_CONFIG__ = {
      orgId: (options.orgId as string) || (options.teamId as string) || '',
      apiBaseUrl: (options.apiUrl as string) || 'https://next.proleadsai.com/api',
      googleMapsApiKey: (options.googleMapsApiKey as string) || '',
      primaryColor: (options.primaryColor as string) || '#1d4ed8',
    }

    // Create and append the custom element
    const element = document.createElement('roof-estimator')
    container.appendChild(element)
  },
}
