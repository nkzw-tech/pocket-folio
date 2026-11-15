import { Stack } from '@astryxdesign/core/Stack';
import { text } from '../src/i18n/text';
import '../src/app/privacy.css';
const sections = [
  [
    'Scope and operator',
    'This policy applies only to Pocket Folio at folio.nakazawa.tech and its hosted API, operated by Nakazawa Tech KK in Tokyo, Japan. It does not apply to local installations, forks, or independently hosted copies. Their operators are responsible for their own data practices.',
  ],
  [
    'Information we keep',
    'We store your name, email address, password hash, binders, card statuses, sharing preferences, and API-key permissions and activity. Sessions include technical information such as IP addresses and browser details. We store API-key hashes rather than the original keys. Hosting and email delivery also generate operational records.',
  ],
  [
    'How we use it',
    'We use this information to provide accounts, sync collections, share binders when you ask us to, deliver account emails, provide support, and prevent abuse. We do not sell personal information, run advertising, or use advertising trackers.',
  ],
  [
    'Cookies and local storage',
    'Essential cookies keep you signed in. Your browser stores preferences and an account-specific collection cache, including edits waiting to sync. These are used for the app to work, not for advertising. Signing out does not necessarily erase cached collections. You can clear site data in your browser; export unsynced changes first.',
  ],
  [
    'Sharing and agents',
    'Binders are private until you enable sharing. Anyone with a share link can view and copy its contents. Public profiles show only the binders you select. Revoking a link prevents future access through the service, but cannot remove copies or previews others already saved. An agent with an API key can access or change data within the permissions you grant; the agent provider has its own privacy practices.',
  ],
  [
    'External services',
    'Cloudflare provides hosting, database storage, security, and account email delivery. Gravatar provides profile pictures: your browser sends it a hash of your email address and normal connection information, including your IP address, even if no avatar exists. A hash is not anonymous. Card scans are served by our hosted app; following external links is subject to those sites’ policies.',
  ],
  [
    'Retention and deletion',
    'We keep account and collection data while your account exists. Settings → Account lets you export your collection or delete your account. Deletion removes your hosted binders, ownership records, share links, sessions, API keys, and agent history. It also clears the active account’s collection cache in the browser used to delete it. Copies on other devices and downloaded exports are not remotely erased.',
  ],
  [
    'Backups and security records',
    'Deleted data may remain in D1 recovery backups for up to 30 days. Hashed email-delivery counters and infrastructure security records may remain to prevent abuse or meet legal obligations. If a backup is restored, deletion requests must be reapplied before normal service resumes. We use access controls, password and key hashing, and encrypted connections to protect data.',
  ],
  [
    'Your choices and rights',
    'You can browse cards without an account, disable sharing, revoke API keys, export your collection, and delete your account. Depending on applicable law, you may also request access, correction, deletion, portability, or restrictions on processing, object to processing, and complain to a data protection authority. Contact us for help with these requests.',
  ],
  [
    'Processing and international transfers',
    'Where a legal basis is required, we process data to provide the service you request, protect the service and its users, comply with legal obligations, or with consent where applicable. We operate in Japan and our providers may process data in other countries. Contact us for information about international processing and applicable safeguards.',
  ],
  [
    'Policy updates',
    'We will publish changes on this page and update the date below. For material changes affecting existing users, we will provide notice through the app or email.',
  ],
] as const;
export default function Privacy() {
  return (
    <main className="shell privacy-page">
      <Stack gap={8}>
        <h1>{text('Privacy policy')}</h1>
        {sections.map(([title, body]) => (
          <Stack as="section" gap={3} key={title}>
            <h2>{text(title)}</h2>
            <p>{text(body)}</p>
            {title === 'External services' && (
              <Stack direction="horizontal" gap={4} wrap="wrap">
                <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a>
                <a href="https://automattic.com/privacy/">Gravatar / Automattic</a>
              </Stack>
            )}
          </Stack>
        ))}
        <Stack as="section" gap={3}>
          <h2>{text('Contact')}</h2>
          <a href="mailto:team@nakazawa.dev">team@nakazawa.dev</a>
          <a href="https://nakazawa.tech">Nakazawa Tech KK</a>
        </Stack>
        <p className="muted">{text('Last updated: November 17, 2026')}</p>
      </Stack>
    </main>
  );
}
