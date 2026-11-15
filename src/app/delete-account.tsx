import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { useState } from 'react';
import { text } from '../i18n/text';
import { TextField } from '../ui/fields';
import { FormStack } from '../ui/form-stack';
import { Dialog } from './dialog';
import { useWorkspace } from './workspace';

export function DeleteAccount() {
  const { deleteAccount } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    if (!pending) {
      setOpen(false);
      setPassword('');
      setError('');
    }
  };
  return (
    <>
      <section className="settings-section">
        <h2>{text('Delete account')}</h2>
        <p>
          {text(
            'Permanently delete your account, binders, and API keys. Export your collection first if you want to keep a copy.',
          )}
        </p>
        <Button
          label={text('Delete account')}
          onClick={() => setOpen(true)}
          variant="destructive"
        />
      </section>
      {open && (
        <Dialog close={close} title={text('Delete account')}>
          <FormStack
            onSubmit={async (event) => {
              event.preventDefault();
              if (pending) {
                return;
              }
              setPending(true);
              setError('');
              try {
                await deleteAccount(password);
              } catch {
                setError(text('Could not delete your account. Check your password and try again.'));
                setPending(false);
              }
            }}
          >
            <p>
              {text(
                'This cannot be undone. Shared links will stop working and all devices will be signed out.',
              )}
            </p>
            <TextField
              autoComplete="current-password"
              hasAutoFocus
              isDisabled={pending}
              isRequired
              label={text('Current password')}
              onChange={setPassword}
              type="password"
              value={password}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Stack direction="horizontal" gap={3} justify="end">
              <Button isDisabled={pending} label={text('Cancel')} onClick={close} type="button" />
              <Button
                isDisabled={pending || !password}
                label={pending ? text('Deleting…') : text('Delete account')}
                type="submit"
                variant="destructive"
              />
            </Stack>
          </FormStack>
        </Dialog>
      )}
    </>
  );
}
