<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 overflow-y-auto bg-black/80 flex items-start md:items-center justify-center p-2 md:p-4" style="z-index: 9999999;" @click="handleOutsideClick">
        <div class="bg-white w-full max-w-4xl rounded-xl shadow-xl relative my-4 md:my-0 md:max-h-[90vh] md:overflow-hidden" @click.stop>
          <!-- Close button -->
          <button @click="handleClose" class="absolute right-3 top-3 md:right-4 md:top-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-2 cursor-pointer" aria-label="Close modal">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- Loading State -->
          <div v-if="loading && !currentResult" class="p-6 md:p-8 text-center">
            <div class="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p class="text-base md:text-lg font-medium">Calculating your roof estimate...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-6 md:p-8 text-center">
            <div class="bg-red-50 p-4 rounded-lg mb-4">
              <p class="text-red-600 text-sm md:text-base">{{ error }}</p>
            </div>
            <button @click="handleClose" class="px-5 py-2 bg-stone-800 text-white text-sm md:text-base rounded-full hover:bg-stone-700 cursor-pointer">Try Again</button>
          </div>

          <!-- Results -->
          <div v-else-if="currentResult" class="flex flex-col md:flex-row md:h-full md:max-h-[90vh] md:overflow-hidden">
            <!-- Map section -->
            <div class="w-full md:w-7/12 relative flex-shrink-0 h-[300px] md:h-auto md:min-h-[500px]">
              <RoofMapViewer
                ref="mapRef"
                :coordinates="currentResult?.coordinates"
                :roof-outline-points="currentResult?.roofOutlinePoints || []"
                @marker-moved="onMarkerMoved"
              />
              <div class="absolute bottom-2 left-2 text-white text-xs md:text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">by ProLeadsAI</div>
            </div>

            <!-- Results section -->
            <div class="w-full md:w-5/12 p-4 md:p-6 lg:p-8 bg-stone-50 md:overflow-y-auto">
              <div class="mb-4 md:mb-6">
                <h2 class="result-heading font-semibold text-stone-800 mb-2" :style="headingStyle">{{ address }}</h2>
              </div>

              <!-- Statistics -->
              <div class="grid grid-cols-1 gap-3 md:gap-4 mb-6 md:mb-8">
                <!-- Roof area -->
                <div class="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                  <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    </div>
                    <div>
                      <div class="result-stat-value font-bold text-stone-800" :style="headingStyle">{{ formatNumber(currentResult?.roofAreaSqFt) }} sq ft</div>
                      <div class="result-stat-label text-gray-500" :style="textStyle">Total Roof Square Feet</div>
                    </div>
                  </div>
                </div>

                <!-- Cost estimate -->
                <div class="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                  <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    </div>
                    <div>
                      <div class="result-stat-value font-bold text-stone-800" :style="headingStyle">${{ formatNumber(currentResult?.estimate) }}</div>
                      <div class="result-stat-label text-gray-500" :style="textStyle">Estimated Replacement Cost</div>
                    </div>
                  </div>
                </div>

                <!-- Roof pitch -->
                <div class="bg-white p-3 md:p-4 rounded-lg shadow-sm">
                  <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M2 20h.01"></path>
                      <path d="M7 20v-4"></path>
                      <path d="M12 20v-8"></path>
                      <path d="M17 20v-12"></path>
                      <path d="M22 4v16"></path>
                    </svg>
                    </div>
                    <div>
                      <div class="result-stat-value font-bold text-stone-800" :style="headingStyle">{{ currentResult?.roofPitch?.predominantPitchType || 'Standard' }}</div>
                      <div class="result-stat-label text-gray-500" :style="textStyle">Average Steepness</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Disclaimer -->
              <p class="text-xs text-gray-500 mb-4 md:mb-6">
                This price is based on entry-level asphalt 3-tab shingles. Actual cost may vary
                based on materials and roof complexity.
              </p>

              <!-- Contact form -->
              <ResultModalContactForm
                :coordinates="currentResult?.coordinates"
                :on-success="() => emit('close')"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import RoofMapViewer from './RoofMapViewer.vue'
import ResultModalContactForm from './ResultModalContactForm.vue'
import { getRoofEstimate, type RoofEstimateResult } from '@/utils/api'

const props = defineProps<{
  show: boolean
  address: string
  loading: boolean
  error: string
  result: RoofEstimateResult | null
  textSize?: string
  headingSize?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Dispatch global event when modal closes so launcher can clean up
function handleClose() {
  window.dispatchEvent(new CustomEvent('proleadsai:modal-close'))
  emit('close')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRef = ref<any>(null)
const resultHistory = ref<RoofEstimateResult[]>([])
const currentResultIndex = ref(0)

const currentResult = computed(() => {
  if (resultHistory.value.length === 0) {
    return props.result
  }
  return resultHistory.value[currentResultIndex.value]
})

// Computed styles based on props
const headingStyle = computed(() => {
  if (props.headingSize) {
    return { fontSize: props.headingSize }
  }
  return {}
})

const textStyle = computed(() => {
  if (props.textSize) {
    return { fontSize: props.textSize }
  }
  return {}
})

watch(
  () => props.result,
  (newResult) => {
    if (newResult) {
      resultHistory.value = [newResult]
      currentResultIndex.value = 0
    }
  },
  { immediate: true },
)

async function onMarkerMoved(
  coordinates: { lat: number; lng: number },
  _positionKey: string,
) {
  try {
    const data = await getRoofEstimate({ lat: coordinates.lat, lng: coordinates.lng })
    resultHistory.value.push(data)
    currentResultIndex.value = resultHistory.value.length - 1
  } catch (error) {
    console.error('Error getting estimate:', error)
  }
}

function formatNumber(num: number | undefined | null): string {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString()
}

function handleOutsideClick() {
  handleClose()
}
</script>

<style scoped>
/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Default font sizes - can be overridden by plugin settings */
.result-heading {
  font-size: 1.125rem;
  line-height: 1.5rem;
}

.result-stat-value {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.result-stat-label {
  font-size: 0.875rem;
  line-height: 1.25rem;
}
</style>
