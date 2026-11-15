import { TypeaheadDataSource, TypeaheadDataSourceEntry } from '@nkzw/typeahead/core';
import type { BinderCard } from './binder-catalog';
import { cardNameEntries, type CardTextOptions } from './card-text';

export type SearchCard = BinderCard & { setName?: string };

export function cardSearchEntries<T extends SearchCard>(
  cards: ReadonlyArray<T>,
  options?: CardTextOptions,
) {
  return cards.map(
    (card) =>
      new TypeaheadDataSourceEntry(
        card.localName,
        `${card.printingId ?? card.id}:${card.slotIndex ?? ''}`,
        card,
        [
          card.english,
          card.number ?? '',
          card.setName ?? '',
          ...(options ? cardNameEntries(card, options).map(({ text }) => text) : []),
          ...(card.language === 'ja' ? [card.localName.split('の').at(-1)!] : []),
        ],
      ),
  );
}

export class CardDataSource<T extends SearchCard> extends TypeaheadDataSource<T> {
  private readonly cards = new Map<string, TypeaheadDataSourceEntry<T>>();
  private readonly limit: number;

  constructor(cards: ReadonlyArray<T>, limit = cards.length, options?: CardTextOptions) {
    super(null, limit);
    this.limit = limit;
    this.addEntries(cardSearchEntries(cards, options));
  }

  override addEntries(entries: ReadonlyArray<TypeaheadDataSourceEntry<T>>) {
    for (const entry of entries) {
      this.cards.set(entry.value, entry);
    }
    super.addEntries(entries);
  }

  override getQueryResults(query: string) {
    // Set numbers are exact identifiers: #1 must not also match 10 or 100.
    const number = /^#?(\d+)(?:\/(\d+))?$/.exec(query.trim());
    return number
      ? [...this.cards.values()]
          .filter(({ data: card }) => {
            const [printed, total] = card.number?.split('/') ?? [];
            return (
              Number(printed) === Number(number[1]) &&
              (!number[2] || Number(total) === Number(number[2]))
            );
          })
          .slice(0, this.limit)
      : super.getQueryResults(query);
  }
}

// Filter and limit an existing index without tokenizing or indexing cards again.
export class CardDataSourceView<T extends SearchCard> extends TypeaheadDataSource<T> {
  override readonly subscribe;
  override readonly getSnapshot;

  constructor(
    private readonly source: CardDataSource<T>,
    private readonly accepts: ((card: T) => boolean) | undefined,
    private readonly limit: number,
  ) {
    super(null, limit);
    this.subscribe = source.subscribe;
    this.getSnapshot = source.getSnapshot;
  }

  override getQueryResults(query: string) {
    const results = this.source.getQueryResults(query);
    const { accepts } = this;
    return (accepts ? results.filter(({ data }) => accepts(data)) : results).slice(0, this.limit);
  }
}
