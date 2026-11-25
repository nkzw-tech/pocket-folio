/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import images from '../assets/card-images.json';
import { binderCollections } from '../src/binder-catalog';
import type { CardDetails } from '../src/catalog/details';
import sources from '../src/catalog/sources.json';

describe('expanded catalog packs', () => {
  it('includes launch collector sets, complete galleries and secret rares in both languages', () => {
    const expected = new Map([
      ['en-sv8pt5', 180],
      ['ja-sv8a', 237],
      ['en-swsh7', 237],
      ['ja-swsh6a', 101],
      ['en-zsv10pt5', 172],
      ['en-rsv10pt5', 173],
      ['ja-sv11b', 174],
      ['ja-sv11w', 174],
      ['en-swsh9tg', 30],
      ['en-swsh10tg', 30],
      ['en-swsh11tg', 30],
      ['en-swsh12tg', 30],
      ['en-sma', 94],
      ['ja-sm12a', 226],
      ['ja-base1', 102],
      ['ja-base2', 48],
      ['ja-base3', 48],
      ['ja-base4', 65],
      ['ja-m6a', 176],
      ['ja-mp', 133],
    ]);
    for (const [id, count] of expected) {
      expect(binderCollections.find((set) => set.id === id)?.cards, id).toHaveLength(count);
    }
    const prismatic = binderCollections.find((set) => set.id === 'en-sv8pt5')!;
    expect(prismatic.cards.at(-1)?.number).toBe('180/131');
    const gallery = binderCollections.find((set) => set.id === 'en-swsh9tg')!;
    expect(gallery.cards.at(-1)?.number).toBe('TG30/TG30');
    expect(gallery.cards.every((card) => card.foil === 'fullart')).toBe(true);
  });
  it('preserves no-cost translations and both printed attacks on the Japanese Pikachu promo', () => {
    const festival = JSON.parse(readFileSync('public/card-details/ja-sv8a.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(festival['ja-sv8a-1'].attacks?.[0].en.name).toBe('Itchy Pollen');
    expect(festival['ja-sv8a-1'].attacks?.[0].cost).toEqual([]);
    const promos = JSON.parse(readFileSync('public/card-details/ja-smp.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(promos['ja-smp-407'].attacks).toHaveLength(2);
    expect(promos['ja-smp-407'].attacks?.[1].damage).toBe('60');
    expect(promos['ja-smp-407'].attacks?.[1].cost).toEqual(['colorless', 'colorless', 'colorless']);
    const base = JSON.parse(readFileSync('public/card-details/ja-base1.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(base['ja-base1-102'].kind).toBe('basicEnergy');
    expect(base['ja-base1-49'].powers?.[0].en.name).toBe('Damage Swap');
    const clay = JSON.parse(readFileSync('public/card-details/ja-sv2d.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(clay['ja-sv2d-48'].pokemon?.hp).toBe(180);
    expect(clay['ja-sv2d-18'].pokemon?.hp).toBe(140);
    // The Japanese promo really does differ from the English printing.
    expect(promos['ja-smp-302'].pokemon?.hp).toBe(90);
    const megaPromos = JSON.parse(readFileSync('public/card-details/ja-mp.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(megaPromos['ja-mp-56'].attacks?.map((attack) => attack.en.name)).toEqual([
      'Burrow',
      'Rototiller',
    ]);
    expect(megaPromos['ja-mp-56'].powers).toHaveLength(1);
  });
  it('ships every reviewed roster, its scan manifest and independently loaded rules', () => {
    for (const source of sources.sets) {
      const set = binderCollections.find(({ id }) => id === source.id)!;
      expect(set.cards).toHaveLength(source.cards);
      const details = JSON.parse(
        readFileSync(`public/card-details/${set.id}.json`, 'utf8'),
      ) as Record<string, CardDetails>;
      expect(Object.keys(details)).toHaveLength(set.cards.length);
      for (const card of set.cards) {
        expect(Object.hasOwn(images, card.image.slice(1)), card.id).toBe(true);
        expect(card.details).toBeUndefined();
        expect(details[card.id], card.id).toBeDefined();
        if (details[card.id].pokemon) {
          expect(
            (details[card.id].attacks?.length ?? 0) + (details[card.id].powers?.length ?? 0),
            card.id,
          ).toBeGreaterThan(0);
        }
        for (const attack of details[card.id].attacks ?? []) {
          expect(attack.en.name, card.id).not.toBe('');
        }
        if (card.imageLanguage && card.imageLanguage !== card.language) {
          expect(card.imageLanguage).toBe('en');
          expect(card.image).toContain('/en-');
        }
      }
    }
  });
  it('keeps classic reprint numbers and unnumbered Japanese cards distinct', () => {
    const classic = binderCollections.find(({ id }) => id === 'en-me55c')!;
    expect(classic.cards).toHaveLength(30);
    expect(classic.cards.filter((card) => card.number?.startsWith('106/'))).toHaveLength(3);
    expect(new Set(classic.cards.map(({ id }) => id)).size).toBe(30);
    const neo = binderCollections.find(({ id }) => id === 'ja-neo2')!;
    expect(neo.cards.filter(({ number }) => number === null).length).toBeGreaterThan(1);
    expect(new Set(neo.cards.map(({ id }) => id)).size).toBe(neo.cards.length);
  });
  it('uses verified stats for alternate art and does not classify Fossil trainers as Pokémon', () => {
    const mega = JSON.parse(readFileSync('public/card-details/ja-m3.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(mega['ja-m3-97'].pokemon?.hp).toBe(310);
    expect(mega['ja-m3-97'].attacks?.[1].cost).toHaveLength(5);
    expect(mega['ja-m3-98'].attacks?.[1].local.name).toBe('ダークストライク');
    const neo = JSON.parse(readFileSync('public/card-details/ja-neo4.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(neo['ja-neo4-50'].pokemon?.hp).toBe(50);
    const fossil = JSON.parse(readFileSync('public/card-details/ja-m5.json', 'utf8')) as Record<
      string,
      CardDetails
    >;
    expect(fossil['ja-m5-72'].kind).toBe('trainer');
  });
  it('includes all released Mega packs in both languages without inventing first editions', () => {
    for (const id of [
      'en-me1',
      'en-me2',
      'en-me2pt5',
      'en-me3',
      'en-me4',
      'en-me5',
      'en-me6',
      'en-me55',
      'en-me55c',
      'ja-m1l',
      'ja-m1s',
      'ja-m2',
      'ja-m2a',
      'ja-m3',
      'ja-m4',
      'ja-m5',
      'ja-m6',
      'ja-m7',
    ]) {
      const set = binderCollections.find((set) => set.id === id)!;
      expect(set.cards.length).toBeGreaterThan(0);
      expect(set.cards.every(({ editions }) => !editions.includes('first'))).toBe(true);
    }
  });
});
