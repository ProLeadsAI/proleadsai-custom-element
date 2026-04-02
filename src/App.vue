<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import RoofEstimateHero from './components/RoofEstimateHero.vue'
import FloatingLauncher from './components/FloatingLauncher.vue'
import { getConfig } from './utils/config'
import { getWidgetAvailability } from './utils/availability'

const config = getConfig()
const widgetVisible = ref(true)

// Display mode: 'inline' (default) or 'floating'
const displayMode = computed(() => config.displayMode || 'inline')
const buttonText = computed(() => config.buttonText || 'Get Roof Estimate')
const buttonEmoji = computed(() => config.buttonEmoji ?? '🏠')
const buttonPosition = computed(() => config.buttonPosition || 'bottom-right')

function handleAvailabilityChanged(event: Event) {
  const customEvent = event as CustomEvent<{ widgetEnabled?: boolean }>
  if (typeof customEvent.detail?.widgetEnabled === 'boolean') {
    widgetVisible.value = customEvent.detail.widgetEnabled
  }
}

onMounted(async () => {
  window.addEventListener('proleadsai:availability-changed', handleAvailabilityChanged as EventListener)

  if (config.disableWhenUnavailable) {
    const availability = await getWidgetAvailability()
    widgetVisible.value = availability.widgetEnabled
  }
})

onUnmounted(() => {
  window.removeEventListener('proleadsai:availability-changed', handleAvailabilityChanged as EventListener)
})
</script>

<template>
  <template v-if="widgetVisible">
  <!-- Floating mode: shows button that opens slide-out panel -->
  <FloatingLauncher 
    v-if="displayMode === 'floating'" 
    :button-text="buttonText"
    :button-emoji="buttonEmoji"
    :position="buttonPosition"
  />
  
  <!-- Inline mode: renders form directly -->
  <RoofEstimateHero v-else />
  </template>
</template>

<style>
/* Global styles for the widget */
*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>
