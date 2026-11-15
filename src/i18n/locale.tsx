import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import german from '@astryxdesign/core/locales/de-DE.generated.js';
import japanese from '@astryxdesign/core/locales/ja-JP.generated.js';
import { createLocaleContext, useLocaleContext } from 'fbtee';
import { startTransition, useEffect, type ReactNode } from 'react';
import { Select } from '../select';
import { text } from './text';
export const languages = new Map([
  ['en-US', 'English'],
  ['de-DE', 'Deutsch'],
  ['ja-JP', '日本語'],
]);
const Context = createLocaleContext({
  availableLanguages: languages,
  clientLocales: ['en-US'],
  fallbackLocale: 'en-US',
  loadLocale: async (locale) => {
    if (locale === 'de-DE') {
      return (await import('../translations/de-DE.json')).default['de-DE'];
    }
    if (locale === 'ja-JP') {
      return (await import('../translations/ja-JP.json')).default['ja-JP'];
    }
    return {};
  },
});
function Restore() {
  const { locale, setLocale } = useLocaleContext();
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pkmn:locale');
      if (saved && languages.has(saved) && saved !== locale) {
        startTransition(() => setLocale(saved));
      }
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
    document.documentElement.lang = locale;
  }, [locale, setLocale]);
  return null;
}
const controlMessages = { 'de-DE': german, 'ja-JP': japanese };
function ControlLocale({ children }: { children: ReactNode }) {
  const { locale } = useLocaleContext();
  return (
    <InternationalizationProvider locale={locale} messages={controlMessages}>
      {children}
    </InternationalizationProvider>
  );
}
export function Locale({ children }: { children: ReactNode }) {
  return (
    <Context>
      <Restore />
      <ControlLocale>{children}</ControlLocale>
    </Context>
  );
}
export function LanguagePicker() {
  const { locale, setLocale } = useLocaleContext();
  return (
    <Select
      label={text('Interface language')}
      name="interfaceLanguage"
      onChange={(e) => {
        const next = e;
        try {
          localStorage.setItem('pkmn:locale', next);
        } catch {
          /* Keep the session locale. */
        }
        startTransition(() => setLocale(next));
      }}
      value={locale}
    >
      {[...languages].map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </Select>
  );
}
