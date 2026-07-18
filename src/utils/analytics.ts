import { getConfig } from './config'
import { postToTrustedParent } from './messaging'

export type EstimatorEventName =
  | 'proleadsai_estimator_open'
  | 'proleadsai_address_submit'
  | 'proleadsai_estimate_view'
  | 'proleadsai_panel_config_change'
  | 'proleadsai_battery_select'
  | 'proleadsai_lead_submit'
  | 'proleadsai_report_unlock'
  | 'proleadsai_estimator_close'
  | 'proleadsai_estimator_error'

function sanitizeProperties(properties: Record<string, unknown>) {
  const blocked = new Set(['name', 'email', 'phone', 'address', 'fulladdress', 'formattedaddress', 'postcode', 'postalcode'])
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '')
    if (blocked.has(normalizedKey) || value === undefined || value === null)
      return false
    return ['string', 'number', 'boolean'].includes(typeof value)
  }))
}

export function emitEstimatorEvent(event: EstimatorEventName, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined')
    return
  const config = getConfig()
  const detail = {
    event,
    estimatorType: config.estimatorType,
    source: config.source,
    ...sanitizeProperties(properties)
  }

  // In direct custom-element mode the host must explicitly grant analytics consent.
  // Iframe hosts receive the PII-free event and apply their own consent state before
  // forwarding it to GA4, Meta or a host dataLayer.
  if (window.parent === window && (config.analyticsConsent || window.ProLeadsAIAnalyticsConsent === true)) {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(detail)
  }
  window.dispatchEvent(new CustomEvent('proleadsai:analytics', { detail }))

  if (window.parent !== window) {
    postToTrustedParent({
      type: 'proleadsai:analytics',
      event,
      properties: detail
    })
  }
}
