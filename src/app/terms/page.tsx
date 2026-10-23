import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/legal'

export const metadata: Metadata = { title: 'Terms' }

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="October 14, 2026">
      <h2>The service</h2>
      <p>
        Hush updates your Slack status, presence and Do Not Disturb based on settings you choose and, optionally, your Google Calendar. It is provided free of charge,
        as is, without warranty of any kind.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Use Hush only with Slack workspaces and calendars you are allowed to connect.</li>
        <li>Don’t attempt to disrupt, overload or reverse-engineer the hosted service.</li>
      </ul>
      <h2>Availability</h2>
      <p>We aim for reliable minute-by-minute updates but can’t guarantee uninterrupted service. Statuses expire on their own in Slack if an update is ever missed.</p>
      <h2>Ending your use</h2>
      <p>You can delete your account at any time from Settings. We may suspend accounts that abuse the service.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of the service.</p>
    </LegalPage>
  )
}
