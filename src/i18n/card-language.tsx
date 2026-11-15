import { useEffect, useState } from 'react';
import { cardNameEntries, type CardTextOptions } from '../card-text';
import { Select } from '../select';
import { setMode, valid, useCardTextOptions } from './card-language-preference';
import { text } from './text';

export function CardLanguagePicker() {
  const { mode } = useCardTextOptions();
  return (
    <Select
      label={text('Card text')}
      name="cardTextLanguage"
      onChange={(event) => setMode(valid(event))}
      value={mode}
    >
      <option value="both">{text('Original + interface language')}</option>
      <option value="original">{text('Original only')}</option>
      <option value="interface">{text('Interface language only')}</option>
    </Select>
  );
}
export function useCardNames() {
  const options = useCardTextOptions();
  return (card: Parameters<typeof cardNameEntries>[0]) => cardNameEntries(card, options);
}
export function CardName({
  as: Tag = 'span',
  card,
  secondary = false,
}: {
  as?: 'h3' | 'strong' | 'span' | 'p' | 'small';
  card: Parameters<typeof cardNameEntries>[0];
  secondary?: boolean;
}) {
  const names = useCardNames()(card);
  return (secondary ? names.slice(1) : names.slice(0, 1)).map((entry) => (
    <Tag key={entry.language} lang={entry.language}>
      {entry.text}
    </Tag>
  ));
}

const dictionaries = new Map<string, Promise<Record<string, string>>>();
export function useCardTranslations(original: string): CardTextOptions {
  const options = useCardTextOptions();
  const language =
    options.mode !== 'original' &&
    options.interfaceLanguage !== original &&
    options.interfaceLanguage !== 'en'
      ? options.interfaceLanguage
      : undefined;
  const [loaded, setLoaded] = useState<{ dictionary: Record<string, string>; language: string }>();
  useEffect(() => {
    if (!language) {
      return;
    }
    let active = true;
    let request = dictionaries.get(language);
    if (!request) {
      request = fetch(`/card-translations/${language}.json`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Card translations unavailable');
          }
          return response.json() as Promise<Record<string, string>>;
        })
        .catch((error) => {
          dictionaries.delete(language);
          throw error;
        });
      dictionaries.set(language, request);
    }
    void request
      .then((dictionary) => {
        if (active) {
          setLoaded({ dictionary, language });
        }
      })
      .catch(() => {
        /* English remains available offline. */
      });
    return () => {
      active = false;
    };
  }, [language]);
  return { ...options, dictionary: loaded?.language === language ? loaded?.dictionary : undefined };
}
