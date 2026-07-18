<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  SolarEstimateResponse,
  SolarManualFollowupReport,
  SolarUnlockedReport
} from '@/utils/api'
import { createSolarEstimate, isSolarEstimateResult, submitEstimateLead } from '@/utils/api'
import { emitEstimatorEvent } from '@/utils/analytics'
import { getConfig, loadConfiguredFonts } from '@/utils/config'
import SolarMapViewer from './SolarMapViewer.vue'

const props = defineProps<{
  show: boolean
  loading: boolean
  error: string
  result: SolarEstimateResponse | null
}>()

const emit = defineEmits<{ (event: 'close'): void }>()
const config = getConfig()
const teleportTarget = computed(() => window.__PROLEADSAI_TELEPORT__ || null)
const closeButton = ref<HTMLButtonElement | null>(null)
const currentResponse = ref<SolarEstimateResponse | null>(props.result)
const selectedConfigIndex = ref(0)
const tariff = ref<number | null>(null)
const annualUsage = ref<number | null>(null)
const recalculating = ref(false)
const submitting = ref(false)
const inlineError = ref('')
const report = ref<SolarUnlockedReport | null>(null)
const manualReport = ref<SolarManualFollowupReport | null>(null)
const selectedBatteryId = ref<string | null>(null)
const submittedBatteryId = ref<string | null>(null)
const form = ref({ name: '', email: '', phone: '', privacyAccepted: false, marketingAccepted: false })
let suppressPanelAnalytics = false
let suppressBatteryAnalytics = false
let previousBodyOverflow = ''

const solarResult = computed(() => isSolarEstimateResult(currentResponse.value) ? currentResponse.value : null)
const manualResult = computed(() => currentResponse.value && !isSolarEstimateResult(currentResponse.value) ? currentResponse.value : null)
const configurations = computed(() => solarResult.value?.solar.configurations || [])
const selectedConfig = computed(() => configurations.value[selectedConfigIndex.value] || configurations.value[0])
const selectedPanelCount = computed(() => selectedConfig.value?.panelsCount || 0)
const selectionLocked = computed(() => Boolean(report.value))
const branding = computed(() => currentResponse.value?.branding || {})
const accentColor = computed(() => branding.value.primaryColor || config.primaryColor || '#2563eb')
const fontFamily = computed(() => branding.value.fontFamily || config.textFont)
const accentStyle = computed(() => ({
  '--solar-accent': String(accentColor.value),
  fontFamily: fontFamily.value ? `'${fontFamily.value}', sans-serif` : undefined
}))
const showBranding = computed(() => !config.hideBranding && !branding.value.hideProLeadsBranding)
const isIllustrativeDemo = computed(() => config.source.startsWith('marketing_'))
const activeScenario = computed(() => {
  if (!report.value)
    return null
  return report.value.batteryComparisons.find(item => item.batteryId === selectedBatteryId.value)
    || report.value.selectedScenario
})
const displayedConfiguration = computed(() => activeScenario.value || selectedConfig.value)
const optimizedBatteryComparisons = computed(() => {
  if (!report.value)
    return false
  return new Set(report.value.batteryComparisons.map(item => item.recommendedPanelCount ?? item.panelsCount)).size > 1
    || report.value.batteryComparisons.some(item => item.recommendedPanelCount !== undefined)
})
const submittedBatteryRecommendation = computed(() => {
  if (!report.value || selectedBatteryId.value !== submittedBatteryId.value)
    return null
  return report.value.batteryRecommendedPanelCount
})
const activeBatteryPreset = computed(() => report.value?.batteryPresets.find(item => item.id === selectedBatteryId.value) || null)

function assumptionValue(key: string) {
  return report.value?.solar.assumptions?.[key]
}

