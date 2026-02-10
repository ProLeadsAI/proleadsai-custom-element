/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any
    __PROLEADSAI_CONFIG__?: {
      orgId?: string
      apiBaseUrl?: string
      googleMapsApiKey?: string
      primaryColor?: string
      textColor?: string
      displayMode?: string
      buttonText?: string
      buttonEmoji?: string
      buttonPosition?: string
      heading?: string
      subheading?: string
      bgStyle?: string
      bgColor?: string
      heroImage?: string
      marginTop?: string
      marginBottom?: string
      headingFont?: string
      headingColor?: string
      textFont?: string
      textColorShortcode?: string
    }
    sessionId?: string
    __PROLEADSAI_SHADOW_ROOT__?: ShadowRoot
    __PROLEADSAI_TELEPORT__?: HTMLElement
  }
}

export {}
