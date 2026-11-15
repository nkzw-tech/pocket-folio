import { useSyncExternalStore } from 'react';
import { BinderView } from '../../../src/app/binder-editor';
import { Loading } from '../../../src/app/loading';
import { text } from '../../../src/i18n/text';
import type { Props } from './[binderId].server';

const subscribe = () => () => {};
export default function ProfileBinder({ document }: Props) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return document ? (
    mounted ? (
      <BinderView binder={document.binders[0]} ownership={document.ownership} />
    ) : (
      <Loading />
    )
  ) : (
    <main className="shell empty">
      <h1>{text('Binder unavailable')}</h1>
    </main>
  );
}