const assumptionRows = computed(() => {
  if (!report.value)
    return []
  const percent = (key: string) => `${Number(assumptionValue(key) || 0).toLocaleString('en-GB')}%`
  const pence = (key: string) => `${Number(assumptionValue(key) || 0).toLocaleString('en-GB')}p`
  const rows = [
    { label: 'Calculation version', value: String(assumptionValue('calculationVersion') || 'Version unavailable') },
    { label: 'Analysis period', value: `${Number(assumptionValue('analysisYears') || 0)} years` },
    { label: 'System losses', value: percent('systemLossPercent') },
    { label: 'Annual panel degradation', value: percent('annualDegradationPercent') },
    { label: 'Annual tariff inflation', value: percent('annualTariffInflationPercent') },
    { label: 'Discount rate', value: percent('discountRatePercent') },
    { label: 'Direct solar use', value: percent('directUsePercent') },
    { label: 'Export value', value: `${pence('exportRatePencePerKwh')}/kWh` },
    { label: 'Installation base cost', value: formatCurrency(Number(assumptionValue('installationBaseCostPence') || 0)) },
    { label: 'Installation cost per watt', value: `${pence('installationCostPerWattPence')}/W` },
    { label: 'Configured panel rating', value: `${report.value.solar.panelCapacityWatts.toLocaleString('en-GB')} W` },
    { label: 'Annual electricity use', value: `${report.value.solar.annualUsageKwh.toLocaleString('en-GB')} kWh` },
    { label: 'Usage basis', value: report.value.solar.usageSource === 'customer' ? 'Homeowner-provided annual use' : 'Roof-area heuristic' },
    { label: 'Import tariff', value: `${formatNumber(report.value.solar.tariff.importRatePencePerKwh)}p/kWh · ${report.value.solar.tariff.region}` }
  ]
  if (activeBatteryPreset.value) {
    rows.push(
      { label: 'Battery usable capacity', value: `${formatNumber(activeBatteryPreset.value.usableCapacityKwh)} kWh` },
      { label: 'Battery installed cost', value: formatCurrency(activeBatteryPreset.value.installedCostPence) },
      { label: 'Battery round-trip efficiency', value: `${formatNumber(activeBatteryPreset.value.roundTripEfficiencyPercent)}%` },
      { label: 'Battery cycle assumption', value: `${Number(activeBatteryPreset.value.cyclesPerYear || 0).toLocaleString('en-GB')} cycles/year` }
    )
  }
  return rows
})

function setSelectedPanelCount(panelCount: number) {
  const index = configurations.value.findIndex(item => item.panelsCount === panelCount)
  suppressPanelAnalytics = true
  selectedConfigIndex.value = Math.max(0, index)
  suppressPanelAnalytics = false
}

function syncResult(value: SolarEstimateResponse | null) {
  currentResponse.value = value
  report.value = null
  manualReport.value = null
  submittedBatteryId.value = null
  suppressBatteryAnalytics = true
  selectedBatteryId.value = null
  suppressBatteryAnalytics = false
  inlineError.value = ''
  if (!value || !isSolarEstimateResult(value))
    return
  setSelectedPanelCount(value.solar.recommendedPanelCount)
  tariff.value = value.solar.tariff.importRatePencePerKwh
  annualUsage.value = value.solar.usageSource === 'customer' ? value.solar.annualUsageKwh : null
}

watch(() => props.result, syncResult, { immediate: true })

watch(selectedConfigIndex, () => {
  if (suppressPanelAnalytics || selectionLocked.value)
    return
  emitEstimatorEvent('proleadsai_panel_config_change', {
    panelCount: selectedPanelCount.value,
    systemSizeKwp: selectedConfig.value?.systemSizeKwp
  })
}, { flush: 'sync' })

watch(selectedBatteryId, (value) => {
  if (suppressBatteryAnalytics)
    return
  const comparison = report.value?.batteryComparisons.find(item => item.batteryId === value)
  if (comparison)
    setSelectedPanelCount(comparison.recommendedPanelCount ?? comparison.panelsCount)
  emitEstimatorEvent('proleadsai_battery_select', {
    batteryId: value || 'none',
    panelCount: comparison?.recommendedPanelCount ?? comparison?.panelsCount
  })
}, { flush: 'sync' })

watch(() => branding.value.fontFamily, value => {
  if (value)
    loadConfiguredFonts({ headingFont: value, textFont: value })
})

watch(() => props.show, async (show) => {
  if (show) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    closeButton.value?.focus()
  }
  else {
    document.body.style.overflow = previousBodyOverflow
  }
}, { immediate: true })

