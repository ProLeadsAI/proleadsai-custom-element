<template>
  <div class="relative w-full h-full min-h-[300px]">
    <div ref="mapContainer" class="w-full h-full min-h-[300px]"></div>

    <!-- Undo and reset buttons -->
    <div v-if="moveCount > 0" class="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <button @click="undoMarkerMove" class="bg-white rounded-md shadow-md px-3 py-2 text-sm font-medium flex items-center hover:bg-gray-100 cursor-pointer" title="Undo last marker move">
        <svg
          class="mr-1"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
        Undo
      </button>

      <button @click="resetToOriginal" class="bg-white rounded-md shadow-md px-3 py-2 text-sm font-medium flex items-center hover:bg-gray-100 cursor-pointer" title="Back to original location">
        <svg
          class="mr-1"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8l-4 4 4 4"></path>
          <path d="M16 12H9"></path>
        </svg>
        Original
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { loadGoogleMapsScript } from '@/utils/maps'
import { getConfig } from '@/utils/config'

const props = defineProps<{
  coordinates?: { lat: number; lng: number }
  roofOutlinePoints?: Array<{ lat: number; lng: number }>
}>()

const emit = defineEmits<{
  (e: 'marker-moved', coords: { lat: number; lng: number }, positionKey: string): void
  (e: 'undo-move', coords: { lat: number; lng: number }, positionKey: string): void
  (e: 'reset-to-original', coords: { lat: number; lng: number }, positionKey: string): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const marker = ref<any>(null)
const apiLoaded = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const roofPolygon = ref<any>(null)

const markerHistory = ref<Array<{ lat: number; lng: number }>>([])

const moveCount = computed(() => Math.max(0, markerHistory.value.length - 1))

onMounted(async () => {
  const config = getConfig()

  try {
    await loadGoogleMapsScript(config.googleMapsApiKey, ['places'])
    apiLoaded.value = true

    if (props.coordinates) {
      markerHistory.value = [{ ...props.coordinates }]
      initMap()
    }
  } catch (err) {
    console.error('Failed to load Google Maps:', err)
  }
})

watch(
  () => props.coordinates,
  (newCoords) => {
    if (newCoords && apiLoaded.value) {
      updateMapAndMarker(newCoords)
    }
  },
  { deep: true },
)

watch(
  () => props.roofOutlinePoints,
  (newPoints) => {
    if (newPoints && newPoints.length >= 3 && map.value) {
      drawRoofOutline(newPoints)
    }
  },
  { immediate: true },
)

function initMap() {
  if (!mapContainer.value || !props.coordinates) return

  const google = window.google
  if (!google) return

  map.value = new google.maps.Map(mapContainer.value, {
    center: props.coordinates,
    zoom: 20,
    mapTypeId: 'satellite',
    tilt: 0,
    disableDefaultUI: true,
    zoomControl: true,
  })

  setTimeout(() => {
    if (props.coordinates) {
      createMarker(props.coordinates)
      if (props.roofOutlinePoints && props.roofOutlinePoints.length >= 3) {
        drawRoofOutline(props.roofOutlinePoints)
      }
    }
  }, 500)
}

function createMarker(position: { lat: number; lng: number }) {
  if (!map.value) return

  const google = window.google

  if (marker.value) {
    marker.value.setMap(null)
  }

  marker.value = new google.maps.Marker({
    position,
    map: map.value,
    draggable: true,
    title: 'Drag to see neighboring roof estimates!',
  })

  marker.value.addListener('dragend', handleMarkerDragEnd)
}

// Store animation elements for cleanup
const animationElements = ref<{
  pointMarkers: any[]
  lineSegments: any[]
}>({ pointMarkers: [], lineSegments: [] })

function drawRoofOutline(points: Array<{ lat: number; lng: number }>) {
  if (!map.value || points.length < 3) return

  const google = window.google

  // Clean up previous animation elements
  animationElements.value.pointMarkers.forEach(m => m?.setMap(null))
  animationElements.value.lineSegments.forEach(l => l?.setMap(null))
  animationElements.value = { pointMarkers: [], lineSegments: [] }

  if (roofPolygon.value) {
    roofPolygon.value.setMap(null)
  }

  const strokeColor = '#4CAF50'
  const fillColor = '#4CAF50'
  
  // Create markers for each point (all initially invisible)
  const pointMarkers: any[] = []
  points.forEach((point) => {
    const marker = new google.maps.Marker({
      position: { lat: point.lat, lng: point.lng },
      map: map.value,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: strokeColor,
        fillOpacity: 0.8,
        strokeColor: strokeColor,
        strokeWeight: 2
      },
      zIndex: 3,
      visible: false
    })
    pointMarkers.push(marker)
  })
  animationElements.value.pointMarkers = pointMarkers
  
  // Create line segments (initially not on map)
  const lineSegments: any[] = []
  for (let i = 0; i < points.length; i++) {
    const from = points[i]!
    const to = points[(i + 1) % points.length]!
    
    const line = new google.maps.Polyline({
      path: [
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng }
      ],
      strokeColor: strokeColor,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      map: null,
      zIndex: 2
    })
    lineSegments.push(line)
  }
  animationElements.value.lineSegments = lineSegments
  
  // Create final polygon (initially invisible)
  roofPolygon.value = new google.maps.Polygon({
    paths: points,
    strokeColor: strokeColor,
    strokeOpacity: 0,
    strokeWeight: 2,
    fillColor: fillColor,
    fillOpacity: 0,
    map: map.value,
    zIndex: 1,
    visible: false
  })
  
  // Animate: Point > Line > Point > Line > ...
  let currentStep = 0
  const totalSteps = points.length * 2
  
  function animateSequence() {
    if (currentStep < totalSteps) {
      const stepType = currentStep % 2
      const pointIndex = Math.floor(currentStep / 2)
      
      if (stepType === 0) {
        // Show point
        pointMarkers[pointIndex].setVisible(true)
      } else {
        // Show line
        lineSegments[pointIndex].setMap(map.value)
      }
      
      currentStep++
      setTimeout(animateSequence, 200)
    } else {
      // All done, animate fill
      setTimeout(animateFill, 300)
    }
  }
  
  function animateFill() {
    roofPolygon.value.setVisible(true)
    
    let opacity = 0
    const targetOpacity = 0.35
    const steps = 15
    const opacityStep = targetOpacity / steps
    let step = 0
    
    const fillInterval = setInterval(() => {
      step++
      opacity = opacityStep * step
      
      if (step >= steps) {
        opacity = targetOpacity
        clearInterval(fillInterval)
      }
      
      roofPolygon.value.setOptions({
        fillOpacity: opacity,
        strokeOpacity: Math.min(opacity * 2.5, 0.8)
      })
    }, 30)
  }
  
  // Start animation
  animateSequence()
}

