import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Link, useShared } from '@void/react';
import { useState, type FormEvent } from 'react';
import { auth } from 'void/client';
import type { Shared } from '../src/app/workspace';
import { text } from '../src/i18n/text';
import { TextField } from '../src/ui/fields';
import { FormStack } from '../src/ui/form-stack';
export default function Login() {
  const { user } = useShared<Shared>();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    const values = {
      email: String(data.get('email')),
      name: String(data.get('name') ?? ''),
      password: String(data.get('password')),
    };
    try {
      const result = signup
        ? await auth.signUp.email({ ...values, callbackURL: '/verify-email?verified=1' })
        : await auth.signIn.email(values);
      if (result.error) {
        setError(result.error.message ?? text('Could not sign in.'));
      } else {
        location.assign('/');
      }
    } catch {
      setError(text('Could not connect. Please try again.'));
    } finally {
      setPending(false);
    }
  }
  if (user) {
    return (
      <main className="shell empty">
        <h1>{text('You’re signed in')}</h1>
        <Link href="/">{text('Open your binders')}</Link>
      </main>
    );
  }
  return (
    <main className="auth-card">
      <h1>{signup ? text('Create account') : text('Sign in')}</h1>
      <FormStack defaultOptionality="required" onSubmit={submit}>
        {signup && (
          <TextField
            autoComplete="name"
            htmlName="name"
            isRequired
            label={text('Name')}
            maxLength={80}
          />
        )}
        <TextField
          autoComplete="username"
          htmlName="email"
          isRequired
          label={text('Email')}
          type="email"
        />
        <TextField
          autoComplete={signup ? 'new-password' : 'current-password'}
          htmlName="password"
          isRequired
          key={signup ? 'signup-password' : 'signin-password'}
          label={text('Password')}
          maxLength={128}
          minLength={10}
          type="password"
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button
          className="primary-button"
          isDisabled={pending}
          label={pending ? text('Opening…') : signup ? text('Create account') : text('Sign in')}
          type="submit"
          variant="primary"
        >
          {pending ? text('Opening…') : signup ? text('Create account') : text('Sign in')}
        </Button>
      </FormStack>
      <Stack
        align="center"
        className="auth-actions"
        direction="horizontal"
        gap={4}
        justify="between"
        wrap="wrap"
      >
        {!signup && (
          <Link className="text-button" href="/forgot-password">
            {text('Forgot password?')}
          </Link>
        )}
        <Button
          className="text-button"
          label={signup ? text('Already have an account? Sign in') : text('Create a free account')}
          onClick={() => {
            setSignup(!signup);
            setError('');
          }}
          type="button"
          variant="ghost"
        >
          {signup ? text('Already have an account? Sign in') : text('Create a free account')}
        </Button>
      </Stack>
    </main>
  );
}
