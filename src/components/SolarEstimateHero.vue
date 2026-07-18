<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { createSolarEstimate, isSolarEstimateResult, type SolarEstimateResponse } from '@/utils/api'
import { emitEstimatorEvent } from '@/utils/analytics'
import { getConfig, loadConfiguredFonts } from '@/utils/config'
import { loadGoogleMapsScript } from '@/utils/maps'
import { postToTrustedParent } from '@/utils/messaging'
import SolarResultModal from './SolarResultModal.vue'

interface PlaceAddressComponent {
  types?: string[]
  longText?: string
  shortText?: string
}

interface SelectedPlace {
  formattedAddress?: string
  location?: { lat: number | (() => number); lng: number | (() => number) }
  addressComponents?: PlaceAddressComponent[]
  fetchFields: (options: { fields: string[] }) => Promise<void>
}

interface PlacePredictionSelectEvent extends Event {
  placePrediction: { toPlace: () => SelectedPlace }
}

type PlacesAutocompleteElement = HTMLElement & {
  includedRegionCodes: string[]
  placeholder: string
}

const emit = defineEmits<{ (event: 'modal-opened'): void }>()
const config = getConfig()
const placesMount = ref<HTMLElement | null>(null)
let autocomplete: PlacesAutocompleteElement | null = null
let shadowPatchInstalled = false
let activeRequest = 0
const loading = ref(false)
const error = ref('')
const result = ref<SolarEstimateResponse | null>(null)
const showModal = ref(false)

const heading = computed(() => result.value?.branding?.solarTitle || config.heading || 'See your home’s solar potential')
const subheading = computed(() => result.value?.branding?.solarSubtitle || config.subheading || 'Enter a UK address to preview a preliminary panel layout, system size, generation and electricity savings.')
const primary = computed(() => result.value?.branding?.primaryColor || config.primaryColor || '#2563eb')
const fontFamily = computed(() => result.value?.branding?.fontFamily || config.textFont)
const showBranding = computed(() => !config.hideBranding && !result.value?.branding?.hideProLeadsBranding)
const sectionStyle = computed(() => ({
  '--solar-accent': primary.value,
  backgroundColor: config.bgStyle === 'custom' ? config.bgColor : config.bgStyle === 'dark' ? '#0c0a09' : '#fafaf9',
  color: config.bgStyle === 'dark' ? '#fff' : config.headingColor || '#1c1917',
  marginTop: config.marginTop || undefined,
  marginBottom: config.marginBottom || undefined,
  fontFamily: fontFamily.value ? `'${fontFamily.value}', sans-serif` : undefined
}))

function notifyParent(open: boolean) {
  if (window.parent !== window)
    postToTrustedParent({ type: open ? 'proleadsai:modal-open' : 'proleadsai:modal-close', estimatorType: 'solar' })
}

watch(showModal, (open) => {
  notifyParent(open)
  window.dispatchEvent(new CustomEvent(open ? 'proleadsai:modal-open' : 'proleadsai:modal-close'))
})

function setupAutocompleteShadowStyles() {
  if (shadowPatchInstalled)
    return

  const original = Element.prototype.attachShadow
  const patched: typeof Element.prototype.attachShadow = function(this: Element, init: ShadowRootInit) {
    const root = original.call(this, this.localName === 'gmp-place-autocomplete' ? { ...init, mode: 'open' } : init)
    if (this.localName === 'gmp-place-autocomplete') {
      const style = document.createElement('style')
      style.textContent = `input{font:inherit!important;border:0!important;outline:0!important;padding:.65rem .2rem!important;color:#1c1917!important;background:transparent!important}.input-container,.widget-container{border:0!important;background:transparent!important;padding:0!important}.focus-ring{display:none!important}`
      root.appendChild(style)
    }
    return root
  }
  Element.prototype.attachShadow = patched
  shadowPatchInstalled = true
}

