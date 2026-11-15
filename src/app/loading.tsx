import { text } from '../i18n/text';

export function Loading() {
  return (
    <p className="startup" role="status">
      {text('Thinking…')}
    </p>
  );
}
