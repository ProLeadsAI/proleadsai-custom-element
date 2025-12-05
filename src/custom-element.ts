import './style.css'
import { createApp } from 'vue'
import App from './App.vue'

// Don't use Shadow DOM - mount directly to allow Tailwind styles to work
class RoofEstimatorElement extends HTMLElement {
  private _app: ReturnType<typeof createApp> | null = null

  connectedCallback() {
    // Read attributes and set global config
    const config = {
      orgId: this.getAttribute('org-id') || '',
      apiBaseUrl: this.getAttribute('api-url') || 'https://next.proleadsai.com/api',
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
    }
    
    console.log('[ProLeadsAI Widget] Config from attributes:', config)
    
    window.__PROLEADSAI_CONFIG__ = config

    // Create a container div inside the element
    const container = document.createElement('div')
    this.appendChild(container)

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
