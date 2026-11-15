import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Link, useShared } from '@void/react';
import { lazy } from 'react';
import type { Props } from './index.server';
const Library = lazy(async () => ({ default: (await import('../src/app/library')).Library }));
import type { Shared } from '../src/app/workspace';
import { HomeCards } from '../src/home-cards';
import { text } from '../src/i18n/text';
export default function Home({ cards }: Props) {
  const { user } = useShared<Shared>();
  return user ? (
    <Library />
  ) : (
    <main className="shell welcome">
      <div className="welcome-copy">
        <h1>{text('Your card binder')}</h1>
        <p>{text('Organize your cards and share your binders.')}</p>
        <Stack
          align="center"
          className="welcome-actions"
          direction="horizontal"
          gap={4}
          wrap="wrap"
        >
          <Button as={Link} href="/login" label={text('Open your binder')} variant="primary" />
          <Button as={Link} href="/cards" label={text('Browse the cards')} variant="ghost" />
        </Stack>
      </div>
      <HomeCards ids={cards} />
    </main>
  );
}