function close() {
  emitEstimatorEvent('proleadsai_estimator_close')
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show)
    close()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = previousBodyOverflow
})

function validateContact() {
  inlineError.value = ''
  if (!form.value.name.trim() || (!form.value.email.trim() && !form.value.phone.trim())) {
    inlineError.value = 'Please enter your name and either an email address or phone number.'
    return false
  }
  if (!form.value.privacyAccepted) {
    inlineError.value = 'Please accept the privacy notice to request your report.'
    return false
  }
  return true
}

async function recalculate() {
  if (!solarResult.value || selectionLocked.value)
    return
  const previousPanelCount = selectedPanelCount.value
  recalculating.value = true
  inlineError.value = ''
  try {
    const next = await createSolarEstimate({
      coordinates: solarResult.value.coordinates,
      address: {
        formattedAddress: solarResult.value.address,
        ...solarResult.value.addressComponents,
        addressCountry: 'GB'
      },
      annualUsageKwh: annualUsage.value || null,
      importRatePencePerKwh: tariff.value || null
    })
    syncResult(next)
    if (isSolarEstimateResult(next)) {
      if (next.solar.configurations.some(item => item.panelsCount === previousPanelCount))
        setSelectedPanelCount(previousPanelCount)
      emitEstimatorEvent('proleadsai_estimate_view', { quality: next.solar.quality, personalizedUsage: Boolean(annualUsage.value) })
    }
    else {
      emitEstimatorEvent('proleadsai_estimate_view', { coverage: 'unavailable', manualFollowup: true })
    }
  }
  catch (reason) {
    inlineError.value = reason instanceof Error ? reason.message : 'Could not update this estimate'
  }
  finally {
    recalculating.value = false
  }
}

async function unlockReport() {
  if (!solarResult.value || !selectedConfig.value || !validateContact())
    return
  submitting.value = true
  try {
    const batteryId = selectedBatteryId.value
    const response = await submitEstimateLead({
      sessionId: solarResult.value.sessionId,
      contact: {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim()
      },
      privacyAccepted: true,
      marketingAccepted: form.value.marketingAccepted,
      panelCount: selectedConfig.value.panelsCount,
      batteryId
    })
    if ('manualFollowup' in response.report) {
      manualReport.value = response.report
      return
    }
    report.value = response.report
    submittedBatteryId.value = batteryId
    const activeComparison = response.report.batteryComparisons.find(item => item.batteryId === batteryId)
    const reportPanelCount = activeComparison?.recommendedPanelCount ?? activeComparison?.panelsCount ?? response.report.selectedScenario.panelsCount
    setSelectedPanelCount(reportPanelCount)
    emitEstimatorEvent('proleadsai_lead_submit', {
      panelCount: reportPanelCount,
      batteryId: batteryId || 'none'
    })
    emitEstimatorEvent('proleadsai_report_unlock', { panelCount: reportPanelCount })
  }
  catch (reason) {
    inlineError.value = reason instanceof Error ? reason.message : 'Could not unlock your report'
  }
  finally {
    submitting.value = false
  }
}

async function submitManualFollowup() {
  if (!manualResult.value || !validateContact())
    return
  submitting.value = true
  try {
    const response = await submitEstimateLead({
      sessionId: manualResult.value.sessionId,
      contact: {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim()
      },
      privacyAccepted: true,
      marketingAccepted: form.value.marketingAccepted
    })
    if (!('manualFollowup' in response.report))
      throw new Error('Unexpected manual follow-up response')
    manualReport.value = response.report
    emitEstimatorEvent('proleadsai_lead_submit', { manualFollowup: true })
    emitEstimatorEvent('proleadsai_report_unlock', { manualFollowup: true })
  }
  catch (reason) {
    inlineError.value = reason instanceof Error ? reason.message : 'Could not request a manual assessment'
  }
  finally {
    submitting.value = false
  }
}

function formatCurrency(pence: number | null | undefined) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format((pence || 0) / 100)
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value || 0)
}
</script>

