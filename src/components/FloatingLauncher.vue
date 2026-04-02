<template>
  <!-- Floating Button - Horizontal (bottom positions) -->
  <button
    v-if="!isOpen && !isEdgePosition"
    @click="openPanel"
    class="fixed z-[99997] flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-full shadow-lg transition-all hover:scale-105 cursor-pointer max-w-[calc(100vw-2rem)] whitespace-nowrap"
    :style="buttonStyle"
  >
    <span v-if="buttonEmoji" class="text-lg flex-shrink-0">{{ buttonEmoji }}</span>
    <span class="truncate">{{ buttonText }}</span>
  </button>

  <!-- Floating Button - Vertical (edge positions) -->
  <button
    v-if="!isOpen && isEdgePosition"
    @click="openPanel"
    class="fixed z-[99997] flex items-center gap-2 px-4 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 cursor-pointer"
    :class="edgeButtonClass"
    :style="edgeButtonStyle"
  >
    <span v-if="buttonEmoji" class="text-lg">{{ buttonEmoji }}</span>
    <span class="whitespace-nowrap">{{ buttonText }}</span>
  </button>

  <!-- Overlay -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]"
        @click="closePanel"
      ></div>
    </Transition>
  </Teleport>

  <!-- Slide-out Panel -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <Transition name="slide">
      <div
        v-if="isOpen"
        class="fixed top-0 right-0 bottom-0 w-[420px] max-w-full z-[99999] bg-stone-50 shadow-[-4px_0_20px_rgba(0,0,0,0.15)] overflow-y-auto"
      >
        <!-- Close button -->
        <button
          @click="closePanel"
          class="absolute top-4 left-[-52px] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer z-10 md:flex hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <!-- Mobile close button -->
        <button
          @click="closePanel"
          class="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer z-10 md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Widget content -->
        <RoofEstimateHero @modal-opened="onModalOpened" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import RoofEstimateHero from './RoofEstimateHero.vue'
import { getConfig } from '@/utils/config'

const props = defineProps<{
  buttonText?: string
  buttonEmoji?: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'left-edge' | 'right-edge'
}>()

const config = getConfig()
const isOpen = ref(false)

const teleportTarget = computed(() => window.__PROLEADSAI_TELEPORT__ || null)

const isEdgePosition = computed(() => {
  const pos = props.position || config.buttonPosition
  return pos === 'left-edge' || pos === 'right-edge'
})

const buttonStyle = computed(() => {
  const primary = config.primaryColor || '#facc15'
  const textColor = config.textColor || '#1c1917'
  const positions: Record<string, string> = {
    'bottom-right': 'bottom: 2rem; right: 2rem;',
    'bottom-left': 'bottom: 2rem; left: 2rem;',
    'bottom-center': 'bottom: 2rem; left: 50%; transform: translateX(-50%);',
  }
  
  return `
    background-color: ${primary};
    color: ${textColor};
    ${positions[props.position || config.buttonPosition] || positions['bottom-right']}
  `
})

const edgeButtonClass = computed(() => {
  const pos = props.position || config.buttonPosition
  // Left edge: rounded on right side, Right edge: rounded on left side
  return pos === 'left-edge' ? 'rounded-r-lg' : 'rounded-l-lg'
})

const edgeButtonStyle = computed(() => {
  const primary = config.primaryColor || '#facc15'
  const textColor = config.textColor || '#1c1917'
  const pos = props.position || config.buttonPosition
  
  if (pos === 'left-edge') {
    // Left edge: text reads bottom to top using vertical-lr + rotate text
    return `
      background-color: ${primary};
      color: ${textColor};
      writing-mode: vertical-lr;
      text-orientation: sideways;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
    `
  } else {
    // Right edge: text reads top to bottom
    return `
      background-color: ${primary};
      color: ${textColor};
      writing-mode: vertical-rl;
      text-orientation: mixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
    `
  }
})

const buttonText = computed(() => props.buttonText || config.buttonText || 'Get Roof Estimate')
const buttonEmoji = computed(() => props.buttonEmoji ?? config.buttonEmoji ?? '🏠')

function openPanel() {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closePanel() {
  isOpen.value = false
  document.body.style.overflow = ''
}

function onModalOpened() {
  // Hide panel when modal opens (modal takes over)
  isOpen.value = false
  document.body.style.overflow = ''
}

function handleModalClose() {
  isOpen.value = false
  document.body.style.overflow = ''
}

if (typeof window !== 'undefined') {
  window.addEventListener('proleadsai:modal-close', handleModalClose)
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('proleadsai:modal-close', handleModalClose)
  }
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
