import { getConfig } from './config'

function normalizeOrigin(value: string | undefined) {
  if (!value)
    return ''
  try {
    return new URL(value, window.location.href).origin
  }
  catch {
    return ''
  }
}

export function getTrustedParentOrigin() {
  if (typeof window === 'undefined' || window.parent === window)
    return ''

  return normalizeOrigin(getConfig().parentOrigin)
    || normalizeOrigin(document.referrer)
}

export function postToTrustedParent(message: Record<string, unknown>) {
  const targetOrigin = getTrustedParentOrigin()
  if (!targetOrigin)
    return false

  window.parent.postMessage(message, targetOrigin)
  return true
}

export function isTrustedParentMessage(event: MessageEvent) {
  if (typeof window === 'undefined' || event.source !== window.parent)
    return false

  const trustedOrigin = getTrustedParentOrigin()
  return Boolean(trustedOrigin && event.origin === trustedOrigin)
}
