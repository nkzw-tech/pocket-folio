import { describe, expect, it } from 'vitest';
import { binderCollections } from '../src/binder-catalog';
import { cardRarityKey, groupRarities } from '../src/catalog-rarity';

describe('catalog rarity groups', () => {
  it('keeps shared rarity names scoped to each language and orders language groups', () => {
    const groups = groupRarities(binderCollections.flatMap(({ cards }) => cards));
    expect(groups.map(({ language }) => language)).toEqual(['en', 'ja', 'de']);
    for (const { language, rarities } of groups) {
      expect(rarities[0]).toEqual({ rarity: 'Common', value: `${language}:Common` });
      expect(new Set(rarities.map(({ value }) => value)).size).toBe(rarities.length);
    }
    const germanCommon = groups[2].rarities[0].value;
    const matches = binderCollections
      .flatMap(({ cards }) => cards)
      .filter((card) => cardRarityKey(card) === germanCommon);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(({ language, rarity }) => language === 'de' && rarity === 'Common')).toBe(
      true,
    );
  });
  it('only offers the selected set’s rarities and preserves Japanese tiers', () => {
    const cards = binderCollections.find(({ id }) => id === 'ja-sv2a')!.cards;
    const groups = groupRarities(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].rarities.map(({ rarity }) => rarity)).toEqual([
      'Common',
      'Uncommon',
      'Rare',
      'RR',
      'AR',
      'SR',
      'SAR',
      'UR',
    ]);
    expect(cards.filter((card) => cardRarityKey(card) === 'ja:SAR')).toHaveLength(8);
    expect(
      cards.filter((card) => cardRarityKey(card) === 'en:Special Illustration Rare'),
    ).toHaveLength(0);
  });
});
