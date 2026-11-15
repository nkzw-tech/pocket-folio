import { describe, expect, it } from 'vitest';
import { defaultPrinting, validPrinting } from '../src/app/model';
import { binderCollections } from '../src/binder-catalog';
describe('catalog integrity', () => {
  it('has globally stable IDs, valid locales and explicit printings for every card', () => {
    const sets = new Set<string>(),
      cards = new Set<string>();
    for (const set of binderCollections) {
      expect(sets.has(set.id)).toBe(false);
      sets.add(set.id);
      expect(Intl.getCanonicalLocales(set.language)).toHaveLength(1);
      expect(set.cards.length).toBeGreaterThan(0);
      for (const card of set.cards) {
        expect(cards.has(card.id)).toBe(false);
        cards.add(card.id);
        expect(card.id).not.toContain(':');
        expect(card.language).toBe(set.language);
        expect(card.editions).toContain(card.defaultEdition);
        expect(validPrinting(defaultPrinting(card))).toBe(true);
        expect(card.english.length).toBeGreaterThan(0);
        expect(card.localName.length).toBeGreaterThan(0);
        expect(card.image).toMatch(/^\/cards\//);
      }
    }
  });
});
