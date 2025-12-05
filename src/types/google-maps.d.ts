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
    }
    sessionId?: string
  }
}

export {}
