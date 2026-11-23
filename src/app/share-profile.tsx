import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Link, useShared } from '@void/react';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { text } from '../i18n/text';
import { Checkbox, TextField } from '../ui/fields';
import { FormStack } from '../ui/form-stack';
import { Dialog } from './dialog';
import { useWorkspace, type Shared } from './workspace';

export function ShareProfile({ close }: { close: () => void }) {
  const { user } = useShared<Shared>();
  const { dispatch, document, pending } = useWorkspace();
  const profile = document.profile;
  const [name, setName] = useState(profile?.name ?? user?.name ?? '');
  const [selected, setSelected] = useState(() => new Set(profile?.binderIds ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const url = profile?.token ? `${location.origin}/p/${profile.token}` : '';
  const save = async (enabled: boolean) => {
    setSaving(true);
    setError('');
    setCopied(false);
    try {
      await dispatch({
        profile: {
          binderIds: document.binders.filter(({ id }) => selected.has(id)).map(({ id }) => id),
          name: enabled ? name.trim() : profile!.name,
          token: enabled ? (profile?.token ?? crypto.randomUUID()) : null,
        },
        type: 'profile.settings',
      });
    } catch {
      setError(text('Couldn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog close={close} title={text('Share profile')}>
      <FormStack
        onSubmit={(event) => {
          event.preventDefault();
          void save(true);
        }}
      >
        <TextField
          isRequired
          label={text('Public name')}
          maxLength={80}
          onChange={setName}
          value={name}
        />
        <Stack gap={3}>
          <p className="muted">
            {text(
              'Only selected binders appear on your profile. Anyone with the link can view them.',
            )}
          </p>
          {document.binders.map((binder) => (
            <Checkbox
              key={binder.id}
              label={binder.name}
              onChange={(checked) => {
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) {
                    next.add(binder.id);
                  } else {
                    next.delete(binder.id);
                  }
                  return next;
                });
              }}
              value={selected.has(binder.id)}
            />
          ))}
        </Stack>
        <Stack direction="horizontal" gap={3} wrap="wrap">
          <Button
            isDisabled={saving || !name.trim()}
            label={text(url ? 'Save changes' : 'Create profile link')}
            type="submit"
            variant="primary"
          />
          {url && (
            <Button
              isDisabled={saving}
              label={text('Stop sharing')}
              onClick={() => void save(false)}
              type="button"
              variant="ghost"
            />
          )}
        </Stack>
      </FormStack>
      {url && (
        <Stack gap={4}>
          <TextField isReadOnly label={text('Profile link')} value={url} />
          <Stack direction="horizontal" gap={3} wrap="wrap">
            <Button
              icon={<Copy size={16} />}
              isDisabled={pending > 0}
              label={text(copied ? 'Copied' : pending ? 'Saving link…' : 'Copy link')}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              type="button"
            />
            {!pending && (
              <Button as={Link} href={url} label={text('View profile')} variant="ghost" />
            )}
          </Stack>
        </Stack>
      )}
      {error && <p role="alert">{error}</p>}
    </Dialog>
  );
}
