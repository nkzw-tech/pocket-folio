import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { useState } from 'react';
import { text } from '../i18n/text';
import { Select } from '../select';
import { FormStack } from '../ui/form-stack';
import { Dialog } from './dialog';
import type { Command, PersonalBinder } from './model';

export function RemovePageDialog({
  binder,
  close,
  save,
}: {
  binder: PersonalBinder;
  close: () => void;
  save: (command: Command) => Promise<void>;
}) {
  const capacity = binder.columns * binder.rows;
  const pages = Math.ceil(binder.slots.length / capacity);
  const [page, setPage] = useState(pages - 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const occupied = binder.slots.slice(page * capacity, (page + 1) * capacity).some(Boolean);
  return (
    <Dialog close={close} title={text('Remove page')}>
      <FormStack
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) {
            return;
          }
          setPending(true);
          try {
            await save({
              binderId: binder.id,
              expected: { columns: binder.columns, rows: binder.rows, slots: binder.slots },
              page,
              type: 'binder.page.remove',
            });
            close();
          } catch (error_) {
            setError(
              error_ instanceof Error ? text(error_.message) : text('Could not save this change.'),
            );
            setPending(false);
          }
        }}
      >
        <Select
          disabled={pending}
          label={text('Page to remove')}
          onChange={(event) => setPage(Number(event))}
          value={page}
        >
          {Array.from({ length: pages }, (_, index) => (
            <option key={index} value={index}>
              {text('Page')} {index + 1} · {text('pockets')} {index * capacity + 1}–
              {(index + 1) * capacity}
            </option>
          ))}
        </Select>

        <p>
          {occupied
            ? text(
                'Cards on this page will leave the binder. Owned and purchased statuses stay unchanged.',
              )
            : text('Remove this empty page?')}
        </p>
        {error && <p role="alert">{error}</p>}
        <Stack
          align="center"
          className="binder-bottom-actions"
          direction="horizontal"
          gap={4}
          wrap="wrap"
        >
          <Button isDisabled={pending} label={text('Cancel')} onClick={close} type="button">
            {text('Cancel')}
          </Button>
          <Button
            className="danger-button"
            isDisabled={pending}
            label={text('Remove page')}
            type="submit"
            variant="destructive"
          >
            {text('Remove page')}
          </Button>
        </Stack>
      </FormStack>
    </Dialog>
  );
}
