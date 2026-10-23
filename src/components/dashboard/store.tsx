'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { currentState, nextChange, resolveAt, statusText } from '@/shared/engine'
import type { Current, EngineInput, MeResponse, Resolved, Settings } from '@/shared/types'
import { api, ERROR_MESSAGES, UnauthorizedError } from '@/lib/api'
import { useNow } from '@/hooks/use-now'
import { CustomEmojiProvider } from '../status/custom-emoji'

interface HushStore {
  me: MeResponse
  /** Settings being edited; saved explicitly */
  draft: Settings
  update: (fn: (draft: Settings) => void) => void
  dirty: boolean
  saving: boolean
  save: () => Promise<void>
  discard: () => void
  /** Run an API call that returns a fresh snapshot */
  run: (call: Promise<MeResponse>, success?: string) => Promise<MeResponse | undefined>
  now: number
  /** Engine input built from the draft, so previews update while editing */
  input: EngineInput
  current: Current
  /** A moment picked on the timeline to preview (null = now) */
  previewAt: number | null
  setPreviewAt: (t: number | null) => void
  /** What Slack shows at previewAt (or now), with the end time rendered into the text */
  preview: { at: number; resolved: Resolved; text: string; until: number | null }
  /** Workspace custom emoji (name -> URL or "alias:name"), if the emoji:read scope was granted */
  customEmoji: { available: boolean; emoji: Record<string, string> }
}

const Ctx = createContext<HushStore | null>(null)

export function useHush() {
  const store = useContext(Ctx)
  if (!store) throw new Error('useHush must be used inside HushProvider')
  return store
}

export function errorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  return ERROR_MESSAGES[msg] ?? msg
}

function handleError(e: unknown) {
  if (e instanceof UnauthorizedError) {
    window.location.href = '/'
    return
  }
  toast.error(errorMessage(e))
}

export function HushProvider({ initial, children }: { initial: MeResponse; children: ReactNode }) {
  const [me, setMe] = useState(initial)
  const [draft, setDraft] = useState(initial.settings)
  const [saving, setSaving] = useState(false)
  const [previewAt, setPreviewAt] = useState<number | null>(null)
  const [customEmoji, setCustomEmoji] = useState<{ available: boolean; emoji: Record<string, string> }>({ available: false, emoji: {} })
  const [now, refreshNow] = useNow()

  useEffect(() => {
    api.emoji().then(setCustomEmoji, () => {})
  }, [])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(me.settings), [draft, me.settings])

  const update = useCallback((fn: (d: Settings) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const run = useCallback(async (call: Promise<MeResponse>, success?: string) => {
    try {
      const next = await call
      setMe(next)
      refreshNow()
      if (success) toast.success(success)
      return next
    } catch (e) {
      handleError(e)
    }
  }, [refreshNow])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const next = await api.saveSettings(draft)
      setMe(next)
      setDraft(next.settings)
      toast.success(next.autopilot ? 'Saved and synced to Slack' : 'Saved')
    } catch (e) {
      handleError(e)
    } finally {
      setSaving(false)
    }
  }, [draft])

  const discard = useCallback(() => setDraft(me.settings), [me.settings])

  // Pick up calendar changes and expired overrides while the tab stays open
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') api.me().then(setMe, () => {})
    }
    const id = setInterval(refresh, 5 * 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // Cmd/Ctrl+S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && !saving) void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, saving, save])

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  const input = useMemo<EngineInput>(() => ({ settings: draft, overrides: me.overrides, events: me.events }), [draft, me.overrides, me.events])
  const current = useMemo(() => currentState(input, now), [input, now])
  const preview = useMemo(() => {
    const at = previewAt ?? now
    const resolved = resolveAt(input, at)
    const { until } = nextChange(input, at, 'state')
    return { at, resolved, until, text: statusText(resolved.state, until, draft.timezone, at) }
  }, [input, now, previewAt, draft.timezone])

  const value = useMemo(
    () => ({ me, draft, update, dirty, saving, save, discard, run, now, input, current, previewAt, setPreviewAt, preview, customEmoji }),
    [me, draft, update, dirty, saving, save, discard, run, now, input, current, previewAt, preview, customEmoji],
  )
  return (
    <Ctx.Provider value={value}>
      <CustomEmojiProvider emoji={customEmoji.emoji}>{children}</CustomEmojiProvider>
    </Ctx.Provider>
  )
}
