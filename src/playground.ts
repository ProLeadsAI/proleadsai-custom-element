import './style.css'
import { createApp } from 'vue'
import App from './App.vue'

// Hardcoded playground config (dev-only)
;(window as any).__PROLEADSAI_CONFIG__ = {
  orgId: '019b1802-0461-728a-845f-0bbd4922c724',
  apiBaseUrl: 'http://0.0.0.0:3000/api',
  googleMapsApiKey: 'AIzaSyBtfB_ITWyC_Vt0jai8AiCVDZBqhnI6xYQ',
  primaryColor: '#ffd400',
  textColor: '#1d1616',
  displayMode: 'inline',
  buttonText: 'Get Roof Estimate',
  buttonEmoji: '🏠',
  buttonPosition: 'bottom-right',
  heading: 'Free Roof Estimate Instantly',
  subheading: '',
  bgStyle: 'none',
  bgColor: '#f5f5f4',
  heroImage: '',
  marginTop: '',
  marginBottom: '',
  headingFont: '',
  headingColor: '#1c1917',
  textFont: '',
  textColorShortcode: '#44403c',
  headingSize: '',
  textSize: '',
}

createApp(App).mount('#app')
