// API utilities for roof estimate

import { getConfig, getSessionId } from './config'
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
  address: string
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
  toolSessionId?: string
  sessionId?: string
  success: boolean
  error?: boolean
  message?: string
}

export interface FormSubmitResult {
  success: boolean
  id?: string
  toolSessionId?: string
  error?: boolean
  message?: string
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
  const sessionId = getSessionId()
  const currentToolSessionId = getToolSessionId()

  const queryParams = new URLSearchParams()
  if (params.lat !== undefined) queryParams.set('lat', params.lat.toString())
  if (params.lng !== undefined) queryParams.set('lng', params.lng.toString())
  if (params.address) queryParams.set('address', params.address)
  if (params.streetAddress) queryParams.set('streetAddress', params.streetAddress)
  if (params.addressLocality) queryParams.set('addressLocality', params.addressLocality)
  if (params.addressRegion) queryParams.set('addressRegion', params.addressRegion)
  if (params.postalCode) queryParams.set('postalCode', params.postalCode)
  if (params.addressCountry) queryParams.set('addressCountry', params.addressCountry)
  if (sessionId) queryParams.set('sessionId', sessionId)
  if (currentToolSessionId) queryParams.set('toolSessionId', currentToolSessionId)

  const url = `${config.apiBaseUrl}/organization/${config.orgId}/roof-estimate?${queryParams}`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.message || 'Failed to get roof estimate'
    if (response.status === 403 && isOutOfCreditsError(message)) {
      markWidgetUnavailable(message)
    }
    throw new Error(message)
  }

  const data = await response.json()

  if (data?.error) {
    if (data?.statusCode === 403 && isOutOfCreditsError(data?.message)) {
      markWidgetUnavailable(data.message)
    }
    throw new Error(data?.message || 'Failed to get roof estimate')
  }

  // Update toolSessionId if returned (API creates one if not provided)
  if (data.toolSessionId) {
    setToolSessionId(data.toolSessionId)
  }

  // Update sessionId if returned
  if (data.sessionId) {
    window.sessionId = data.sessionId
    try {
      localStorage.setItem('proleadsai_session_id', data.sessionId)
    } catch {
      // localStorage not available
    }
  }

  return data
}

export async function submitRoofEstimateForm(data: {
  name: string
  email: string
  phone: string
  coordinates?: { lat: number; lng: number }
}): Promise<FormSubmitResult> {
  const config = getConfig()
  const sessionId = getSessionId()
  const currentToolSessionId = getToolSessionId()

  // If there is no active search flow yet, block new submissions when the widget is unavailable.
  if (!currentToolSessionId) {
    await assertWidgetAvailable()
  }

  const url = `${config.apiBaseUrl}/organization/${config.orgId}/forms/submit`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formName: 'roof-estimate',
      name: data.name,
      email: data.email,
      phone: data.phone,
      sessionId,
      toolSessionId: currentToolSessionId,
      metadata: {
        coordinates: data.coordinates,
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.message || 'Failed to submit form'
    if (response.status === 403 && isOutOfCreditsError(message)) {
      markWidgetUnavailable(message)
    }
    throw new Error(message)
  }

  const result = await response.json()

  // After submission, update to the new toolSessionId returned by API
  // This starts a fresh "flow" for the next set of searches
  if (result.toolSessionId) {
    setToolSessionId(result.toolSessionId)
  }

  return result
}
