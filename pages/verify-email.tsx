import { Button } from '@astryxdesign/core/Button';
import { Link, useRouter } from '@void/react';
import { text } from '../src/i18n/text';
export default function VerifyEmail() {
  const { searchParams } = useRouter().url;
  const success = searchParams.get('verified') === '1' && !searchParams.has('error');
  return (
    <main className="auth-card">
      <h1>{success ? text('Email verified') : text('Verify your email')}</h1>
      <p role="status">
        {success
          ? text('Your email address is confirmed.')
          : text('This verification link is invalid or expired. Request a new one in Settings.')}
      </p>
      <Button
        as={Link}
        href={success ? '/' : '/settings'}
        label={success ? text('Open your binders') : text('Settings')}
        variant="primary"
      />
    </main>
  );
}