function handleMarkerDragEnd() {
  if (!marker.value) return

  const position = marker.value.getPosition()
  const lat = position.lat()
  const lng = position.lng()
  const positionKey = `${lat}_${lng}`

  const isDuplicate = markerHistory.value.some(
    (pos) => Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001,
  )

  if (!isDuplicate) {
    markerHistory.value = [...markerHistory.value, { lat, lng }]
    map.value.panTo(position)
    emit('marker-moved', { lat, lng }, positionKey)
  }
}

function undoMarkerMove() {
  if (markerHistory.value.length <= 1) return

  markerHistory.value = markerHistory.value.slice(0, -1)
  const prevPosition = markerHistory.value[markerHistory.value.length - 1]

  if (marker.value && prevPosition) {
    const google = window.google
    marker.value.setPosition(new google.maps.LatLng(prevPosition.lat, prevPosition.lng))
    map.value.panTo(new google.maps.LatLng(prevPosition.lat, prevPosition.lng))

    const positionKey = `${prevPosition.lat}_${prevPosition.lng}`
    emit('undo-move', prevPosition, positionKey)
  }
}

function resetToOriginal() {
  if (markerHistory.value.length <= 1) return

  const originalPosition = markerHistory.value[0]!
  markerHistory.value = [originalPosition]

  if (marker.value && map.value && originalPosition) {
    const google = window.google
    marker.value.setPosition(new google.maps.LatLng(originalPosition.lat, originalPosition.lng))
    map.value.panTo(new google.maps.LatLng(originalPosition.lat, originalPosition.lng))

    const positionKey = `${originalPosition.lat}_${originalPosition.lng}`
    emit('reset-to-original', originalPosition, positionKey)
  }
}

function updateMapAndMarker(coordinates: { lat: number; lng: number }) {
  if (!map.value) {
    initMap()
    return
  }

  map.value.panTo(coordinates)

  if (marker.value) {
    marker.value.setPosition(coordinates)
  } else {
    createMarker(coordinates)
  }
}

onBeforeUnmount(() => {
  // Clean up animation elements
  animationElements.value.pointMarkers.forEach(m => m?.setMap(null))
  animationElements.value.lineSegments.forEach(l => l?.setMap(null))
  
  if (roofPolygon.value) {
    roofPolygon.value.setMap(null)
  }
  if (marker.value) {
    marker.value.setMap(null)
  }
  map.value = null
})

defineExpose({
  updateMapAndMarker,
})
</script>

<style scoped>
/* All styles now use Tailwind classes */
</style>
