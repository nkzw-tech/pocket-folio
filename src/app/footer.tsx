import { Stack } from '@astryxdesign/core/Stack';
import { Link } from '@void/react';
import { text } from '../i18n/text';

export function Footer() {
  return (
    <footer className="app-footer">
      <Stack
        align="center"
        className="shell"
        direction="horizontal"
        gap={4}
        justify="end"
        wrap="wrap"
      >
        <Stack direction="horizontal" gap={4}>
          <Link href="/privacy">{text('Privacy')}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/attribution">{text('Fan project & credits')}</Link>
        </Stack>
      </Stack>
    </footer>
  );
}
