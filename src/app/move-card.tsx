import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { useId, useState } from 'react';
import { text } from '../i18n/text';
import { TextField } from '../ui/fields';
import type { PersonalBinder } from './model';

export function MoveCard({
  from,
  move,
  slots,
}: {
  from: number;
  move: (to: number) => Promise<void>;
  slots: PersonalBinder['slots'];
}) {
  const inputId = useId();
  const [pocket, setPocket] = useState(String(from + 1));
  const [pending, setPending] = useState(false);
  const to = Number(pocket) - 1;
  const valid = /^\d+$/.test(pocket) && to >= 0 && to < 2000 && to !== from;
  const action = valid && slots[to] ? text('Swap') : text('Move');

  return (
    <form
      className="move-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pending) {
          return;
        }
        setPending(true);
        void move(to)
          .catch(() => {})
          .finally(() => setPending(false));
      }}
    >
      <Stack align="center" direction="horizontal" gap={2}>
        <label htmlFor={inputId}>{text('Move to pocket')}</label>
        <TextField
          autoComplete="off"
          id={inputId}
          inputMode="numeric"
          isDisabled={pending}
          isLabelHidden
          label={text('Move to pocket')}
          maxLength={4}
          onChange={setPocket}
          size="sm"
          value={pocket}
          width={56}
        />
        <Button isDisabled={!valid || pending} label={action} size="sm" type="submit" />
      </Stack>
    </form>
  );
}
