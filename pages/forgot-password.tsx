import { Button } from '@astryxdesign/core/Button';
import { Link } from '@void/react';
import { useLocaleContext } from 'fbtee';
import { useState, type FormEvent } from 'react';
import { auth } from 'void/client';
import { text } from '../src/i18n/text';
import { TextField } from '../src/ui/fields';
import { FormStack } from '../src/ui/form-stack';

export default function ForgotPassword() {
  const { locale } = useLocaleContext();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email'));
    setPending(true);
    setError('');
    try {
      const result = await auth.requestPasswordReset({
        email,
        fetchOptions: { headers: { 'x-pkmn-locale': locale } },
        redirectTo: '/reset-password',
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
  }
  return (
    <main className="auth-card">
      <h1>{text('Reset password')}</h1>
      {sent ? (
        <p role="status">
          {text('If an account exists for that address, you’ll receive a reset link shortly.')}
        </p>
      ) : (
        <FormStack onSubmit={submit}>
          <TextField
            autoComplete="email"
            htmlName="email"
            isRequired
            label={text('Email')}
            type="email"
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="primary-button"
            isDisabled={pending}
            label={pending ? text('Sending…') : text('Send reset link')}
            type="submit"
            variant="primary"
          >
            {pending ? text('Sending…') : text('Send reset link')}
          </Button>
        </FormStack>
      )}
      <Link className="text-button" href="/login">
        {text('Back to sign in')}
      </Link>
    </main>
  );
}
