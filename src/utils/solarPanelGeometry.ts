export interface SolarPanelProjection {
  widthMeters: number
  lengthMeters: number
  azimuthDegrees: number
  leftHeadingDegrees: number
  rightHeadingDegrees: number
}

function clampPitch(pitchDegrees: number) {
  return Math.max(0, Math.min(89, Number.isFinite(pitchDegrees) ? pitchDegrees : 0))
}

/**
 * Converts Google's physical panel dimensions into the overhead footprint used
 * by a satellite map. The roof-slope dimension is foreshortened by cos(pitch).
 */
export function projectSolarPanelFootprint(input: {
  orientation: 'PORTRAIT' | 'LANDSCAPE'
  panelWidthMeters: number
  panelHeightMeters: number
  pitchDegrees?: number
  azimuthDegrees?: number
}): SolarPanelProjection {
  const portrait = input.orientation !== 'LANDSCAPE'
  const widthMeters = portrait ? input.panelWidthMeters : input.panelHeightMeters
  const physicalLengthMeters = portrait ? input.panelHeightMeters : input.panelWidthMeters
  const pitchRadians = clampPitch(Number(input.pitchDegrees ?? 0)) * Math.PI / 180
  const azimuthDegrees = Number.isFinite(input.azimuthDegrees) ? Number(input.azimuthDegrees) : 180

  return {
    widthMeters,
    lengthMeters: physicalLengthMeters * Math.cos(pitchRadians),
    azimuthDegrees,
    leftHeadingDegrees: azimuthDegrees - 90,
    rightHeadingDegrees: azimuthDegrees + 90,
  }
}
