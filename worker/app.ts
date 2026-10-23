import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ValidationError } from '../src/shared/validate'
import { api } from './api'
import { auth } from './auth'
import { GoogleError } from './google'
import { SlackError } from './slack'
import type { AppEnv } from './types'

export const app = new Hono<AppEnv>()

app.route('/auth', auth)
app.route('/api', api)
app.notFound((c) => c.json({ error: 'not_found' }, 404))

app.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400)
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  console.error(err)
  // OAuth callbacks are browser navigations, so send people back to a page rather than JSON
  if (c.req.path.startsWith('/auth/')) {
    const code = err instanceof SlackError || err instanceof GoogleError ? err.code : 'sign_in_failed'
    return c.redirect(`${c.req.path.includes('google') ? '/app' : '/'}?error=${encodeURIComponent(code)}`)
  }
  return c.json({ error: 'Something went wrong' }, 500)
})
