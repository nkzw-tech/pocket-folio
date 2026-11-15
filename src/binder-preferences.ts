import { useSyncExternalStore } from 'react';

const key = 'pkmn:show-missing-artwork';
const listeners = new Set<() => void>();
let fallback: boolean | undefined;
function snapshot() {
  if (fallback !== undefined) {
    return fallback;
  }
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return true;
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
function setShowMissingArtwork(value: boolean) {
  try {
    localStorage.setItem(key, String(value));
    fallback = undefined;
  } catch {
    // Keep the preference for this session when storage is unavailable.
    fallback = value;
  }
  for (const listener of listeners) {
    listener();
  }
}
export function useMissingArtwork() {
  return [useSyncExternalStore(subscribe, snapshot, () => true), setShowMissingArtwork] as const;
}
