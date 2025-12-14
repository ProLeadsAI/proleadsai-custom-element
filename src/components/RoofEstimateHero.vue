<template>
  <section class="relative py-8 px-4 md:py-16 rounded-xl overflow-visible" :style="sectionStyle">
    <div class="container mx-auto max-w-4xl">
      <div class="text-center mb-12 md:mb-14">
        <h1 v-if="headingText" class="text-4xl md:text-5xl font-bold mb-4" :style="headingStyle">
          {{ headingText }}
        </h1>
        <h1 v-else class="text-4xl md:text-5xl font-bold mb-4" :style="headingStyle">
          <span>Free Roof Estimate Instantly</span>
        </h1>
        <p class="text-lg md:text-xl" :style="textStyle">
          {{ subheadingText || 'Enter your address to see your roof size, estimated cost, and steepness.' }}
        </p>
      </div>
    </div>

    <!-- Autocomplete positioned above image -->
    <div :class="heroImageUrl ? 'relative z-[99999] px-4 mb-[-2rem]' : 'px-4'">
      <div class="max-w-4xl mx-auto">
        <div ref="placesMount" class="w-full places-autocomplete-container"></div>
      </div>
    </div>

    <div class="relative">
      <div v-if="heroImageUrl" class="w-full overflow-hidden rounded-xl">
        <img
          :src="heroImageUrl"
          class="w-full object-cover h-72 md:h-auto"
          alt="House with roof"
        />
      </div>

      <p v-if="heroImageUrl" class="absolute bottom-4 left-4 text-white text-sm font-medium">by ProLeadsAI</p>
    </div>

    <!-- Results Modal -->
    <RoofResultModal
      :show="showModal"
      :loading="estimateLoading"
      :error="estimateError"
      :result="estimateResult"
      :address="selectedAddress?.address || ''"
      @close="showModal = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, computed, nextTick, onMounted } from 'vue'
import RoofResultModal from './RoofResultModal.vue'
import { loadGoogleMapsScript } from '@/utils/maps'
import { getConfig, getSessionId } from '@/utils/config'
import { getRoofEstimate, type RoofEstimateResult } from '@/utils/api'

// Get config lazily to ensure custom element has set it
const getConfigValue = () => getConfig()
const config = getConfigValue()

// Default hero image
const DEFAULT_HERO_IMAGE = 'https://cdn.builder.io/api/v1/image/assets/TEMP/7b790725ef0619df1137261025e74d6713b2a206?placeholderIfAbsent=true&apiKey=ada693a1d2ba46d699e3baea8b61070c'

// Computed styles based on config
const sectionStyle = computed(() => {
  const bgStyle = config.bgStyle || 'none'
  const bgColor = config.bgColor || '#f5f5f4'
  const marginTop = config.marginTop || ''
  const marginBottom = config.marginBottom || ''
  
  let style = ''
  
  switch (bgStyle) {
    case 'light':
      style = 'background-color: #fafaf9;'
      break
    case 'dark':
      style = 'background-color: #1c1917; color: white;'
      break
    case 'custom':
      style = `background-color: ${bgColor};`
      break
    default:
      style = 'background-color: #fafaf9;'
  }
  
  if (marginTop) {
    style += ` margin-top: ${marginTop};`
  }
  if (marginBottom) {
    style += ` margin-bottom: ${marginBottom};`
  }
  
  return style
})

const headingText = computed(() => config.heading || '')
const subheadingText = computed(() => config.subheading || '')

function sanitizeFontSize(input: string): string {
  const v = (input || '').trim()
  if (!v) return ''
  // allow common CSS length units only
  if (/^\d+(?:\.\d+)?(px|rem|em|%|vw|vh)$/.test(v)) return v
  return ''
}

// Typography styles
const headingStyle = computed(() => {
  const styles: string[] = []
  if (config.headingFont) {
    styles.push(`font-family: '${config.headingFont}', sans-serif`)
  }
  if (config.headingColor) {
    styles.push(`color: ${config.headingColor}`)
  }
  const headingSize = sanitizeFontSize(config.headingSize || '')
  if (headingSize) {
    styles.push(`font-size: ${headingSize}`)
  }
  return styles.join('; ')
})

