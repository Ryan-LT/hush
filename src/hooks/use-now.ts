'use client'

import { useCallback, useEffect, useState } from 'react'

/** Current time, refreshed every `ms` and on demand (e.g. right after an action changes what "now" shows). */
export function useNow(ms = 15_000): [number, () => void] {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms])
  return [now, useCallback(() => setNow(Date.now()), [])]
}
