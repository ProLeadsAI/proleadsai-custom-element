import assert from 'node:assert/strict'
import test from 'node:test'
import { projectSolarPanelFootprint } from '../src/utils/solarPanelGeometry.ts'

test('projects portrait panels along the roof azimuth', () => {
  const projection = projectSolarPanelFootprint({
    orientation: 'PORTRAIT',
    panelWidthMeters: 1.1,
    panelHeightMeters: 1.8,
    pitchDegrees: 0,
    azimuthDegrees: 180,
  })

  assert.equal(projection.widthMeters, 1.1)
  assert.equal(projection.lengthMeters, 1.8)
  assert.equal(projection.leftHeadingDegrees, 90)
  assert.equal(projection.rightHeadingDegrees, 270)
})

test('swaps landscape dimensions and foreshortens the slope dimension', () => {
  const projection = projectSolarPanelFootprint({
    orientation: 'LANDSCAPE',
    panelWidthMeters: 1.1,
    panelHeightMeters: 1.8,
    pitchDegrees: 60,
    azimuthDegrees: 135,
  })

  assert.equal(projection.widthMeters, 1.8)
  assert.ok(Math.abs(projection.lengthMeters - 0.55) < 1e-9)
  assert.equal(projection.azimuthDegrees, 135)
})

test('clamps invalid roof pitches to safe overhead projections', () => {
  const negative = projectSolarPanelFootprint({
    orientation: 'PORTRAIT',
    panelWidthMeters: 1,
    panelHeightMeters: 2,
    pitchDegrees: -20,
  })
  const excessive = projectSolarPanelFootprint({
    orientation: 'PORTRAIT',
    panelWidthMeters: 1,
    panelHeightMeters: 2,
    pitchDegrees: 120,
  })

  assert.equal(negative.lengthMeters, 2)
  assert.ok(excessive.lengthMeters > 0)
  assert.ok(excessive.lengthMeters < 0.04)
})