const textStyle = computed(() => {
  const styles: string[] = []
  if (config.textFont) {
    styles.push(`font-family: '${config.textFont}', sans-serif`)
  }
  if (config.textColorShortcode) {
    styles.push(`color: ${config.textColorShortcode}`)
  }
  const textSize = sanitizeFontSize(config.textSize || '')
  if (textSize) {
    styles.push(`font-size: ${textSize}`)
  } else if (config.displayMode === 'floating') {
    styles.push('font-size: 1.5rem')
  }
  return styles.join('; ')
})

const heroImageUrl = computed(() => {
  // If heroImage is explicitly 'none', don't show image
  if (config.heroImage === 'none') return ''
  // If heroImage is set (custom URL), use it
  if (config.heroImage) return config.heroImage
  // Default to the standard image
  return DEFAULT_HERO_IMAGE
})

// References
const placesMount = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let placeAutocompleteEl: any = null
const selectedAddress = ref<{
  address: string
  coordinates: { lat: number; lng: number }
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  addressCountry?: string
} | null>(null)
const searchText = ref('')

// Estimate states
const estimateLoading = ref(false)
const estimateError = ref('')
const estimateResult = ref<RoofEstimateResult | null>(null)
const showModal = ref(false)

// Override attachShadow to inject custom styles into PlaceAutocompleteElement
// This is needed because Google uses a closed shadow DOM
const setupShadowDomStyleOverride = () => {
  const originalAttachShadow = Element.prototype.attachShadow
  Element.prototype.attachShadow = function(init: ShadowRootInit) {
    if (this.localName === 'gmp-place-autocomplete') {
      const shadow = originalAttachShadow.call(this, { ...init, mode: 'open' })
      const style = document.createElement('style')
      style.textContent = `
        :host {
          background: transparent !important;
        }
        .widget-container {
          border: none !important;
          background: transparent !important;
        }
        .input-container {
          padding: 0 !important;
          background: transparent !important;
        }
        .focus-ring {
          display: none !important;
        }
        input {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          font-size: 1rem !important;
          padding: 0.5rem 0 !important;
          color: #1c1917 !important;
        }
        input::placeholder {
          color: #a8a29e !important;
        }
        input:placeholder-shown::placeholder {
          opacity: 1 !important;
        }
      `
      shadow.appendChild(style)
      return shadow
    }
    return originalAttachShadow.call(this, init)
  }
}

// Initialize Places on mount - following Google's recommended pattern
const initPlaces = async () => {
  try {
    // Setup shadow DOM style override BEFORE loading Google Maps
    setupShadowDomStyleOverride()

    // Initialize the Google Maps bootstrap loader
    await loadGoogleMapsScript(getConfigValue().googleMapsApiKey)

    // Request the Places library (Google's recommended way)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gm = window.google?.maps as any
    if (typeof gm?.importLibrary === 'function') {
      await gm.importLibrary('places')
    } else if (!window.google?.maps?.places) {
      // importLibrary not available and Places not loaded - can't proceed
      console.error('[ProLeadsAI] Google Maps Places library unavailable. importLibrary() is missing and Places was not pre-loaded.')
      return
    }

    if (!placesMount.value) return

    // Create the PlaceAutocompleteElement
    placeAutocompleteEl = new window.google.maps.places.PlaceAutocompleteElement({
      types: ['address'],
      componentRestrictions: { country: 'us' },
    })

    // Append to our mount container
    placesMount.value.appendChild(placeAutocompleteEl)

    // Set placeholder on the input inside shadow DOM (now accessible since we forced mode: 'open')
    setTimeout(() => {
      try {
        const shadowRoot = placeAutocompleteEl.shadowRoot
        if (shadowRoot) {
          const input = shadowRoot.querySelector('input')
          if (input) {
            input.placeholder = 'Search your address'
          }
        }
      } catch (e) {
        // Ignore if shadow DOM access fails
      }
    }, 100)

    // Listen for place selection
    placeAutocompleteEl.addEventListener('gmp-select', async ({ placePrediction }: any) => {
      try {
        const place = placePrediction.toPlace()
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] })

        const formattedAddress = place.formattedAddress || ''
        const location = place.location
        const addressComponents = place.addressComponents || []

        if (!formattedAddress) return
        searchText.value = formattedAddress

        // Parse address components
        const getComponent = (type: string) => {
          const comp = addressComponents.find((c: any) => c.types?.includes(type))
          return comp?.longText || comp?.shortText || ''
        }
        const getComponentShort = (type: string) => {
          const comp = addressComponents.find((c: any) => c.types?.includes(type))
          return comp?.shortText || comp?.longText || ''
        }

        const streetNumber = getComponent('street_number')
        const route = getComponent('route')
        const streetAddress = `${streetNumber} ${route}`.trim()
        const locality = getComponent('locality') || getComponent('administrative_area_level_3')
        const region = getComponentShort('administrative_area_level_1')
        const postalCode = getComponent('postal_code')
        const country = getComponentShort('country')

        if (location) {
          const lat = typeof location.lat === 'function' ? location.lat() : location.lat
          const lng = typeof location.lng === 'function' ? location.lng() : location.lng
          if (typeof lat === 'number' && typeof lng === 'number') {
            selectedAddress.value = {
              address: formattedAddress,
              coordinates: { lat, lng },
              streetAddress,
              addressLocality: locality,
              addressRegion: region,
              postalCode,
              addressCountry: country,
            }
          }
        }

        handleEstimateClick()
      } catch (error) {
        console.error('[ProLeadsAI] Error handling place selection:', error)
      }
    })
  } catch (error) {
    console.error('[ProLeadsAI] Error initializing Places:', error)
  }
}

