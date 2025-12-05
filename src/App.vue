<script setup lang="ts">
import { computed } from 'vue'
import RoofEstimateHero from './components/RoofEstimateHero.vue'
import FloatingLauncher from './components/FloatingLauncher.vue'
import { getConfig } from './utils/config'

const config = getConfig()

// Display mode: 'inline' (default) or 'floating'
const displayMode = computed(() => config.displayMode || 'inline')
const buttonText = computed(() => config.buttonText || 'Get Roof Estimate')
const buttonEmoji = computed(() => config.buttonEmoji ?? '🏠')
const buttonPosition = computed(() => config.buttonPosition || 'bottom-right')
</script>

<template>
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

<style>
/* Global styles for the widget */
*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>
