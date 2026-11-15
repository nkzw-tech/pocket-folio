import { text } from '../i18n/text';
import { Select } from '../select';
import type { PersonalBinder } from './model';

export function PocketOpeningPicker({
  value = 'top',
}: {
  value?: PersonalBinder['pocketOpening'];
}) {
  return (
    <Select defaultValue={value} label={text('Pocket opening')} name="pocketOpening">
      <option value="top">{text('Top-loading')}</option>
      <option value="side">{text('Side-loading')}</option>
      <option value="none">{text('None')}</option>
    </Select>
  );
}
