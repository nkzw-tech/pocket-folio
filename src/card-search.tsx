import type { TypeaheadDataSource } from '@nkzw/typeahead/core';
import { useMemo } from 'react';
import { languageName } from './binder-catalog';
import { cardAssetURL } from './card-assets';
import { CardImage } from './card-image';
import { CardDataSource, type SearchCard } from './card-search-data';
import { CardName } from './i18n/card-language';
import { useCardTextOptions } from './i18n/card-language-preference';
import { text } from './i18n/text';
import { SearchTypeahead } from './search-typeahead';

export function CardSearch<T extends SearchCard>({
  autoFocus = false,
  cards,
  dataSource,
  disabled = false,
  label,
  onChange,
  onSelect,
  placeholder,
  value,
}: {
  autoFocus?: boolean;
  cards: ReadonlyArray<T>;
  dataSource?: TypeaheadDataSource<T>;
  disabled?: boolean;
  label?: string;
  onChange: (value: string) => void;
  onSelect: (card: T) => void;
  placeholder?: string;
  value: string;
}) {
  const cardTextOptions = useCardTextOptions();
  const source = useMemo(
    () => dataSource ?? new CardDataSource(cards, 12, cardTextOptions),
    [cards, cardTextOptions, dataSource],
  );
  return (
    <SearchTypeahead
      autoFocus={autoFocus}
      blurOnSelect
      className="card-search"
      dataSource={source}
      disabled={disabled}
      emptyResult={text('No matching cards in the current catalog.')}
      inputProps={{ 'aria-label': label ?? text('Search cards by name or number') }}
      onSelect={({ data }) => {
        onSelect(data);
        return value;
      }}
      onValueChange={onChange}
      placeholder={placeholder ?? text('Search by name or number')}
      renderItem={({ data: card }) => (
        <>
          <CardImage alt="" crossOrigin="anonymous" loading="lazy" src={cardAssetURL(card.image)} />
          <span className="card-search-names">
            <CardName as="strong" card={card} />
            <CardName as="small" card={card} secondary />
            <small>
              {card.setName} · {languageName(card.language)}
              {card.slotIndex !== undefined ? ` · #${card.slotIndex + 1}` : ''}
            </small>
          </span>
          <span className="card-search-number">{card.number ?? text('Unnumbered')}</span>
        </>
      )}
      value={value}
    />
  );
}
