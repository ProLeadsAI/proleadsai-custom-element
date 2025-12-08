<template>
  <div ref="quoteFormRef" class="bg-stone-800 p-4 md:p-5 rounded-lg">
    <!-- Form -->
    <template v-if="!submitted">
      <h3 class="text-lg md:text-xl font-bold mb-3 md:mb-4">
        <span class="text-white">Want a </span>
        <span class="text-yellow-400">More Accurate</span>
        <span class="text-white"> Quote?</span>
      </h3>
      <p class="text-white text-xs md:text-sm mb-3 md:mb-4">Submit your info and we'll get in touch.</p>
      <div class="space-y-3">
        <input v-model="form.name" type="text" placeholder="Full Name" class="w-full px-4 py-2 rounded-full bg-white text-base" />
        <input v-model="form.email" type="email" placeholder="Email" class="w-full px-4 py-2 rounded-full bg-white text-base" />
        <input v-model="form.phone" type="tel" placeholder="Phone Number" class="w-full px-4 py-2 rounded-full bg-white text-base" />
        <button :disabled="submitting" @click="submitEstimateForm" class="w-full py-2 md:py-3 bg-yellow-400 text-stone-800 font-semibold rounded-full hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60">
          <!-- Loading spinner -->
          <svg v-if="submitting" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
          </svg>
          <!-- Lightning icon -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          {{ submitting ? 'Submitting...' : 'Get My Full Estimate' }}
        </button>
      </div>
    </template>

    <!-- Success Message -->
    <template v-else>
      <div class="text-center py-6">
        <!-- Animated checkmark -->
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-once">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h4 class="text-xl font-bold mb-2" style="color: white !important;">You're All Set!</h4>
        <p class="text-sm mb-6" style="color: rgba(255,255,255,0.9) !important;">Your request has been submitted successfully.</p>
        
        <!-- What to expect -->
        <div class="bg-stone-700/50 rounded-lg p-4 text-left">
          <h5 class="font-semibold text-sm mb-3 flex items-center gap-2" style="color: #facc15 !important;">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            What Happens Next
          </h5>
          <ul class="space-y-3 text-sm">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 bg-yellow-400 text-stone-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p class="font-medium" style="color: white !important;">Expert Review</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.7) !important;">Our roofing specialist will review your property details</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 bg-yellow-400 text-stone-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p class="font-medium" style="color: white !important;">Personal Call</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.7) !important;">We'll call you within 24 hours to discuss your project</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 bg-yellow-400 text-stone-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p class="font-medium" style="color: white !important;">Detailed Quote</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.7) !important;">Receive a customized quote based on your specific needs</p>
              </div>
            </li>
          </ul>
        </div>
        
        <p class="text-xs mt-4" style="color: rgba(255,255,255,0.6) !important;">
          Questions? Call us anytime — we're here to help!
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { submitRoofEstimateForm } from '@/utils/api'

const props = defineProps<{
  coordinates?: { lat: number; lng: number }
  onSuccess?: () => void
}>()

const quoteFormRef = ref<HTMLElement | null>(null)
const form = ref({ name: '', email: '', phone: '' })
const submitting = ref(false)
const submitted = ref(false)

async function submitEstimateForm() {
  if (!form.value.name || !form.value.email || !form.value.phone) return
  submitting.value = true

  try {
    const result = await submitRoofEstimateForm({
      ...form.value,
      coordinates: props.coordinates,
    })
    if (!result || result.error) throw new Error('Failed to submit')
    submitted.value = true
    form.value = { name: '', email: '', phone: '' }
    
    // Auto-scroll to confirmation message after DOM updates
    await nextTick()
    if (quoteFormRef.value) {
      quoteFormRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } catch (err) {
    console.error(err)
    // Show inline error instead of alert
    submitting.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* All styles now use Tailwind classes */
</style>