async function handlePlaceSelection(event: Event) {
  const place = (event as PlacePredictionSelectEvent).placePrediction.toPlace()
  const requestId = ++activeRequest

  try {
    await place.fetchFields({ fields: ['formattedAddress', 'location', 'addressComponents'] })
    if (requestId !== activeRequest)
      return

    const location = place.location
    const formattedAddress = place.formattedAddress || ''
    if (!location || !formattedAddress)
      throw new Error('Please select a complete address from the list')

    const components = place.addressComponents || []
    const component = (type: string, short = false) => {
      const value = components.find(item => item.types?.includes(type))
      return (short ? value?.shortText : value?.longText) || value?.shortText || value?.longText || ''
    }
    const addressCountry = component('country', true).toUpperCase()
    if (!['GB', 'UK'].includes(addressCountry))
      throw new Error('Please choose an address in Great Britain')

    const streetAddress = `${component('street_number')} ${component('route')}`.trim()
    const coordinates = {
      lat: typeof location.lat === 'function' ? location.lat() : location.lat,
      lng: typeof location.lng === 'function' ? location.lng() : location.lng
    }

    emitEstimatorEvent('proleadsai_address_submit')
    showModal.value = true
    loading.value = true
    error.value = ''
    result.value = null
    emit('modal-opened')

    result.value = await createSolarEstimate({
      coordinates,
      address: {
        formattedAddress,
        streetAddress,
        addressLocality: component('postal_town') || component('locality') || component('administrative_area_level_3'),
        addressRegion: component('administrative_area_level_1', true),
        postalCode: component('postal_code'),
        // Always send the verified ISO signal rather than a localized country name.
        addressCountry: 'GB'
      }
    })
    if (requestId !== activeRequest)
      return

    if (isSolarEstimateResult(result.value)) {
      emitEstimatorEvent('proleadsai_estimate_view', {
        quality: result.value.solar.quality,
        panelCount: result.value.solar.recommendedPanelCount
      })
    }
    else {
      emitEstimatorEvent('proleadsai_estimate_view', { coverage: 'unavailable', manualFollowup: true })
    }
  }
  catch (reason) {
    if (requestId !== activeRequest)
      return
    error.value = reason instanceof Error ? reason.message : 'We could not create this estimate'
    emitEstimatorEvent('proleadsai_estimator_error', { stage: showModal.value ? 'estimate' : 'address' })
  }
  finally {
    if (requestId === activeRequest)
      loading.value = false
  }
}

async function initialisePlaces() {
  try {
    setupAutocompleteShadowStyles()
    await loadGoogleMapsScript(config.googleMapsApiKey)
    const maps = window.google?.maps
    if (typeof maps?.importLibrary === 'function')
      await maps.importLibrary('places')
    if (!placesMount.value || !window.google?.maps?.places?.PlaceAutocompleteElement)
      throw new Error('Address search is unavailable')

    const PlaceAutocompleteElement = window.google.maps.places.PlaceAutocompleteElement as new (options?: Record<string, unknown>) => PlacesAutocompleteElement
    autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ['gb']
    })
    autocomplete.includedRegionCodes = ['gb']
    autocomplete.placeholder = 'Start typing your UK address'
    placesMount.value.appendChild(autocomplete)
    autocomplete.addEventListener('gmp-select', handlePlaceSelection)
  }
  catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Address search could not be loaded'
    emitEstimatorEvent('proleadsai_estimator_error', { stage: 'places' })
  }
}

watch(() => result.value?.branding?.fontFamily, (value) => {
  if (value)
    loadConfiguredFonts({ headingFont: value, textFont: value })
})

onMounted(() => {
  emitEstimatorEvent('proleadsai_estimator_open')
  initialisePlaces()
})

onUnmounted(() => {
  activeRequest += 1
  autocomplete?.removeEventListener('gmp-select', handlePlaceSelection)
  autocomplete?.remove()
  autocomplete = null
})
</script>

<template>
  <section class="relative overflow-visible rounded-2xl px-4 py-10 md:px-8 md:py-16" :style="sectionStyle">
    <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
      <div class="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
    </div>
    <div class="relative mx-auto max-w-4xl text-center">
      <img v-if="result?.branding?.logoUrl" :src="result.branding.logoUrl" alt="" class="mx-auto mb-5 max-h-16 max-w-56 object-contain" />
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--solar-accent)]">UK residential solar</p>
      <h1 class="text-3xl font-bold leading-tight md:text-5xl" :style="fontFamily ? `font-family:'${fontFamily}',sans-serif` : undefined">{{ heading }}</h1>
      <p class="mx-auto mt-4 max-w-2xl text-base opacity-75 md:text-lg">{{ subheading }}</p>

      <div class="mx-auto mt-8 max-w-3xl rounded-2xl bg-white p-2 text-left shadow-xl ring-1 ring-black/5">
        <div ref="placesMount" class="min-h-12 w-full px-3" />
      </div>
      <p v-if="error && !showModal" class="mx-auto mt-3 max-w-2xl rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

      <div class="mt-8 grid grid-cols-3 gap-2 text-left text-xs md:gap-4 md:text-sm">
        <div class="rounded-xl bg-white/75 p-3 shadow-sm"><strong class="block text-stone-900">Roof analysis</strong><span class="text-stone-500">Google solar imagery</span></div>
        <div class="rounded-xl bg-white/75 p-3 shadow-sm"><strong class="block text-stone-900">Panel options</strong><span class="text-stone-500">Adjust the layout</span></div>
        <div class="rounded-xl bg-white/75 p-3 shadow-sm"><strong class="block text-stone-900">Savings report</strong><span class="text-stone-500">UK tariff assumptions</span></div>
      </div>
      <p class="mt-5 text-xs opacity-60">Preliminary estimate only · formal survey required</p>
      <p v-if="showBranding" class="mt-3 text-[11px] opacity-50">Powered by ProLeadsAI</p>
    </div>

    <SolarResultModal :show="showModal" :loading="loading" :error="error" :result="result" @close="showModal = false" />
  </section>
</template>
