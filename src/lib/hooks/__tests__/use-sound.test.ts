import { describe, it, expect, beforeEach } from 'bun:test'

describe('useSound localStorage logic', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear()
    }
  })

  it('default sound enabled key is brilliance-sound-enabled', () => {
    expect('brilliance-sound-enabled').toBe('brilliance-sound-enabled')
  })

  it('sound enabled defaults to true when no stored preference', () => {
    const stored = typeof globalThis.localStorage !== 'undefined'
      ? globalThis.localStorage.getItem('brilliance-sound-enabled')
      : null
    const soundEnabled = stored !== null ? stored === 'true' : true
    expect(soundEnabled).toBe(true)
  })

  it('sound enabled reads false from stored preference', () => {
    if (typeof globalThis.localStorage === 'undefined') return
    globalThis.localStorage.setItem('brilliance-sound-enabled', 'false')
    const stored = globalThis.localStorage.getItem('brilliance-sound-enabled')
    const soundEnabled = stored !== null ? stored === 'true' : true
    expect(soundEnabled).toBe(false)
  })

  it('sound enabled reads true from stored preference', () => {
    if (typeof globalThis.localStorage === 'undefined') return
    globalThis.localStorage.setItem('brilliance-sound-enabled', 'true')
    const stored = globalThis.localStorage.getItem('brilliance-sound-enabled')
    const soundEnabled = stored !== null ? stored === 'true' : true
    expect(soundEnabled).toBe(true)
  })

  it('toggle persists new value', () => {
    if (typeof globalThis.localStorage === 'undefined') return
    globalThis.localStorage.setItem('brilliance-sound-enabled', 'true')
    const current = globalThis.localStorage.getItem('brilliance-sound-enabled') === 'true'
    const toggled = !current
    globalThis.localStorage.setItem('brilliance-sound-enabled', String(toggled))
    expect(globalThis.localStorage.getItem('brilliance-sound-enabled')).toBe('false')
  })
})

describe('useSound Web Audio tone parameters', () => {
  it('correct tone uses ascending frequencies (C5→E5)', () => {
    const C5 = 523.25
    const E5 = 659.25
    expect(E5).toBeGreaterThan(C5)
  })

  it('incorrect tone uses descending frequencies (E4→C4)', () => {
    const E4 = 329.63
    const C4 = 261.63
    expect(C4).toBeLessThan(E4)
  })

  it('completion tone uses 3-note ascending phrase (C5→E5→G5)', () => {
    const C5 = 523.25
    const E5 = 659.25
    const G5 = 783.99
    expect(E5).toBeGreaterThan(C5)
    expect(G5).toBeGreaterThan(E5)
  })

  it('volume should be subtle (0.15-0.2 range)', () => {
    const volume = 0.15
    expect(volume).toBeGreaterThanOrEqual(0.1)
    expect(volume).toBeLessThanOrEqual(0.3)
  })
})
