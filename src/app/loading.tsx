import { text } from '../i18n/text';

export function Loading({
  children = text('Thinking…'),
  className = 'startup',
}: {
  children?: string;
  className?: string;
}) {
  return (
    <p className={`loading-text ${className}`} role="status">
      {children}
    </p>
  );
}
