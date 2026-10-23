import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/legal'
import { CONTACT_EMAIL as CONTACT } from '@/lib/site'

export const metadata: Metadata = { title: 'Privacy' }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="October 15, 2026">
      <p>
        Hush (usehush.pages.dev) keeps your Slack status, presence and Do Not Disturb in sync with your working hours, routines and, if you connect it, your Google
        Calendar. This policy explains what data Hush accesses, why, how it is stored and shared, and how you can delete it. We collect only what that job needs,
        never sell it, and delete it when you ask.
      </p>

      <h2>Data we access and why</h2>
      <h3>Slack</h3>
      <ul>
        <li>
          <strong>Profile:</strong> your Slack user ID, workspace ID, display name and avatar URL, to sign you in and show how you appear in Slack.
        </li>
        <li>
          <strong>Access token:</strong> limited to reading and writing your own status, presence and Do Not Disturb. Hush cannot read messages, channels or files.
        </li>
      </ul>
      <h3>Google user data (optional)</h3>
      <p>If you choose to connect Google Calendar, Hush requests these permissions:</p>
      <ul>
        <li>
          <strong>openid and email</strong> (<code>openid</code>, <code>userinfo.email</code>): your Google account email address, used only to label the connected
          account in your dashboard so you can tell several accounts apart.
        </li>
        <li>
          <strong>Read-only calendar access</strong> (<code>calendar.readonly</code>): the list of your calendars, and for events from yesterday to seven days ahead,
          each event’s start and end time, title, busy/free status, your response (accepted or declined), whether it is all-day, its visibility (public or private)
          and its type (meeting, focus time or out of office).
        </li>
      </ul>
      <p>
        Hush uses this calendar data <strong>only</strong> to decide what your Slack status should be at a given moment: for example “In a meeting until 3:00 PM”
        while an accepted event is in progress, or “Out of office” during an out-of-office event. If you turn on “Use the event title as status”, the title of the
        current event is copied into your Slack status; titles of private events are left out unless you switch off “Hide private events”. Hush never creates, edits or deletes calendar events, and does not
        read attendee lists, descriptions, locations, attachments or meeting links.
      </p>
      <h3>Your settings</h3>
      <p>Working hours, routines, statuses, keyword rules and overrides that you create in Hush.</p>

      <h2>How we use data</h2>
      <ul>
        <li>To compute your current status and apply it to Slack, about once a minute.</li>
        <li>To show your schedule and a preview of your Slack status in the Hush dashboard.</li>
      </ul>
      <p>We do not use your data for advertising, profiling, analytics, or training machine-learning or AI models.</p>

      <h2>Limited Use of Google user data</h2>
      <p>
        Hush’s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. In particular:
      </p>
      <ul>
        <li>Google user data is used only to provide and improve the user-facing status feature described above.</li>
        <li>It is not transferred to anyone, except as needed to provide that feature, to comply with law, or as part of a merger or acquisition with notice to you.</li>
        <li>It is not used or transferred for serving ads, including retargeting, personalised or interest-based advertising.</li>
        <li>It is not sold, and it is not used to determine creditworthiness or for lending purposes.</li>
        <li>No human reads your Google user data unless you give explicit consent (for example, to debug an issue you report), it is needed for security or to comply with law.</li>
      </ul>

      <h2>Storage and security</h2>
      <ul>
        <li>Data is stored in a Cloudflare D1 database and processed on Cloudflare Workers. It is sent over HTTPS only.</li>
        <li>Slack and Google access and refresh tokens are encrypted at rest with AES-256-GCM.</li>
        <li>Sessions use signed, HttpOnly, SameSite cookies. There are no advertising, analytics or third-party cookies.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell, rent or share your data with third parties. Your data is sent only to Slack (to set your status) and to Cloudflare, which hosts the service
        as our infrastructure provider.
      </p>

      <h2>Retention and deletion</h2>
      <ul>
        <li>Calendar events are kept only for the rolling window of yesterday to seven days ahead and are overwritten on each refresh.</li>
        <li>Disconnecting a Google account in Settings revokes Hush’s Google token and deletes that account’s calendars and events immediately.</li>
        <li>Settings → Delete account revokes the Slack and Google tokens and permanently erases every record Hush holds about you, immediately.</li>
        <li>
          You can also revoke Hush’s access at any time from your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Google Account permissions
          </a>{' '}
          page or your Slack app settings.
        </li>
      </ul>

      <h2>Children</h2>
      <p>Hush is a workplace tool and is not directed at children under 13.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we will update the date above and, for material changes, notify you in the app.</p>

      <h2>Contact</h2>
      <p>
        Questions or deletion requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </LegalPage>
  )
}
