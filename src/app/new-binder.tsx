import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { useState } from 'react';
import { binderCollections } from '../binder-catalog';
import { text } from '../i18n/text';
import { Select } from '../select';
import { SetSearch } from '../set-search';
import { TextField, Checkbox } from '../ui/fields';
import { FormStack } from '../ui/form-stack';
import { BinderColorPicker } from './binder-color-picker';
import { Dialog } from './dialog';
import {
  binderColorSchema,
  binderLayouts,
  makeBinder,
  pocketOpeningSchema,
  type CollectionDocument,
  type Command,
} from './model';
import { PocketOpeningPicker } from './pocket-opening-picker';

export function NewBinderDialog({
  close,
  dispatch,
  ownership,
  presetId = '',
}: {
  close: () => void;
  dispatch: (command: Command) => Promise<void>;
  ownership: CollectionDocument['ownership'];
  presetId?: string;
}) {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState(presetId);
  const [setCover, setSetCover] = useState(false);
  const [doubleSided, setDoubleSided] = useState<boolean>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = binderCollections.find((set) => set.id === preset);
  return (
    <Dialog close={close} title={text('New binder')}>
      <FormStack
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving) {
            return;
          }
          const form = new FormData(event.currentTarget);
          const [columns, rows] = String(form.get('layout')).split('x').map(Number);
          setSaving(true);
          setError('');
          try {
            const binder = makeBinder(
              name.trim() || set?.label || text('My pretty binder'),
              preset,
              ownership,
              {
                color: binderColorSchema.parse(form.get('color')),
                columns,
                coverSetId: setCover && set ? set.id : null,
                doubleSided: form.has('doubleSided'),
                pocketOpening: pocketOpeningSchema.parse(form.get('pocketOpening')),
                rows,
              },
            );
            await dispatch({ binder, type: 'binder.create' });
            location.assign(`/binders/${binder.id}`);
          } catch (error_) {
            setError(String(error_));
            setSaving(false);
          }
        }}
      >
        <TextField
          hasAutoFocus
          label={text('Name')}
          maxLength={80}
          onChange={(value) => setName(value)}
          placeholder={set?.label ?? text('My pretty binder')}
          value={name}
        />
        <Stack className="preset-picker" gap={3}>
          <span>{text('Start with')}</span>
          <SetSearch emptyLabel={text('Empty pages')} onSelect={setPreset} value={preset} />
        </Stack>
        {set && (
          <Checkbox
            label={text('Use set artwork for cover')}
            onChange={(value) => setSetCover(value)}
            value={setCover}
          />
        )}

        <Select defaultValue="3x3" label={text('Page layout')} name="layout">
          {binderLayouts.map(([columns, rows]) => (
            <option key={`${columns}x${rows}`} value={`${columns}x${rows}`}>
              {columns} × {rows} · {columns * rows} {text('pockets')}
            </option>
          ))}
        </Select>

        <BinderColorPicker />
        <PocketOpeningPicker />
        <Checkbox
          htmlName="doubleSided"
          label={text('Cards on both sides')}
          onChange={(value) => setDoubleSided(value)}
          value={doubleSided ?? set?.doubleSided ?? false}
        />
        <Button
          className="primary-button"
          isDisabled={saving}
          label={saving ? text('Creating…') : text('Create binder')}
          type="submit"
          variant="primary"
        >
          {saving ? text('Creating…') : text('Create binder')}
        </Button>
        {error && <p role="alert">{error}</p>}
      </FormStack>
    </Dialog>
  );
}
