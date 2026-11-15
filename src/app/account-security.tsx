import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Link } from '@void/react';
import { useLocaleContext } from 'fbtee';
import { useEffect, useState } from 'react';
import { auth } from 'void/client';
import { text } from '../i18n/text';
import type { SessionUser } from './workspace';

export function AccountSecurity({ user }: { user: SessionUser }) {
  const { locale } = useLocaleContext();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (sent) {
      const timer = setTimeout(() => setSent(false), 60_000);
      return () => clearTimeout(timer);
    }
  }, [sent]);
  const resend = async () => {
    setPending(true);
    setError('');
    try {
      const result = await auth.sendVerificationEmail({
        callbackURL: '/verify-email?verified=1',
        email: user.email,
        fetchOptions: { headers: { 'x-pkmn-locale': locale } },
      });
      if (result.error) {
        setError(text('Could not send the email. Please try again later.'));
      } else {
        setSent(true);
      }
    } catch {
      setError(text('Could not connect. Please try again.'));
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="settings-section account-security">
      <h2>{text('Account')}</h2>
      <p>
        {user.email} · {user.emailVerified ? text('Verified') : text('Not verified')}
      </p>
      <Stack align="center" className="settings-fields" direction="horizontal" gap={4} wrap="wrap">
        {!user.emailVerified && (
          <Button
            isDisabled={pending || sent}
            label={
              sent
                ? text('Verification email sent')
                : pending
                  ? text('Sending…')
                  : text('Send verification email')
            }
            onClick={() => void resend()}
          />
        )}
        <Link className="text-button" href="/forgot-password">
          {text('Reset password')}
        </Link>
      </Stack>
      {sent && <p role="status">{text('Check your inbox for a verification link.')}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
