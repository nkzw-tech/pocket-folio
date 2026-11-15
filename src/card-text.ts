import { binderCollections } from './binder-catalog';
import type { Translation } from './catalog/details';

export type CardTextMode = 'both' | 'original' | 'interface';
export type TextEntry = { language: string; text: string };
export type CardTextOptions = {
  dictionary?: Record<string, string>;
  interfaceLanguage: string;
  mode: CardTextMode;
};
export function cardTextLanguages(original: string, options: CardTextOptions) {
  return [
    ...new Set(
      options.mode === 'original'
        ? [original]
        : options.mode === 'interface'
          ? [options.interfaceLanguage]
          : [original, options.interfaceLanguage],
    ),
  ];
}
export function cardTextEntries(
  value: Translation,
  original: string,
  options: CardTextOptions,
): Array<TextEntry> {
  const entries = cardTextLanguages(original, options).map((language) => {
    if (language === original && value.local) {
      return { language, text: value.local };
    }
    if (language !== 'en' && options.dictionary?.[value.en]) {
      return { language, text: options.dictionary[value.en] };
    }
    return value.en
      ? { language: 'en', text: value.en }
      : { language: original, text: value.local };
  });
  return entries.filter(
    ({ text }, index) => text && !entries.slice(0, index).some((entry) => entry.text === text),
  );
}

const names = new Map<string, Map<string, Set<string>>>();
for (const set of binderCollections) {
  const translations = names.get(set.language) ?? new Map<string, Set<string>>();
  for (const card of set.cards) {
    const values = translations.get(card.english) ?? new Set<string>();
    values.add(card.localName);
    translations.set(card.english, values);
  }
  names.set(set.language, translations);
}
export function cardNameEntries(
  card: { english: string; language: string; localName: string },
  options: CardTextOptions,
) {
  const values = names.get(options.interfaceLanguage)?.get(card.english);
  const translation = values?.size === 1 ? [...values][0] : undefined;
  return cardTextEntries({ en: card.english, local: card.localName }, card.language, {
    ...options,
    dictionary: translation ? { [card.english]: translation } : undefined,
  });
}
