import { useRouter } from '@void/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BinderCard } from './binder-catalog';

export const cardHref = (id: string) => `/cards/${encodeURIComponent(id)}`;

export function replaceParams(values: Record<string, string>) {
  if (history.state?.folioPreview && location.pathname.startsWith('/cards/')) {
    return;
  }
  const url = new URL(location.href);
  for (const [name, value] of Object.entries(values)) {
    if (value) {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
  }
  if (url.href !== location.href) {
    history.replaceState(history.state, '', url);
  }
}

export function useShareParam(name: string, fallback = '', accepts?: (value: string) => boolean) {
  const router = useRouter();
  const [value, setValue] = useState(() => {
    const initial = router.url.searchParams.get(name);
    return initial && (!accepts || accepts(initial)) ? initial : fallback;
  });
  const update = useCallback(
    (next: string) => {
      replaceParams({ [name]: next === fallback ? '' : next });
      setValue(next);
    },
    [name, fallback],
  );
  return [value, update] as const;
}

export function useCardPreview() {
  const [preview, setPreview] = useState<BinderCard>();
  const entry = useRef<{ card: BinderCard; key: string; open: boolean } | null>(null);
  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      const current = entry.current;
      if (!current) {
        return;
      }
      if (
        event.state?.folioPreview === current.key &&
        location.pathname === cardHref(current.card.id)
      ) {
        current.open = true;
        setPreview(current.card);
      } else if (current.open && event.state?.folioPreviewOrigin === current.key) {
        current.open = false;
        setPreview(undefined);
      } else {
        return;
      }
      event.stopImmediatePropagation();
    };
    window.addEventListener('popstate', pop, true);
    return () => window.removeEventListener('popstate', pop, true);
  }, []);
  const select = useCallback((card?: BinderCard) => {
    if (card) {
      const key = crypto.randomUUID();
      entry.current = { card, key, open: true };
      history.replaceState({ ...history.state, folioPreviewOrigin: key }, '');
      history.pushState({ ...history.state, folioPreview: key }, '', cardHref(card.id));
      setPreview(card);
    } else if (entry.current?.open && history.state?.folioPreview === entry.current.key) {
      history.back();
    }
  }, []);
  return [preview, select] as const;
}
