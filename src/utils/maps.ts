// Shared utility to load the Google Maps JS API only once per page

let loadingPromise: Promise<void> | null = null

export function loadGoogleMapsScript(apiKey: string, libraries: string[] = ['places']): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject('Not in browser')
  if (window.google && window.google.maps) return Promise.resolve()

  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject())
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    const libs = libraries.length ? `&libraries=${libraries.join(',')}` : ''
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${libs}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject()
    document.head.appendChild(script)
  })
  return loadingPromise
}
