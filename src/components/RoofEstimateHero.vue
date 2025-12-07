<template>
  <section class="relative py-8 px-4 md:py-16 rounded-xl overflow-hidden" :style="sectionStyle">
    <div class="container mx-auto max-w-4xl">
      <div class="text-center mb-12 md:mb-16">
        <h1 v-if="headingText" class="text-4xl md:text-5xl font-bold mb-4" :class="headingClass">
          {{ headingText }}
        </h1>
        <h1 v-else class="text-4xl md:text-5xl font-bold mb-4">
          <span :class="headingClass">Free</span><br class="md:hidden" />
          <span class="text-[#9d867b]"> Roof Estimate </span><br class="md:hidden" />
          <span :class="headingClass">Instantly</span>
        </h1>
        <p class="text-lg md:text-xl" :class="subheadingClass">
          {{ subheadingText || 'Enter your address to see your roof size, estimated cost, and steepness.' }}
        </p>
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

      <div :class="heroImageUrl ? 'absolute left-0 right-0 top-0 transform -translate-y-1/2 px-4' : 'px-4'">
        <div class="bg-white rounded-full shadow-lg py-3 px-4 max-w-4xl mx-auto overflow-hidden">
          <div class="flex flex-row items-center relative">
            <svg class="w-6 h-6 mr-3 flex-shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <input
              ref="addressInput"
              v-model="searchText"
              type="text"
              placeholder="Enter your address"
              class="w-full py-2 outline-none bg-transparent pr-8 md:pr-8 text-stone-800 text-base"
              @focus="handleInputFocus"
              @keyup.enter="searchText.trim() && handleEstimateClick()"
            />
          </div>
        </div>
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
import { ref, onUnmounted, watch, computed } from 'vue'
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

const headingClass = computed(() => {
  return config.bgStyle === 'dark' ? 'text-white' : 'text-stone-800'
})

const subheadingClass = computed(() => {
  return config.bgStyle === 'dark' ? 'text-gray-300' : 'text-stone-800'
})

const headingText = computed(() => config.heading || '')
const subheadingText = computed(() => config.subheading || '')

const heroImageUrl = computed(() => {
  // If heroImage is explicitly 'none', don't show image
  if (config.heroImage === 'none') return ''
  // If heroImage is set (custom URL), use it
  if (config.heroImage) return config.heroImage
  // Default to the standard image
  return DEFAULT_HERO_IMAGE
})

// References
const addressInput = ref<HTMLInputElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autocomplete = ref<any>(null)
const placesApiLoaded = ref(false)
const selectedAddress = ref<{
  address: string
  coordinates: { lat: number; lng: number }
} | null>(null)
const searchText = ref('')

// Estimate states
const estimateLoading = ref(false)
const estimateError = ref('')
const estimateResult = ref<RoofEstimateResult | null>(null)
const showModal = ref(false)

// Function to handle input focus - load Places API
const handleInputFocus = () => {
  console.log('[ProLeadsAI] Input focused, placesApiLoaded:', placesApiLoaded.value)
  if (!placesApiLoaded.value) {
    loadGooglePlacesApi()
  }
}

// Load Google Places API
const loadGooglePlacesApi = async () => {
  if (window.google && window.google.maps && window.google.maps.places) {
    initPlacesAutocomplete()
    return
  }

  try {
    await loadGoogleMapsScript(getConfigValue().googleMapsApiKey, ['places'])
    placesApiLoaded.value = true
    initPlacesAutocomplete()
  } catch (err) {
    console.error('Failed to load Google Places API', err)
  }
}

// Initialize Places Autocomplete
const initPlacesAutocomplete = () => {
  if (!addressInput.value) return

  try {
    // Try new PlaceAutocompleteElement first, fall back to legacy Autocomplete
    if (window.google.maps.places.PlaceAutocompleteElement) {
      console.log('[ProLeadsAI] Using new PlaceAutocompleteElement API')
      // For new API, we need to use a different approach
      // Fall back to legacy for now as it still works
    }
    
    // Use legacy Autocomplete (still works, just deprecated for new customers)
    autocomplete.value = new window.google.maps.places.Autocomplete(addressInput.value, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    })

    autocomplete.value.addListener('place_changed', handlePlaceChanged)
    console.log('[ProLeadsAI] Places autocomplete initialized')
  } catch (error) {
    console.error('[ProLeadsAI] Error initializing Places autocomplete:', error)
  }
}

// Handle place selection
const handlePlaceChanged = () => {
  try {
    const place = autocomplete.value.getPlace()

    if (!place || !place.formatted_address) {
      console.warn('Incomplete place data returned:', place)
      return
    }

    if (!place.geometry || !place.geometry.location) {
      console.warn('No geometry available for place:', place.formatted_address)
      searchText.value = place.formatted_address
      return
    }

    searchText.value = place.formatted_address

    selectedAddress.value = {
      address: place.formatted_address,
      coordinates: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    }

    console.log('Selected address:', selectedAddress.value)
    handleEstimateClick()
  } catch (error) {
    console.error('Error handling place changed:', error)
  }
}

// Handle the Get Estimate button click
const handleEstimateClick = async () => {
  estimateError.value = ''

  if (!selectedAddress.value && (!addressInput.value || !searchText.value.trim())) {
    estimateError.value = 'Please enter an address first'
    addressInput.value?.focus()
    return
  }

  showModal.value = true
  estimateLoading.value = true
  
  // Dispatch event to close the slide-out panel
  window.dispatchEvent(new CustomEvent('proleadsai:modal-open'))

  try {
    let params: { lat?: number; lng?: number; address?: string } = {}

    if (selectedAddress.value && selectedAddress.value.coordinates) {
      params = {
        lat: selectedAddress.value.coordinates.lat,
        lng: selectedAddress.value.coordinates.lng,
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

// Apply custom styles whenever the address input gets focus
watch(addressInput, (newVal) => {
  if (newVal && placesApiLoaded.value) {
    newVal.addEventListener('focus', () => {
      setTimeout(() => {
        const pacContainers = document.querySelectorAll('.pac-container')
        pacContainers.forEach((container) => {
          ;(container as HTMLElement).style.padding = '4px 0'
          ;(container as HTMLElement).style.marginTop = '5px'
          ;(container as HTMLElement).style.boxShadow =
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          ;(container as HTMLElement).style.borderRadius = '12px'
        })
      }, 300)
    })
  }
})

// Clean up on component unmount
onUnmounted(() => {
  if (autocomplete.value && window.google && window.google.maps && window.google.maps.event) {
    window.google.maps.event.clearInstanceListeners(autocomplete.value)
  }
})

// Initialize session
getSessionId()
</script>

<style scoped>
/* Google Places autocomplete styling */
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
</style>
