import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/landing/legal'
import { CONTACT_EMAIL, SOURCE_URL } from '@/lib/site'

export const metadata: Metadata = { title: 'Support' }

export default function Support() {
  return (
    <LegalPage title="Support" updated="October 23, 2026">
      <h2>Contact us</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with a short description of the problem and, if you can, the time it happened and your time
        zone. We reply within 2 business days. You can also report bugs on{' '}
        <a href={`${SOURCE_URL}/issues`} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>

      <h2>Getting started</h2>
      <ul>
        <li>
          Click <strong>Add to Slack</strong> on the <Link href="/">homepage</Link> and approve the permissions. Hush only asks to change your own status, presence
          and Do Not Disturb.
        </li>
        <li>Set your working hours, then add routines such as lunch or deep work.</li>
        <li>Optionally connect Google Calendar in Settings so meetings, focus time and out-of-office events set your status.</li>
        <li>Hush checks every minute and updates Slack only when your status should change.</li>
      </ul>

      <h2>Troubleshooting</h2>
      <h3>My status didn’t change</h3>
      <p>
        Open the <Link href="/app">dashboard</Link>. If autopilot is paused, resume it. An active override wins over everything else, so clear it to go back to your
        schedule. <strong>Recent activity</strong> lists every change Hush made and why.
      </p>
      <h3>Hush replaced a status I set by hand</h3>
      <p>While autopilot is on, Hush owns your status. Use an override, or pause autopilot, to keep a status of your own.</p>
      <h3>A calendar event was ignored</h3>
      <p>Declined, free and all-day events are skipped on purpose. Keyword rules match words in the event title.</p>
      <h3>Hush says Slack is disconnected</h3>
      <p>Access was revoked in Slack, or you left the workspace. Click Add to Slack again to reconnect; your settings are kept.</p>

      <h2>Uninstalling and deleting your data</h2>
      <ul>
        <li>
          <strong>Settings → Delete account</strong> revokes Hush’s Slack and Google access and permanently erases everything Hush stores about you, immediately.
        </li>
        <li>
          You can also remove Hush from your Slack app settings. Hush then stops updating your status. To erase your data too, use Delete account or email us.
        </li>
      </ul>
      <p>
        See the <Link href="/privacy">privacy policy</Link> for what Hush accesses and why.
      </p>
    </LegalPage>
  )
}
