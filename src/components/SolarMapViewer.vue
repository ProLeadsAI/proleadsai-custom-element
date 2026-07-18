<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SolarPanelPlacement } from '@/utils/api'
import { getConfig } from '@/utils/config'
import { loadGoogleMapsScript } from '@/utils/maps'
import { projectSolarPanelFootprint } from '@/utils/solarPanelGeometry'

const props = defineProps<{
  coordinates: { lat: number; lng: number }
  buildingCenter?: { latitude: number; longitude: number }
  boundingBox?: {
    sw: { latitude: number; longitude: number }
    ne: { latitude: number; longitude: number }
  }
  panels: SolarPanelPlacement[]
  selectedPanelCount: number
  panelWidthMeters: number
  panelHeightMeters: number
  accentColor?: string
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
interface MapInstance {
  fitBounds: (bounds: unknown, padding?: number) => void
  getZoom: () => number | undefined
  setZoom: (zoom: number) => void
}
interface PolygonInstance { setMap: (map: MapInstance | null) => void }
let map: MapInstance | null = null
let panelPolygons: PolygonInstance[] = []

function panelPath(panel: SolarPanelPlacement) {
  const google = window.google
  const spherical = google.maps.geometry.spherical
  const center = new google.maps.LatLng(panel.center.latitude, panel.center.longitude)
  const projection = projectSolarPanelFootprint({
    orientation: panel.orientation,
    panelWidthMeters: props.panelWidthMeters,
    panelHeightMeters: props.panelHeightMeters,
    pitchDegrees: panel.pitchDegrees,
    azimuthDegrees: panel.azimuthDegrees,
  })
  const top = spherical.computeOffset(center, projection.lengthMeters / 2, projection.azimuthDegrees)
  const bottom = spherical.computeOffset(center, projection.lengthMeters / 2, projection.azimuthDegrees + 180)
  return [
    spherical.computeOffset(top, projection.widthMeters / 2, projection.leftHeadingDegrees),
    spherical.computeOffset(top, projection.widthMeters / 2, projection.rightHeadingDegrees),
    spherical.computeOffset(bottom, projection.widthMeters / 2, projection.rightHeadingDegrees),
    spherical.computeOffset(bottom, projection.widthMeters / 2, projection.leftHeadingDegrees)
  ]
}

function drawPanels() {
  if (!map || !window.google?.maps?.geometry)
    return
  panelPolygons.forEach(polygon => polygon.setMap(null))
  const color = props.accentColor || getConfig().primaryColor || '#2563eb'
  panelPolygons = props.panels.map((panel, index) => new window.google.maps.Polygon({
    paths: panelPath(panel),
    map: index < props.selectedPanelCount ? map : null,
    strokeColor: '#ffffff',
    strokeOpacity: 0.92,
    strokeWeight: 1,
    fillColor: color,
    fillOpacity: 0.86,
    clickable: false,
    zIndex: 10
  }))
}

function fitToBuilding() {
  if (!map || !window.google?.maps?.LatLngBounds)
    return

  const bounds = new window.google.maps.LatLngBounds()
  if (props.boundingBox) {
    bounds.extend({ lat: props.boundingBox.sw.latitude, lng: props.boundingBox.sw.longitude })
    bounds.extend({ lat: props.boundingBox.ne.latitude, lng: props.boundingBox.ne.longitude })
  }
  else if (props.panels.length) {
    props.panels.forEach(panel => bounds.extend({ lat: panel.center.latitude, lng: panel.center.longitude }))
  }
  else if (props.buildingCenter) {
    bounds.extend({ lat: props.buildingCenter.latitude, lng: props.buildingCenter.longitude })
  }
  else {
    bounds.extend(props.coordinates)
  }

  map.fitBounds(bounds, 52)
  window.google.maps.event?.addListenerOnce(map, 'idle', () => {
    const zoom = map?.getZoom()
    if (zoom && zoom > 21)
      map?.setZoom(21)
  })
}

function updateVisiblePanels() {
  panelPolygons.forEach((polygon, index) => polygon.setMap(index < props.selectedPanelCount ? map : null))
}

onMounted(async () => {
  try {
    await loadGoogleMapsScript(getConfig().googleMapsApiKey)
    const maps = window.google?.maps
    if (typeof maps?.importLibrary === 'function')
      await Promise.all([maps.importLibrary('maps'), maps.importLibrary('geometry')])
    if (!maps?.Map || !maps?.geometry?.spherical)
      throw new Error('The map geometry library is unavailable')
    if (!mapContainer.value)
      return
    map = new maps.Map(mapContainer.value, {
      center: props.buildingCenter
        ? { lat: props.buildingCenter.latitude, lng: props.buildingCenter.longitude }
        : props.coordinates,
      zoom: 20,
      mapTypeId: 'satellite',
      tilt: 0,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false
    })
    drawPanels()
    fitToBuilding()
  }
  catch (reason) {
    mapError.value = reason instanceof Error ? reason.message : 'Satellite map unavailable'
  }
})

watch(() => props.selectedPanelCount, updateVisiblePanels)
watch(
  [() => props.panels, () => props.panelWidthMeters, () => props.panelHeightMeters, () => props.accentColor],
  () => {
    drawPanels()
    fitToBuilding()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  panelPolygons.forEach(polygon => polygon.setMap(null))
  panelPolygons = []
  map = null
})
</script>

<template>
  <div class="relative h-full min-h-[340px] overflow-hidden bg-stone-200">
    <div ref="mapContainer" class="absolute inset-0" />
    <div v-if="mapError" role="status" class="absolute inset-0 z-10 flex items-center justify-center bg-stone-100 p-8 text-center text-sm text-stone-600">
      <div><strong class="block text-stone-900">Satellite preview unavailable</strong><span class="mt-1 block">{{ mapError }}. Your estimate figures are still available.</span></div>
    </div>
    <div class="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      {{ selectedPanelCount }} panels shown
    </div>
    <div class="absolute bottom-7 right-2 rounded bg-black/65 px-2 py-1 text-[10px] text-white">
      Preliminary layout · not survey grade
    </div>
  </div>
</template>
