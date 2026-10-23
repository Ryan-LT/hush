import type { CalEvent, CalendarInfo, EventKind } from '../src/shared/types'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3'

export const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly']

export class GoogleError extends Error {
  constructor(readonly code: string) {
    super(`Google API error: ${code}`)
  }
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  id_token?: string
  error?: string
}

export function googleAuthUrl(env: Env, state: string) {
  const url = new URL(AUTH_URL)
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/auth/google/callback`,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  }).toString()
  return url.toString()
}

async function token(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams(params) })
  const data = (await res.json()) as TokenResponse
  if (!res.ok || data.error) throw new GoogleError(data.error === 'invalid_grant' ? 'reconnect_required' : (data.error ?? `http_${res.status}`))
  return data
}

export const exchangeCode = (env: Env, code: string) =>
  token({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${env.APP_URL}/auth/google/callback`,
    grant_type: 'authorization_code',
  })

export const refreshAccessToken = (env: Env, refreshToken: string) =>
  token({ refresh_token: refreshToken, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' })

/** The id_token comes straight from Google over TLS, so reading its payload without verifying is fine. */
export function emailFromIdToken(idToken: string): string {
  const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string }
  return payload.email ?? 'Google account'
}

async function get<T>(path: string, accessToken: string, params: [string, string][] = []): Promise<T> {
  const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (res.status === 401) throw new GoogleError('token_rejected')
  if (!res.ok) throw new GoogleError(`http_${res.status}`)
  return (await res.json()) as T
}

export async function listCalendars(accessToken: string): Promise<CalendarInfo[]> {
  type Item = { id: string; summary?: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean }
  const data = await get<{ items?: Item[] }>('/users/me/calendarList', accessToken, [
    ['minAccessRole', 'reader'],
    ['fields', 'items(id,summary,summaryOverride,backgroundColor,primary)'],
  ])
  return (data.items ?? [])
    .map((c) => ({
      id: c.id,
      name: c.summaryOverride || c.summary || c.id,
      color: c.backgroundColor ?? '#3b82f6',
      primary: Boolean(c.primary),
      selected: Boolean(c.primary),
    }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name))
}

interface GoogleEvent {
  id: string
  summary?: string
  status?: string
  transparency?: string
  visibility?: string
  eventType?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: { self?: boolean; responseStatus?: string }[]
}

/** Keep only events that should affect your status: timed, busy, not declined. */
function normalize(e: GoogleEvent): CalEvent | null {
  if (e.status === 'cancelled' || e.transparency === 'transparent') return null
  if (!e.start?.dateTime || !e.end?.dateTime) return null
  if (e.attendees?.find((a) => a.self)?.responseStatus === 'declined') return null
  const kind: EventKind = e.eventType === 'focusTime' ? 'focusTime' : e.eventType === 'outOfOffice' ? 'outOfOffice' : 'default'
  return {
    id: e.id,
    title: (e.summary ?? '').slice(0, 200),
    start: Date.parse(e.start.dateTime),
    end: Date.parse(e.end.dateTime),
    kind,
    private: e.visibility === 'private' || e.visibility === 'confidential',
  }
}

export async function listEvents(accessToken: string, calendarId: string, from: number, to: number): Promise<CalEvent[]> {
  const data = await get<{ items?: GoogleEvent[] }>(`/calendars/${encodeURIComponent(calendarId)}/events`, accessToken, [
    ['timeMin', new Date(from).toISOString()],
    ['timeMax', new Date(to).toISOString()],
    ['singleEvents', 'true'],
    ['orderBy', 'startTime'],
    ['maxResults', '250'],
    ['eventTypes', 'default'],
    ['eventTypes', 'focusTime'],
    ['eventTypes', 'outOfOffice'],
    ['eventTypes', 'fromGmail'],
    ['fields', 'items(id,summary,status,transparency,visibility,eventType,start,end,attendees(self,responseStatus))'],
  ])
  return (data.items ?? []).map(normalize).filter((e): e is CalEvent => e !== null)
}

export async function revokeGoogleToken(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {})
}
