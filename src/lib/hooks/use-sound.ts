'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'brilliance-sound-enabled'

function getInitialSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return false
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  return true
}

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return getInitialSoundEnabled()
  })
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(soundEnabled))
    }
  }, [soundEnabled])

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext()
      } catch {
        return null
      }
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const playTone = useCallback(
    (frequency: number, startTime: number, duration: number, ctx: AudioContext) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, startTime)

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    },
    []
  )

  const playCorrect = useCallback(() => {
    if (!soundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Short bright ascending major third: C5 (523Hz) → E5 (659Hz), ~150ms total
    playTone(523, now, 0.08, ctx)
    playTone(659, now + 0.07, 0.08, ctx)
  }, [soundEnabled, getAudioContext, playTone])

  const playIncorrect = useCallback(() => {
    if (!soundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Soft descending minor tone: E4 (330Hz) → C4 (262Hz), ~120ms total
    playTone(330, now, 0.07, ctx)
    playTone(262, now + 0.06, 0.07, ctx)
  }, [soundEnabled, getAudioContext, playTone])

  const playComplete = useCallback(() => {
    if (!soundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Brief 3-note ascending major triad arpeggio: C5 → E5 → G5, each ~120ms, ~400ms total
    playTone(523, now, 0.12, ctx)
    playTone(659, now + 0.13, 0.12, ctx)
    playTone(784, now + 0.26, 0.15, ctx)
  }, [soundEnabled, getAudioContext, playTone])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev)
  }, [])

  return {
    soundEnabled,
    toggleSound,
    playCorrect,
    playIncorrect,
    playComplete,
  }
}
