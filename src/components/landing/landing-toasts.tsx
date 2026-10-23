'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/lib/api'

/** Surfaces ?error= and ?deleted= from OAuth redirects and account deletion. */
export function LandingToasts() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) toast.error(ERROR_MESSAGES[error] ?? `Sign-in failed (${error})`)
    if (params.has('deleted')) toast.success('Your account and data have been deleted.')
    if (error || params.has('deleted')) history.replaceState(null, '', window.location.pathname)
  }, [])
  return null
}
