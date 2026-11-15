import { Button } from '@astryxdesign/core/Button';
import { Link } from '@void/react';
import { useEffect, useState, type FormEvent } from 'react';
import { auth } from 'void/client';
import { text } from '../src/i18n/text';
import { TextField } from '../src/ui/fields';
import { FormStack } from '../src/ui/form-stack';

export default function ResetPassword() {
  const [token] = useState(() => new URLSearchParams(location.search).get('token'));
  const [invalid, setInvalid] = useState(!token);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    history.replaceState(history.state, '', location.pathname);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get('password'));
    if (newPassword !== data.get('confirm')) {
      setError(text('Passwords don’t match.'));
      return;
    }
    setPending(true);
    setError('');
    try {
      const result = await auth.resetPassword({ newPassword, token: token ?? '' });
      if (result.error) {
        if (result.error.code === 'INVALID_TOKEN') {
          setInvalid(true);
        } else {
          setError(text('Could not reset your password. Please try again.'));
        }
      } else {
        setDone(true);
      }
    } catch {
      setError(text('Could not connect. Please try again.'));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="auth-card">
      <h1>{done ? text('Password updated') : text('Choose a new password')}</h1>
      {done ? (
        <>
          <p role="status">
            {text('Sign in with your new password. Your other sessions have been signed out.')}
          </p>
          <Button href="/login" label={text('Sign in')} variant="primary" />
        </>
      ) : invalid ? (
        <>
          <p role="alert">{text('This link has expired or has already been used.')}</p>
          <Button
            as={Link}
            href="/forgot-password"
            label={text('Request a new link')}
            variant="primary"
          />
        </>
      ) : (
        <FormStack onSubmit={submit}>
          <TextField
            autoComplete="new-password"
            htmlName="password"
            isRequired
            label={text('New password')}
            maxLength={128}
            minLength={10}
            type="password"
          />
          <TextField
            autoComplete="new-password"
            htmlName="confirm"
            isRequired
            label={text('Confirm password')}
            maxLength={128}
            minLength={10}
            type="password"
          />
          <p>{text('Use at least 10 characters.')}</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="primary-button"
            isDisabled={pending}
            label={pending ? text('Saving…') : text('Save password')}
            type="submit"
            variant="primary"
          >
            {pending ? text('Saving…') : text('Save password')}
          </Button>
        </FormStack>
      )}
    </main>
  );
}
