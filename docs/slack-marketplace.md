# Slack Marketplace submission

Copy-paste text for *Submit to the Slack Marketplace* at https://api.slack.com/apps.

## Before submitting

- [ ] Hush is installed on 10+ active workspaces (used in the last 28 days, not sandboxes)
- [ ] *Manage Distribution → Activate Public Distribution* is on
- [ ] *OAuth & Permissions → User Token Scopes* match `slack-app-manifest.yml` (remove `users.profile:read` and `dnd:read` if still listed)
- [ ] A collaborator is added to the app
- [ ] Listing images (1600×1000 PNG/JPG, under 2 MB) and an optional 30–90 s YouTube demo with captions

## Listing

**Short description (≤10 words):** Your Slack status, presence and DND on autopilot.

**Long description:**
Hush keeps your Slack status, presence and Do Not Disturb in sync with your day, so people always know whether you're free.

- Working hours per weekday, including overnight shifts, in any time zone
- Routines such as lunch, deep work or school runs, each with its own status
- Google Calendar (optional): meetings, focus time and out-of-office events set your status. Declined, free and all-day events are ignored, and private titles are never shown.
- Keyword rules: "lunch" in an event title becomes 🥪 Lunch break
- One-tap overrides, scheduled ahead or open-ended, and a pause button
- Do Not Disturb turns on during meetings and focus blocks and off when they end
- Recent activity shows every change Hush made and why

Hush only manages your own status. It cannot read messages, channels or files. Free, with no ads in your status.

**Landing page:** https://usehush.pages.dev
**Direct install URL:** https://usehush.pages.dev/auth/slack (302 to slack.com/oauth/v2/authorize)
**Support:** https://usehush.pages.dev/support
**Privacy policy:** https://usehush.pages.dev/privacy
**Terms:** https://usehush.pages.dev/terms
**Pricing:** Free

## Scope justifications (user token)

| Scope | Method | Why |
| --- | --- | --- |
| `users.profile:write` | `users.profile.set` | Set and clear the user's own status text, emoji and expiration. |
| `users:write` | `users.setPresence` | Set the user's presence to away outside working hours and back to auto. |
| `dnd:write` | `dnd.setSnooze`, `dnd.endSnooze` | Turn Do Not Disturb on during meetings and focus blocks, and off when they end. |
| `users:read` | `users.info` | Read the user's name, avatar and time zone at sign-in to show their Slack profile preview. |
| `emoji:read` (optional) | `emoji.list` | Only requested when the user clicks *Connect workspace emoji*, so the emoji picker can offer the workspace's custom emoji. |

Hush has no bot token, no event subscriptions and no message, channel or file access. Every scope acts on the installing user's own profile.

## Security & compliance

- Hosted on Cloudflare Pages and Workers; data in Cloudflare D1.
- Slack and Google tokens are encrypted at rest with AES-256-GCM. Sessions are HMAC-signed, HttpOnly, SameSite=Lax cookies. TLS 1.2+ (Cloudflare).
- OAuth uses a per-request `state` value.
- Data stored: Slack user ID, workspace ID, display name, avatar URL, the user's settings and, if connected, calendar events from yesterday to 7 days ahead.
- Settings → Delete account revokes tokens and erases all data immediately.
- No AI/LLM processing. Data is never sold, shared or used for training.

## Test instructions for reviewers

1. Open https://usehush.pages.dev and click **Add to Slack**. Approve the permissions in your test workspace.
2. You land on the dashboard. Set working hours that include the current time and click Save. Within a minute your Slack status and presence update.
3. Add a routine starting in 2 minutes (for example from the Lunch template). When it starts, your status changes to that routine's status.
4. Click the **Focus** quick action. Your status becomes 🎧 Focusing for an hour and Do Not Disturb turns on. Remove the override to return to the schedule.
5. *Recent activity* lists each change and the reason.
6. Optional: in the Calendars section, click **Connect Google Calendar**, with any Google account and create an event starting now; status follows the event.
7. Uninstall: Settings → Delete account revokes access and erases data. Hush is also removable from the workspace's app settings.

No test account is needed; Hush works with any Slack workspace and an optional Google account.
