import { Button } from '@astryxdesign/core/Button';
import { TypeaheadDataSource, TypeaheadDataSourceEntry } from '@nkzw/typeahead/core';
import { useMemo, useState } from 'react';
import { binderCollections, languageName, type BinderSet } from './binder-catalog';
import { sortSets } from './catalog-navigation';
import { text } from './i18n/text';
import { SearchTypeahead } from './search-typeahead';

export function setDataSource(sets: ReadonlyArray<BinderSet>) {
  const source = new TypeaheadDataSource<BinderSet>(null, sets.length);
  source.addEntries(
    sortSets(sets).map(
      (set) =>
        new TypeaheadDataSourceEntry(set.label, set.id, set, [
          set.englishLabel ?? '',
          languageName(set.language),
          set.era ?? '',
          String(set.releaseYear),
        ]),
    ),
  );
  return source;
}

export function SetSearch({
  emptyLabel = text('All sets'),
  onSearch,
  onSelect,
  search,
  sets = binderCollections,
  value,
}: {
  emptyLabel?: string;
  onSearch?: (value: string) => void;
  onSelect: (id: string) => void;
  search?: string;
  sets?: ReadonlyArray<BinderSet>;
  value: string;
}) {
  const [query, setQuery] = useState('');
  const source = useMemo(() => setDataSource(sets), [sets]);
  const change = onSearch ?? setQuery;
  const selected = binderCollections.find((set) => set.id === value);
  return (
    <div className="set-search-control">
      <SearchTypeahead
        blurOnSelect
        className="card-search set-search"
        dataSource={source}
        inputProps={{ 'aria-label': text('Find a set') }}
        onSelect={({ data }) => {
          onSelect(data.id);
          if (search !== undefined) {
            return search;
          }
          change('');
          return '';
        }}
        onValueChange={change}
        placeholder={
          selected ? `${selected.label} · ${languageName(selected.language)}` : emptyLabel
        }
        renderItem={({ data }) => (
          <span className="card-search-names">
            <strong>{data.label}</strong>
            <small>
              {languageName(data.language)} · {data.releaseYear} · {data.cards.length}
            </small>
          </span>
        )}
        value={search ?? query}
      />
      {value && (
        <Button
          className="text-button"
          label={emptyLabel}
          onClick={() => onSelect('')}
          size="sm"
          type="button"
          variant="ghost"
        >
          {emptyLabel}
        </Button>
      )}
    </div>
  );
}
