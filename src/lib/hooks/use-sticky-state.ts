'use client'

import { useState, useEffect, Dispatch, SetStateAction } from 'react'

export function useStickyState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        setState(JSON.parse(stored) as T)
      }
    } catch {
      // corrupted JSON or unavailable storage — keep initialValue
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // quota exceeded or private browsing — silently ignore
    }
  }, [key, state])

  return [state, setState]
}