onMounted(() => {
  initPlaces()
})

// Handle the Get Estimate button click
const handleEstimateClick = async () => {
  estimateError.value = ''

  if (!selectedAddress.value && !searchText.value.trim()) {
    estimateError.value = 'Please enter an address first'
    return
  }

  showModal.value = true
  estimateLoading.value = true
  
  // Dispatch event to close the slide-out panel
  window.dispatchEvent(new CustomEvent('proleadsai:modal-open'))

  try {
    let params: {
      lat?: number
      lng?: number
      address?: string
      streetAddress?: string
      addressLocality?: string
      addressRegion?: string
      postalCode?: string
      addressCountry?: string
    } = {}

    if (selectedAddress.value && selectedAddress.value.coordinates) {
      params = {
        lat: selectedAddress.value.coordinates.lat,
        lng: selectedAddress.value.coordinates.lng,
        streetAddress: selectedAddress.value.streetAddress,
        addressLocality: selectedAddress.value.addressLocality,
        addressRegion: selectedAddress.value.addressRegion,
        postalCode: selectedAddress.value.postalCode,
        addressCountry: selectedAddress.value.addressCountry,
      }
    } else {
      params = { address: searchText.value.trim() }
    }

    const response = await getRoofEstimate(params)
    estimateResult.value = response
    console.log('API response:', response)
  } catch (error) {
    console.error('Error getting roof estimate:', error)
    estimateError.value =
      error instanceof Error ? error.message : 'Failed to get your roof estimate. Please try again.'
  } finally {
    estimateLoading.value = false
  }
}

// Clean up on component unmount
onUnmounted(() => {
  if (placeAutocompleteEl && placeAutocompleteEl.parentNode) {
    placeAutocompleteEl.parentNode.removeChild(placeAutocompleteEl)
  }
})

// Initialize session
getSessionId()
</script>

<style scoped>
/* Style the PlaceAutocompleteElement container with rounded corners */
.places-autocomplete-container {
  background: white;
  border-radius: 9999px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 0.5rem 1rem;
  overflow: visible;
}

/* Style the Google PlaceAutocompleteElement input */
.places-autocomplete-container :deep(gmp-place-autocomplete) {
  width: 100%;
  --gmp-mat-input-border-radius: 9999px;
}

.places-autocomplete-container :deep(input) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  width: 100%;
  font-size: 1rem;
  padding: 0.5rem 0;
}

/* Google Places dropdown styling */
:deep(.pac-container) {
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-top: 5px;
  padding: 4px 0;
  border: 1px solid #eee;
}
:deep(.pac-item) {
  padding: 8px 10px;
  cursor: pointer;
}
:deep(.pac-item:hover) {
  background-color: #f7fafc;
}

/* Helper hint below input */
.helper-hint-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}

.helper-hint {
  font-size: 0.875rem;
  color: #1c1917;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 0;
}
</style>

<style>
/* Global styles for Google Places Autocomplete dropdown (rendered in body) */
.gmp-place-autocomplete-predictions-container,
.pac-container {
  z-index: 999999 !important;
}
</style>