<template>
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <Transition name="solar-modal">
      <div v-if="show" class="fixed inset-0 z-[9999999] overflow-y-auto bg-stone-950/80 p-2 md:p-5" @click.self="close">
        <div
          class="relative mx-auto my-2 w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl md:my-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="solar-estimate-title"
          :style="accentStyle"
        >
          <button ref="closeButton" class="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-2xl text-stone-700 shadow hover:bg-white" aria-label="Close solar estimate" @click="close">×</button>

          <div v-if="loading && !currentResponse" class="p-16 text-center">
            <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-[var(--solar-accent)]" />
            <p class="font-semibold text-stone-800">Analysing the roof and solar potential…</p>
            <p class="mt-2 text-sm text-stone-500">Checking Google solar imagery and valid panel configurations.</p>
          </div>

          <div v-else-if="error && !currentResponse" class="p-10 text-center md:p-16">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">!</div>
            <h2 id="solar-estimate-title" class="text-xl font-bold text-stone-900">We could not complete this search</h2>
            <p class="mx-auto mt-3 max-w-xl text-stone-600">{{ error }}</p>
            <button class="mt-6 rounded-full bg-stone-900 px-6 py-3 font-semibold text-white" @click="close">Try another address</button>
          </div>

          <div v-else-if="manualResult" class="mx-auto max-w-2xl p-6 md:p-12">
            <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" class="mb-6 max-h-14 max-w-48 object-contain" />
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--solar-accent)]">Manual solar assessment</p>
            <h2 id="solar-estimate-title" class="mt-2 pr-10 text-2xl font-bold text-stone-900">We could not model this roof automatically</h2>
            <p class="mt-3 text-stone-600">Google solar coverage is unavailable for {{ manualResult.address }}. No roof, generation or savings figures have been invented.</p>

            <div v-if="manualReport" class="mt-7 rounded-2xl bg-green-700 p-6 text-white">
              <p class="text-xs font-semibold uppercase tracking-wider text-green-100">Request received</p>
              <h3 class="mt-2 text-xl font-bold">A specialist can now review the property manually.</h3>
              <p class="mt-2 text-sm text-green-100">Any figures provided later will remain subject to a formal survey.</p>
            </div>

            <div v-else class="mt-7 rounded-2xl bg-stone-900 p-5 text-white">
              <h3 class="font-bold">Request a manual follow-up</h3>
              <p class="mt-1 text-sm text-stone-300">Leave your details and the team can assess the address without relying on unavailable imagery.</p>
              <div class="mt-4 grid gap-2">
                <input v-model="form.name" class="rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900" autocomplete="name" placeholder="Full name" />
                <input v-model="form.email" class="rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900" type="email" autocomplete="email" placeholder="Email address" />
                <input v-model="form.phone" class="rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900" type="tel" autocomplete="tel" placeholder="Phone number" />
                <label class="mt-1 flex items-start gap-2 text-xs text-stone-300"><input v-model="form.privacyAccepted" class="mt-0.5" type="checkbox" /> <span>I agree to the privacy notice and to being contacted about this assessment.</span></label>
                <label class="flex items-start gap-2 text-xs text-stone-400"><input v-model="form.marketingAccepted" class="mt-0.5" type="checkbox" /> <span>I would also like relevant product updates (optional).</span></label>
                <button class="mt-2 rounded-full bg-[var(--solar-accent)] px-5 py-3 font-bold text-white disabled:opacity-60" :disabled="submitting" @click="submitManualFollowup">{{ submitting ? 'Sending…' : 'Request manual assessment' }}</button>
              </div>
            </div>
            <p v-if="inlineError" role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ inlineError }}</p>
            <div class="mt-6 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500"><p>{{ manualResult.disclaimer }}</p><p class="mt-2 font-medium">{{ manualResult.sourceAttribution }}</p></div>
            <p v-if="showBranding" class="mt-4 text-center text-[11px] text-stone-400">Powered by ProLeadsAI</p>
          </div>

          <div v-else-if="solarResult" class="grid min-h-[680px] grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <div class="relative min-h-[420px] lg:min-h-[680px]">
              <SolarMapViewer
                :coordinates="solarResult.coordinates"
                :building-center="solarResult.solar.center"
                :bounding-box="solarResult.solar.boundingBox"
                :panels="solarResult.solar.panels"
                :selected-panel-count="selectedPanelCount"
                :panel-width-meters="solarResult.solar.panelWidthMeters"
                :panel-height-meters="solarResult.solar.panelHeightMeters"
                :accent-color="accentColor"
              />
              <div v-if="showBranding" class="absolute bottom-7 left-2 rounded bg-black/65 px-2 py-1 text-[10px] text-white">by ProLeadsAI</div>
            </div>

            <div class="max-h-none overflow-y-auto bg-stone-50 p-5 md:p-7 lg:max-h-[90vh]">
              <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" class="mb-4 max-h-12 max-w-44 object-contain" />
              <p class="pr-10 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--solar-accent)]">{{ branding.solarTitle || 'Solar potential' }}</p>
              <h2 id="solar-estimate-title" class="mt-2 pr-8 text-xl font-bold leading-tight text-stone-900">{{ solarResult.address }}</h2>
              <p v-if="branding.solarSubtitle" class="mt-2 text-sm text-stone-600">{{ branding.solarSubtitle }}</p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800">{{ solarResult.solar.quality }} imagery</span>
                <span class="rounded-full bg-stone-200 px-2.5 py-1 text-stone-700">Preliminary estimate</span>
              </div>
              <p v-if="isIllustrativeDemo" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                Demo pricing, usage and battery assumptions are illustrative. A live customer estimator must use the installer’s confirmed settings.
              </p>

              <div class="mt-5 grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-white p-3 shadow-sm"><p class="text-xs text-stone-500">Usable array area</p><p class="mt-1 text-lg font-bold">{{ formatNumber(solarResult.solar.usableAreaM2) }} m²</p></div>
                <div class="rounded-xl bg-white p-3 shadow-sm"><p class="text-xs text-stone-500">Sunshine</p><p class="mt-1 text-lg font-bold">{{ formatNumber(solarResult.solar.sunshineHoursPerYear) }} hrs/yr</p></div>
                <div class="rounded-xl bg-white p-3 shadow-sm"><p class="text-xs text-stone-500">Panels selected</p><p class="mt-1 text-lg font-bold">{{ selectedPanelCount }}</p></div>
                <div class="rounded-xl bg-white p-3 shadow-sm"><p class="text-xs text-stone-500">Selected system</p><p class="mt-1 text-lg font-bold">{{ formatNumber(displayedConfiguration?.systemSizeKwp) }} kWp</p></div>
                <div class="rounded-xl bg-white p-3 shadow-sm"><p class="text-xs text-stone-500">Annual AC generation</p><p class="mt-1 text-lg font-bold">{{ formatNumber(displayedConfiguration?.yearlyEnergyAcKwh) }} kWh</p></div>
                <div class="rounded-xl bg-white p-3 shadow-sm"><p class="text-xs text-stone-500">First-year saving</p><p class="mt-1 text-lg font-bold text-green-700">{{ formatCurrency(displayedConfiguration?.firstYearSavingsPence) }}</p></div>
              </div>

              <div class="mt-5 rounded-xl bg-white p-4 shadow-sm">
                <div class="flex items-center justify-between gap-3"><div><p class="font-semibold text-stone-900">Panel configuration</p><p class="text-xs text-stone-500">No-battery recommendation: {{ solarResult.solar.recommendedPanelCount }}</p></div><p class="text-2xl font-bold text-[var(--solar-accent)]">{{ selectedPanelCount }}</p></div>
                <input v-model.number="selectedConfigIndex" class="solar-range mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50" type="range" min="0" :max="Math.max(0, configurations.length - 1)" step="1" aria-label="Panel configuration" :disabled="selectionLocked" />
                <div class="mt-1 flex justify-between text-[11px] text-stone-400"><span>{{ configurations[0]?.panelsCount }} panels</span><span>{{ configurations[configurations.length - 1]?.panelsCount }} panels</span></div>
                <p v-if="selectionLocked" class="mt-2 text-xs text-stone-500">The slider is locked to server-calculated report scenarios so payback and lifetime figures stay consistent. Choosing a battery can apply its recommended layout.</p>
              </div>

              <div class="mt-4 rounded-xl border border-stone-200 bg-white p-4">
                <p class="font-semibold text-stone-900">Personalise the estimate</p>
                <div class="mt-3 grid grid-cols-2 gap-3">
                  <label class="text-xs font-medium text-stone-600">Electricity price (p/kWh)<input v-model.number="tariff" class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100" type="number" min="1" step="0.01" :disabled="selectionLocked" /></label>
                  <label class="text-xs font-medium text-stone-600">Annual use (kWh, optional)<input v-model.number="annualUsage" class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100" type="number" min="1" placeholder="e.g. 2500" :disabled="selectionLocked" /></label>
                </div>
                <p class="mt-2 text-[11px] text-stone-500">{{ solarResult.solar.tariff.source }} · {{ solarResult.solar.tariff.effectiveFrom }} to {{ solarResult.solar.tariff.effectiveTo }}. Standing charges excluded.</p>
                <p v-if="solarResult.solar.usageSource === 'roof-area-heuristic' && !annualUsage" class="mt-1 text-[11px] text-amber-700">Using {{ solarResult.solar.annualUsageKwh.toLocaleString() }} kWh/year from a roof-area heuristic. Enter usage for a more personalised result.</p>
                <button v-if="!selectionLocked" class="mt-3 w-full rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60" :disabled="recalculating" @click="recalculate">{{ recalculating ? 'Updating…' : 'Update estimate' }}</button>
              </div>

              <div v-if="!report" class="mt-5 rounded-2xl bg-stone-900 p-5 text-white">
                <div class="flex items-start gap-3"><span class="text-2xl">🔒</span><div><h3 class="font-bold">Unlock your complete report</h3><p class="mt-1 text-xs text-stone-300">See lifetime value, payback, battery comparisons and all assumptions.</p></div></div>
                <div class="mt-4 grid gap-2">
                  <input v-model="form.name" class="rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900" autocomplete="name" placeholder="Full name" />
                  <input v-model="form.email" class="rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900" type="email" autocomplete="email" placeholder="Email address" />
                  <input v-model="form.phone" class="rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900" type="tel" autocomplete="tel" placeholder="Phone number" />
                  <label v-if="solarResult.batteryOptions?.length" class="mt-1 text-xs text-stone-300">Battery interest<select v-model="selectedBatteryId" class="mt-1 w-full rounded-lg bg-white px-3 py-2.5 text-sm text-stone-900"><option :value="null">No battery</option><option v-for="battery in solarResult.batteryOptions" :key="battery.id" :value="battery.id">{{ battery.name }} ({{ battery.usableCapacityKwh }} kWh usable)</option></select></label>
                  <label class="mt-1 flex items-start gap-2 text-xs text-stone-300"><input v-model="form.privacyAccepted" class="mt-0.5" type="checkbox" /> <span>I agree to the privacy notice and to being contacted about this estimate.</span></label>
                  <label class="flex items-start gap-2 text-xs text-stone-400"><input v-model="form.marketingAccepted" class="mt-0.5" type="checkbox" /> <span>I would also like relevant product updates (optional).</span></label>
                  <button class="mt-2 rounded-full bg-[var(--solar-accent)] px-5 py-3 font-bold text-white disabled:opacity-60" :disabled="submitting" @click="unlockReport">{{ submitting ? 'Unlocking…' : 'Unlock complete report' }}</button>
                </div>
              </div>

              <div v-else class="mt-5 space-y-4">
                <div class="rounded-2xl bg-green-700 p-5 text-white"><p class="text-xs font-semibold uppercase tracking-wider text-green-100">Complete report unlocked</p><div class="mt-3 grid grid-cols-2 gap-4"><div><p class="text-xs text-green-100">Lifetime net value</p><p class="text-2xl font-bold">{{ formatCurrency(activeScenario?.lifetimeNetValuePence) }}</p></div><div><p class="text-xs text-green-100">Estimated payback</p><p class="text-2xl font-bold">{{ activeScenario?.paybackYears ? `${activeScenario.paybackYears} years` : 'Beyond term' }}</p></div></div></div>
                <div class="rounded-xl bg-white p-4 shadow-sm"><h3 class="font-semibold">Battery comparison</h3><p class="mt-1 text-xs text-stone-500">{{ optimizedBatteryComparisons ? 'Each option uses its highest modeled lifetime-value Google panel configuration.' : `Each option below compares the submitted ${selectedPanelCount}-panel layout.` }}</p><div class="mt-3 grid gap-2"><button class="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm" :class="!selectedBatteryId ? 'border-[var(--solar-accent)] bg-blue-50' : 'border-stone-200'" @click="selectedBatteryId = null"><span>No battery</span><span class="text-right"><strong class="block">{{ formatCurrency(report.batteryComparisons.find(item => !item.batteryId)?.lifetimeNetValuePence) }}</strong><small v-if="optimizedBatteryComparisons" class="text-stone-500">{{ report.batteryComparisons.find(item => !item.batteryId)?.recommendedPanelCount ?? report.batteryComparisons.find(item => !item.batteryId)?.panelsCount }} panels</small></span></button><button v-for="battery in report.batteryPresets" :key="battery.id" class="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm" :class="selectedBatteryId === battery.id ? 'border-[var(--solar-accent)] bg-blue-50' : 'border-stone-200'" @click="selectedBatteryId = battery.id"><span>{{ battery.name }}</span><span class="text-right"><strong class="block">{{ formatCurrency(report.batteryComparisons.find(item => item.batteryId === battery.id)?.lifetimeNetValuePence) }}</strong><small v-if="optimizedBatteryComparisons" class="text-stone-500">{{ report.batteryComparisons.find(item => item.batteryId === battery.id)?.recommendedPanelCount ?? report.batteryComparisons.find(item => item.batteryId === battery.id)?.panelsCount }} panels</small></span></button></div><p v-if="!optimizedBatteryComparisons && submittedBatteryRecommendation && submittedBatteryRecommendation !== selectedPanelCount" class="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">The highest modeled lifetime value for the battery selected at submission uses {{ submittedBatteryRecommendation }} panels. A revised server calculation is required before changing this locked report.</p></div>
                <div class="rounded-xl bg-white p-4 shadow-sm"><h3 class="font-semibold">Selected scenario</h3><dl class="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt class="text-stone-500">Installed estimate</dt><dd class="font-semibold">{{ formatCurrency(activeScenario?.installationCostPence) }}</dd></div><div><dt class="text-stone-500">Lifetime savings</dt><dd class="font-semibold">{{ formatCurrency(activeScenario?.lifetimeSavingsPence) }}</dd></div><div><dt class="text-stone-500">Self-consumed</dt><dd class="font-semibold">{{ formatNumber(activeScenario?.annualSelfConsumedKwh) }} kWh/year</dd></div><div><dt class="text-stone-500">Exported</dt><dd class="font-semibold">{{ formatNumber(activeScenario?.annualExportedKwh) }} kWh/year</dd></div></dl></div>
                <details class="rounded-xl bg-white p-4 shadow-sm"><summary class="cursor-pointer font-semibold">Calculation assumptions</summary><dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><div v-for="item in assumptionRows" :key="item.label"><dt class="text-stone-500">{{ item.label }}</dt><dd class="font-medium text-stone-800">{{ item.value }}</dd></div></dl></details>
                <details class="rounded-xl bg-white p-4 shadow-sm"><summary class="cursor-pointer font-semibold">Yearly projection</summary><div class="mt-3 max-h-56 overflow-auto"><table class="w-full text-xs"><thead><tr class="text-left text-stone-500"><th class="py-1">Year</th><th>Generation</th><th>Bill saving</th></tr></thead><tbody><tr v-for="year in activeScenario?.annualBreakdown" :key="year.year" class="border-t border-stone-100"><td class="py-1.5">{{ year.year }}</td><td>{{ year.generationKwh.toLocaleString() }} kWh</td><td>{{ formatCurrency(year.billSavingsPence) }}</td></tr></tbody></table></div></details>
              </div>

              <p v-if="inlineError" role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ inlineError }}</p>
              <div class="mt-5 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-500"><p>{{ report?.disclaimer || solarResult.disclaimer }}</p><p class="mt-2 font-medium">{{ report?.sourceAttribution || solarResult.sourceAttribution }}</p></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.solar-modal-enter-active,.solar-modal-leave-active{transition:opacity .2s ease}.solar-modal-enter-from,.solar-modal-leave-to{opacity:0}.solar-range{accent-color:var(--solar-accent)}
</style>
