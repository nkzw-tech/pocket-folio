import { cardSearchEntries, CardDataSource, type SearchCard } from './card-search-data';
import type { CardTextOptions } from './card-text';

function createSources<T extends SearchCard>(cards: ReadonlyArray<T>, options: CardTextOptions) {
  const all = new CardDataSource<T>([], cards.length);
  const suggestions = new CardDataSource<T>([], 12);
  let preparing: Promise<void> | undefined;
  return {
    all,
    prepare: () =>
      (preparing ??= (async () => {
        for (let start = 0; start < cards.length; start += 256) {
          // Give the dialog, input and close button a paint/event opportunity
          // between batches. Tokenize each card once for both result lists.
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          const entries = cardSearchEntries(cards.slice(start, start + 256), options);
          all.addEntries(entries);
          suggestions.addEntries(entries);
        }
      })()),
    suggestions,
  };
}

const cache = new WeakMap<
  ReadonlyArray<SearchCard>,
  Map<string, ReturnType<typeof createSources>>
>();

export function pickerSearchData<T extends SearchCard>(
  cards: ReadonlyArray<T>,
  options: CardTextOptions,
) {
  let sources = cache.get(cards);
  if (!sources) {
    sources = new Map();
    cache.set(cards, sources);
  }
  const key = `${options.interfaceLanguage}:${options.mode}`;
  let source = sources.get(key);
  if (!source) {
    source = createSources(cards, options);
    sources.set(key, source);
  }
  return source as ReturnType<typeof createSources<T>>;
}
