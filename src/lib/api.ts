import type { MeResponse, OverrideInput, Settings } from '@/shared/types'

export class UnauthorizedError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) throw new UnauthorizedError('Signed out')
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  config: () => request<{ demo: boolean; googleCalendar: boolean }>('GET', '/auth/config'),
  me: () => request<MeResponse>('GET', '/api/me'),
  saveSettings: (settings: Settings) => request<MeResponse>('PUT', '/api/settings', settings),
  addOverride: (input: OverrideInput) => request<MeResponse>('POST', '/api/overrides', input),
  removeOverride: (id: string) => request<MeResponse>('DELETE', `/api/overrides/${id}`),
  setAutopilot: (enabled: boolean, until?: number | null) => request<MeResponse>('POST', '/api/autopilot', { enabled, until: until ?? null }),
  emoji: () => request<{ available: boolean; emoji: Record<string, string> }>('GET', '/api/emoji'),
  sync: () => request<MeResponse>('POST', '/api/sync'),
  selectCalendars: (accountId: string, selected: string[]) => request<MeResponse>('PATCH', `/api/accounts/${accountId}`, { selected }),
  refreshAccount: (accountId: string) => request<MeResponse>('POST', `/api/accounts/${accountId}/refresh`),
  removeAccount: (accountId: string) => request<MeResponse>('DELETE', `/api/accounts/${accountId}`),
  deleteAccount: () => request<void>('DELETE', '/api/me'),
  logout: () => request<void>('POST', '/auth/logout'),
}

export const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled the sign-in.',
  invalid_state: 'That sign-in link expired. Please try again.',
  slack_disconnected: 'Slack access was revoked. Reconnect to keep your status in sync.',
  google_not_configured: 'Google Calendar isn’t set up on this server yet.',
  google_no_refresh_token: 'Google didn’t grant offline access. Please try connecting again.',
  reconnect_required: 'Google needs you to reconnect this calendar.',
  sign_in_failed: 'Sign-in failed. Please try again.',
  demo_no_google: 'The demo workspace can’t connect a real calendar.',
}
