import { useLocaleContext } from 'fbtee';
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { CardTextMode, CardTextOptions } from '../card-text';

const key = 'pkmn:card-text-language';
const listeners = new Set<() => void>();
let fallback: CardTextMode | undefined;
export const valid = (value: string | null): CardTextMode =>
  value === 'original' || value === 'interface' ? value : 'both';
function snapshot() {
  if (fallback) {
    return fallback;
  }
  try {
    return valid(localStorage.getItem(key));
  } catch {
    return 'both';
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const changed = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      listener();
    }
  };
  window.addEventListener('storage', changed);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', changed);
  };
}
export function setMode(mode: CardTextMode) {
  try {
    localStorage.setItem(key, mode);
    fallback = undefined;
  } catch {
    fallback = mode;
  }
  for (const listener of listeners) {
    listener();
  }
}
const Context = createContext<CardTextOptions>({ interfaceLanguage: 'en', mode: 'both' });
export function CardLanguageProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocaleContext();
  const mode = useSyncExternalStore<CardTextMode>(subscribe, snapshot, () => 'both');
  const options = useMemo(
    () => ({ interfaceLanguage: locale.split('-')[0], mode }),
    [locale, mode],
  );
  return <Context value={options}>{children}</Context>;
}
export function useCardTextOptions() {
  return useContext(Context);
}
