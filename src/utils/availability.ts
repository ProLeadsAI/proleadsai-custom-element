import { getConfig } from './config'

export interface WidgetAvailability {
  checked: boolean
  widgetEnabled: boolean
  reason: 'available' | 'out_of_credits' | 'unknown'
  message?: string
}

const DEFAULT_AVAILABLE: WidgetAvailability = {
  checked: false,
  widgetEnabled: true,
  reason: 'available',
}

let availabilityCache: WidgetAvailability | null = null
let availabilityPromise: Promise<WidgetAvailability> | null = null

function emitAvailabilityChanged(detail: WidgetAvailability) {
  window.dispatchEvent(new CustomEvent('proleadsai:availability-changed', { detail }))
}

function setAvailability(detail: WidgetAvailability) {
  availabilityCache = detail
  emitAvailabilityChanged(detail)
  return detail
}

export function markWidgetUnavailable(message?: string) {
  return setAvailability({
    checked: true,
    widgetEnabled: false,
    reason: 'out_of_credits',
    message: message || 'This widget is currently unavailable because no credits remain.'
  })
}

export function isOutOfCreditsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  const normalized = message.toLowerCase()
  return normalized.includes('out of credits')
    || normalized.includes('no credits remaining')
    || normalized.includes('used all your credits')
}

export async function getWidgetAvailability(force = false): Promise<WidgetAvailability> {
  const config = getConfig()
  if (!config.disableWhenUnavailable || !config.orgId) {
    return DEFAULT_AVAILABLE
  }

  if (!force && availabilityCache) {
    return availabilityCache
  }

  if (!force && availabilityPromise) {
    return availabilityPromise
  }

  availabilityPromise = fetch(`${config.apiBaseUrl}/organization/${config.orgId}/widget-status`, {
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) {
        return setAvailability(DEFAULT_AVAILABLE)
      }

      const data = await response.json()
      return setAvailability({
        checked: true,
        widgetEnabled: Boolean(data.widgetEnabled),
        reason: data.widgetEnabled ? 'available' : 'out_of_credits',
        message: typeof data.message === 'string' ? data.message : undefined
      })
    })
    .catch(() => setAvailability(DEFAULT_AVAILABLE))
    .finally(() => {
      availabilityPromise = null
    })

  return availabilityPromise
}

export async function assertWidgetAvailable() {
  const availability = await getWidgetAvailability()
  if (!availability.widgetEnabled) {
    throw new Error(availability.message || 'This widget is currently unavailable.')
  }
}
