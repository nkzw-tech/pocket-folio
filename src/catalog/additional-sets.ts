import type { BinderSet, CardFoil, Edition } from '../binder-catalog';
import { pPromos } from './p-promos';
import packs from './packs.json';

type Pack = Omit<BinderSet, 'cards'> & {
  cards: Array<
    [
      string,
      string,
      string,
      string | null,
      Array<Edition>,
      CardFoil | null,
      Array<string>,
      string | null,
      string | null,
      string,
    ]
  >;
};
// Compact search metadata is eager; detailed rules and scans load only when used.
// Generated IDs are permanent and independent of ordering or source display names.
const generatedSets: Array<BinderSet> = (packs as Array<Pack>).map((pack) => ({
  ...pack,
  cards: pack.cards.map(
    ([
      number,
      localName,
      english,
      printed,
      editions,
      foil,
      finishes,
      image,
      imageLanguage,
      rarity,
    ]) => ({
      defaultEdition: editions[0],
      detailsPath: `/card-details/${pack.id}.json`,
      editions,
      english,
      finishes,
      foil: foil ?? undefined,
      id: `${pack.id}-${number}`,
      image: image ?? `/cards/catalog/${pack.id}-${number}.webp`,
      imageLanguage: imageLanguage ?? undefined,
      language: pack.language,
      localName,
      number: printed,
      rarity,
    }),
  ),
}));

export const additionalSets = [...generatedSets, pPromos];
