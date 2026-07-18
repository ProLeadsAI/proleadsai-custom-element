// API utilities for roof and solar estimates

import { getConfig } from './config'
import { assertWidgetAvailable, isOutOfCreditsError, markWidgetUnavailable } from './availability'

// Tool session ID - tracks a specific search "flow", refreshed after each form submission
// This is SEPARATE from sessionId (which is persistent per user/browser)
export function getToolSessionId(): string | null {
  try {
    return localStorage.getItem('proleadsai_tool_session_id') || null
  } catch {
    return null
  }
}

export function setToolSessionId(id: string) {
  try {
    localStorage.setItem('proleadsai_tool_session_id', id)
  } catch {
    // localStorage not available
  }
}

export interface RoofEstimateResult {
  estimatorType: 'roofing'
  address: string
  addressComponents?: {
    streetAddress?: string
    streetAddress2?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  coordinates: { lat: number; lng: number }
  roofAreaSqFt: number
  roofSquares: number
  pricePerSquare: number
  estimate: number
  roofOutlinePoints: Array<{ lat: number; lng: number }>
  roofPitch: {
    predominantPitchType: string
    averagePitch: number
  }
  /** Canonical anonymous estimate session used by the contact gate. */
  sessionId: string
  /** Backward-compatible alias for integrations that still read this field. */
  toolSessionId?: string
  expiresAt?: string
  source?: string
  success: boolean
  error?: boolean
  message?: string
}

export interface FormSubmitResult {
  success: boolean
  leadId?: string
  submissionId?: string
  estimatorType?: 'roofing'
  report?: unknown
  alreadySubmitted?: boolean
  /** Backward-compatible alias for leadId. */
  id?: string
  toolSessionId?: string
  error?: boolean
  message?: string
}

export interface SolarPanelPlacement {
  center: { latitude: number; longitude: number }
  orientation: 'PORTRAIT' | 'LANDSCAPE'
  segmentIndex: number
  yearlyEnergyDcKwh: number
  azimuthDegrees: number
  /** Roof pitch for projecting the physical panel footprint onto an overhead map. */
  pitchDegrees?: number
}

export interface SolarBranding {
  primaryColor?: string
  logoUrl?: string
  fontFamily?: string
  hideProLeadsBranding?: boolean
  solarTitle?: string
  solarSubtitle?: string
}

export interface SolarPreviewConfiguration {
  panelsCount: number
  yearlyEnergyAcKwh: number
  systemSizeKwp: number
  firstYearSavingsPence: number
}

export interface SolarScenario extends SolarPreviewConfiguration {
  recommendedPanelCount?: number
  yearlyEnergyDcKwh: number
  lifetimeSavingsPence: number
  installationCostPence: number
  lifetimeNetValuePence: number
  paybackYears: number | null
  batteryId: string | null
  annualSelfConsumedKwh: number
  annualExportedKwh: number
  annualBreakdown: Array<{
    year: number
    generationKwh: number
    billSavingsPence: number
    discountedSavingsPence: number
  }>
}

export interface SolarEstimateResult {
  sessionId: string
  estimatorType: 'solar'
  address: string
  addressComponents: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  coordinates: { lat: number; lng: number }
  expiresAt: string
  solar: {
    quality: 'HIGH' | 'MEDIUM'
    center?: { latitude: number; longitude: number }
    boundingBox?: {
      sw: { latitude: number; longitude: number }
      ne: { latitude: number; longitude: number }
    }
    usableAreaM2: number
    roofAreaM2: number
    sunshineHoursPerYear: number
    panelCapacityWatts: number
    panelWidthMeters: number
    panelHeightMeters: number
    maximumPanels: number
    panels: SolarPanelPlacement[]
    configurations: SolarPreviewConfiguration[]
    recommendedPanelCount: number
    annualUsageKwh: number
    usageSource: 'customer' | 'roof-area-heuristic'
    tariff: {
      region: string
      importRatePencePerKwh: number
      source: string
      effectiveFrom: string
      effectiveTo: string
      customerOverride: boolean
    }
  }
  batteryOptions?: Array<{ id: string; name: string; usableCapacityKwh: number }>
  branding?: SolarBranding
  disclaimer: string
  sourceAttribution: string
  success: boolean
}

export interface SolarManualFollowupResult {
  sessionId: string
  estimatorType: 'solar'
  manualFollowup: true
  coverage: 'unavailable'
  address: string
  addressComponents: SolarEstimateResult['addressComponents']
  coordinates: { lat: number; lng: number }
  expiresAt: string
  source?: string
  branding?: SolarBranding
  disclaimer: string
  sourceAttribution: string
  success: true
}

export type SolarEstimateResponse = SolarEstimateResult | SolarManualFollowupResult

export function isSolarEstimateResult(value: SolarEstimateResponse | null | undefined): value is SolarEstimateResult {
  return Boolean(value && 'solar' in value)
}

export interface SolarUnlockedReport {
  solar: SolarEstimateResult['solar'] & {
    configurations: Array<SolarScenario>
    assumptions: Record<string, unknown>
  }
  selectedScenario: SolarScenario
  batteryComparisons: SolarScenario[]
  batteryPresets: Array<{
    id: string
    name: string
    usableCapacityKwh: number
    installedCostPence: number
    roundTripEfficiencyPercent: number
    cyclesPerYear?: number
  }>
  batteryRecommendedPanelCount: number
  disclaimer: string
  sourceAttribution: string
}

export interface SolarManualFollowupReport {
  manualFollowup: true
  coverage: 'unavailable'
  disclaimer: string
  sourceAttribution: string
}

export async function getRoofEstimate(params: {
  lat?: number
  lng?: number
  address?: string
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  addressCountry?: string
}): Promise<RoofEstimateResult> {
  const config = getConfig()
  await assertWidgetAvailable()

  const coordinates = params.lat !== undefined && params.lng !== undefined
    ? { lat: params.lat, lng: params.lng }
    : undefined
  const response = await fetch(`${config.apiBaseUrl}/organization/${config.orgId}/estimates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      estimatorType: 'roofing',
      coordinates,
      address: {
        formattedAddress: params.address,
        streetAddress: params.streetAddress,
        addressLocality: params.addressLocality,
        addressRegion: params.addressRegion,
        postalCode: params.postalCode,
        addressCountry: params.addressCountry,
      },
      source: config.source,
    }),
  })

  if (!response.ok)
    throw await parseApiError(response, 'Failed to get roof estimate')

  const data = await response.json()
  if (data?.error)
    throw new Error(data?.message || 'Failed to get roof estimate')
  if (!data?.sessionId || !data?.roofing || !data?.coordinates)
    throw new Error('The roof estimate response was incomplete')

  // Preserve the legacy flattened response while retaining the canonical
  // anonymous-session ID required by the contact submission endpoint.
  const result: RoofEstimateResult = {
    estimatorType: 'roofing',
    address: data.address || params.address || '',
    addressComponents: data.addressComponents,
    coordinates: data.coordinates,
    roofAreaSqFt: data.roofing.roofAreaSqFt,
    roofSquares: data.roofing.roofSquares,
    pricePerSquare: data.roofing.pricePerSquare,
    estimate: data.roofing.estimate,
    roofOutlinePoints: data.roofing.roofOutlinePoints || [],
    roofPitch: data.roofing.roofPitch,
    sessionId: data.sessionId,
    toolSessionId: data.sessionId,
    expiresAt: data.expiresAt,
    source: data.source,
    success: data.success !== false,
  }

  setToolSessionId(data.sessionId)
  window.sessionId = data.sessionId
  try {
    localStorage.setItem('proleadsai_session_id', data.sessionId)
  }
  catch {
    // localStorage not available
  }

  return result
}

export async function submitRoofEstimateForm(data: {
  sessionId: string
  name: string
  email: string
  phone: string
  privacyAccepted: boolean
  marketingAccepted: boolean
  coordinates?: { lat: number; lng: number }
}): Promise<FormSubmitResult> {
  const config = getConfig()
  const url = `${config.apiBaseUrl}/organization/${config.orgId}/estimates/${encodeURIComponent(data.sessionId)}/lead`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      contact: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
      consent: {
        privacyAccepted: data.privacyAccepted,
        marketingAccepted: data.marketingAccepted,
        capturedAt: new Date().toISOString(),
      },
      source: config.source,
    }),
  })

  if (!response.ok)
    throw await parseApiError(response, 'Failed to submit roof estimate')

  const result = await response.json()
  return {
    ...result,
    id: result.leadId,
  }
}

async function parseApiError(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => ({}))
  const message = errorData.message || errorData.statusMessage || fallback
  if (response.status === 403 && isOutOfCreditsError(message))
    markWidgetUnavailable(message)
  return new Error(message)
}

export async function createSolarEstimate(params: {
  coordinates: { lat: number; lng: number }
  address: {
    formattedAddress: string
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  annualUsageKwh?: number | null
  importRatePencePerKwh?: number | null
}): Promise<SolarEstimateResponse> {
  const config = getConfig()
  await assertWidgetAvailable()
  const response = await fetch(`${config.apiBaseUrl}/organization/${config.orgId}/estimates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify({
      estimatorType: 'solar',
      coordinates: params.coordinates,
      address: params.address,
      inputs: {
        annualUsageKwh: params.annualUsageKwh || null,
        importRatePencePerKwh: params.importRatePencePerKwh || null
      },
      source: config.source
    })
  })
  if (!response.ok)
    throw await parseApiError(response, 'Failed to create solar estimate')
  return response.json()
}

export async function submitEstimateLead(params: {
  sessionId: string
  contact: { name: string; email: string; phone: string }
  privacyAccepted: boolean
  marketingAccepted: boolean
  panelCount?: number
  batteryId?: string | null
}): Promise<{ success: boolean; leadId: string; report: SolarUnlockedReport | SolarManualFollowupReport }> {
  const config = getConfig()
  const response = await fetch(`${config.apiBaseUrl}/organization/${config.orgId}/estimates/${encodeURIComponent(params.sessionId)}/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      contact: params.contact,
      consent: {
        privacyAccepted: params.privacyAccepted,
        marketingAccepted: params.marketingAccepted,
        capturedAt: new Date().toISOString()
      },
      selection: params.panelCount
        ? { panelCount: params.panelCount, batteryId: params.batteryId || null }
        : undefined,
      source: config.source
    })
  })
  if (!response.ok)
    throw await parseApiError(response, 'Failed to unlock solar report')
  return response.json()
}
