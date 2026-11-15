import { describe, expect, it } from 'vitest';
import { catalog } from '../src/app/model';
import { CardDataSource, CardDataSourceView } from '../src/card-search-data';
import { pickerSearchData } from '../src/picker-search-data';

describe('card search integration', () => {
  it('filters shared search results before limiting suggestions, without changing the index', () => {
    const cards = catalog.filter((card) => card.number?.split('/')[0] === '1');
    const source = new CardDataSource(cards);
    const matching = new Set(cards.slice(15, 30));
    const view = new CardDataSourceView(source, (card) => matching.has(card), 12);
    const snapshot = source.getSnapshot();
    expect(view.getQueryResults('#1').map(({ data }) => data)).toEqual(cards.slice(15, 27));
    expect(new CardDataSourceView(source, undefined, 12).getQueryResults('#1')).toEqual(
      source.getQueryResults('#1').slice(0, 12),
    );
    expect(source.getSnapshot()).toBe(snapshot);
    expect(view.subscribe).toBe(source.subscribe);
    expect(view.getSnapshot).toBe(source.getSnapshot);
  });
  it('updates both picker result lists as later batches arrive and reuses the completed index', async () => {
    const cards = catalog.slice(0, 700);
    const options = { interfaceLanguage: 'de', mode: 'both' as const };
    const source = pickerSearchData(cards, options);
    const expected = new CardDataSource(cards, undefined, options);
    const observed: Array<number> = [];
    const unsubscribe = source.all.subscribe(() =>
      observed.push(source.all.getQueryResults('#1').length),
    );
    expect(source.all.getQueryResults('#1')).toEqual([]);
    const ready = source.prepare();
    expect(source.prepare()).toBe(ready);
    await ready;
    for (const query of ['#1', '001/141', 'Simsala', 'Charizard', 'ブラッキー']) {
      expect(source.all.getQueryResults(query)).toEqual(expected.getQueryResults(query));
      expect(source.suggestions.getQueryResults(query)).toEqual(
        expected.getQueryResults(query).slice(0, 12),
      );
    }
    expect(observed.length).toBeGreaterThan(1);
    expect(pickerSearchData(cards, { ...options })).toBe(source);
    expect(pickerSearchData(cards, { ...options, mode: 'original' })).not.toBe(source);
    expect(pickerSearchData(cards.slice(0, 10), options)).not.toBe(source);
    unsubscribe();
  });
  it('finds translated display names without losing original and English aliases', () => {
    const card = catalog.find(({ id }) => id === 'en-base1-4')!;
    const source = new CardDataSource([card], 12, { interfaceLanguage: 'de', mode: 'interface' });
    expect(source.getQueryResults('Glurak').map(({ data }) => data.id)).toEqual([card.id]);
    expect(source.getQueryResults('Charizard').map(({ data }) => data.id)).toEqual([card.id]);
  });
  it('treats card numbers as exact IDs, including hashes and leading zeros', () => {
    const source = new CardDataSource(catalog);
    expect(source.getQueryResults('#001/141').map(({ data }) => data.id)).toEqual(['1']);
    expect(source.getQueryResults('1').length).toBe(
      catalog.filter((card) => Number(card.number?.split('/')[0]) === 1).length,
    );
    expect(
      source.getQueryResults('1').every(({ data }) => Number(data.number?.split('/')[0]) === 1),
    ).toBe(true);
  });
  it('finds local, English, and Japanese species names without erasing dakuten', () => {
    const source = new CardDataSource(catalog);
    expect(source.getQueryResults('Simsala').map(({ data }) => data.id)).toContain('base1-1');
    expect(source.getQueryResults('Alakazam').map(({ data }) => data.id)).toContain('base1-1');
    expect(source.getQueryResults('ブラッキー').map(({ data }) => data.id)).toContain('91');
    expect(source.getQueryResults('フラッキー').map(({ data }) => data.id)).not.toContain('91');
  });
  it('keeps repeated placements independently selectable and limits only suggestions', () => {
    const card = catalog.find(({ id }) => id === 'base1-1')!;
    const cards = [0, 20].map((slotIndex) => ({ ...card, printingId: 'base1-1:first', slotIndex }));
    const results = new CardDataSource(cards).getQueryResults('Simsala');
    expect(results.map(({ data }) => data.slotIndex)).toEqual([0, 20]);
    expect(new Set(results.map(({ value }) => value)).size).toBe(2);
    expect(new CardDataSource(cards, 1).getQueryResults('#1')).toHaveLength(1);
  });
});
