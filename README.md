# Hush — your Slack status, on autopilot

Hush sets your Slack **status, presence and Do Not Disturb** from your working hours, weekly routines, Google Calendar, keyword rules and one-tap overrides. Every feature is free. Nothing is added to your status.

- **Working hours** per weekday, including overnight shifts, in any time zone (DST-safe)
- **Routines**: repeating slots such as lunch, deep work or school runs, with their own status
- **Google Calendar**: meetings, focus time and out-of-office events, across several accounts and calendars. Declined, free and all-day events are ignored. Private titles are never shown.
- **Keyword rules**: “lunch” → 🥪 Lunch break. An emoji in an event title becomes your status emoji.
- **Overrides**: one-tap presets, custom statuses, scheduled ahead or open-ended
- **End time in your status**: optional “· until 1:00 PM” so people know when you’re back
- **Live preview**: a Slack-style profile card and a week timeline that update while you edit; click any moment on the timeline to preview it
- **Pause autopilot** for an hour, until tomorrow’s working hours, or until you turn it back on (resumes by itself)
- **Recent activity**: every change Hush made in Slack, and why
- **⌘K quick actions**: set a status, pause or jump anywhere from the keyboard
- **Routine templates** (lunch, deep work, gym, school run…) and the full Slack emoji set, plus your workspace’s custom emoji
- A short onboarding tour, light and dark themes, works on mobile (⌘S saves)

## How it works

```
Browser ──► Cloudflare Pages (usehush.pages.dev)
               │  static Next.js export (out/)
               │  out/_worker.js: /auth/* (Slack + Google OAuth) and /api/* (Hono)
               ▼
           Cloudflare D1 (users, overrides, calendar accounts)
               ▲
Background Worker "hush" (no public URL): cron every minute → resolve state → push changes to Slack
```

- `src/shared/engine.ts` decides your status at any instant. It runs in the browser for previews and on Cloudflare for syncing. Priority: override → calendar keyword rule → calendar event → routine → working hours → off hours.
- `worker/app.ts` is the API; `worker/pages.ts` serves it on Pages and `worker/index.ts` adds the cron for the background Worker. Both share the D1 database and `TOKEN_KEY`.
- The cron only looks at users whose `next_check_at` is due, so work grows with status *changes*, not with the number of users. Slack is called only when the state differs from what was last pushed.
- Each push sets `status_expiration` and a DND snooze that end at the next change, so Slack corrects itself even if a cron run is missed.
- Slack and Google tokens are encrypted with AES-256-GCM (`TOKEN_KEY`). Sessions are HMAC-signed, HttpOnly, SameSite=Lax cookies.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in SESSION_SECRET and TOKEN_KEY (openssl rand -base64 32)
npm run db:migrate:local
npm run dev                      # http://localhost:3210
```

Without Slack credentials, open **Try the live demo** on the homepage. It signs you in as a sandbox user whose Slack calls are simulated and whose calendar is sample data. It only works while `DEV_LOGIN="1"`; never set that in production.

Test the cron locally: `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`. Unit tests: `npm test`.

## Deploy (free)

Already deployed: **https://usehush.pages.dev** (Pages project `usehush`, Worker `hush`, D1 database `hush`).

Redeploy after changes:

```bash
npm run deploy            # builds, deploys the Pages site + API, then the background Worker
npm run db:migrate:remote # only when migrations/ changes
```

Secrets live on both deploy targets. `TOKEN_KEY` must be identical on both; changing it makes stored tokens unreadable.

| Secret | Pages (`--project-name usehush`) | Worker (`-c wrangler.worker.jsonc`) |
| --- | --- | --- |
| `SESSION_SECRET` | ✓ | |
| `TOKEN_KEY` | ✓ | ✓ |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` | ✓ | |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ✓ | ✓ |

```bash
npx wrangler pages secret put SLACK_CLIENT_ID --project-name usehush
npx wrangler secret put GOOGLE_CLIENT_ID -c wrangler.worker.jsonc
```

Pages picks up new secrets on the next deployment, so run `npm run deploy` afterwards.

**Custom emoji (optional)**: add the `emoji:read` user scope to the Slack app (it's in `slack-app-manifest.yml`), then use *Connect workspace emoji* in the emoji picker. Hush asks Slack for that extra permission only then.

**Slack app**: at <https://api.slack.com/apps> choose *Create New App → From a manifest* and paste `slack-app-manifest.yml` (its redirect URL already points at usehush.pages.dev). Copy the Client ID and Client Secret from *Basic Information* into the Pages secrets above. Under *Manage Distribution*, enable public distribution so other workspaces can install it.

### Google Calendar (optional)

1. In Google Cloud Console, create a project, enable the **Google Calendar API**, and configure the OAuth consent screen (External) with the scopes `openid`, `email` and `.../auth/calendar.readonly`.
2. Create an OAuth client (Web application) with the redirect URI `https://usehush.pages.dev/auth/google/callback`.
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on both Pages and the Worker (table above), then `npm run deploy`.
4. Set the consent screen to **In production**. In *Testing* mode, Google expires refresh tokens after 7 days. `calendar.readonly` is a sensitive scope: until Google verifies the app (free, takes a few days), users see an "unverified app" screen and you're limited to 100 users.

Local Google or Slack OAuth needs an HTTPS URL. Run `cloudflared tunnel --url http://localhost:3210` and set `APP_URL` in `.dev.vars` to the tunnel URL.

## Free-tier limits

| Resource | Workers Free | What Hush uses |
| --- | --- | --- |
| Requests | 100k/day | 1,440 cron runs + API calls |
| Subrequests | 50 per run | `FETCH_BUDGET=45` → about 15 Slack pushes or calendar refreshes per minute |
| D1 | 5 GB, 5M reads/day | A few KB per user |

That comfortably covers hundreds of active users. Changes that don't fit in one run carry over to the next minute, oldest first. Beyond that, Workers Paid ($5/month) raises the subrequest limit; set `FETCH_BUDGET` to around 900.

## Project layout

```
src/app/            Next.js routes: landing, /app dashboard, /privacy, /terms
src/components/     UI (shadcn/ui + Motion): landing/, dashboard/, slack/, timeline/, status/
src/shared/         engine, time zones, validation, emoji, defaults (shared with the Worker)
worker/             Hono API (app.ts), Pages entry (pages.ts), cron Worker (index.ts), OAuth, Slack + Google clients
migrations/         D1 schema
test/               engine tests (vitest)
```

Before launching publicly, replace the placeholder contact details in `src/app/privacy` and `src/app/terms` and set the source link in the footer.
