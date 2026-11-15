import type { BinderCard } from './binder-catalog';
import { catalogLanguages } from './catalog-navigation';
import { text } from './i18n/text';

const rarityNames: Record<string, string> = {
  AR: 'Art Rare',
  CHR: 'Character Rare',
  CSR: 'Character Super Rare',
  HR: 'Hyper Rare',
  MAR: 'Mega Attack Rare',
  MUR: 'Mega Ultra Rare',
  RR: 'Double Rare',
  RRR: 'Triple Rare',
  S: 'Shiny Rare',
  SAR: 'Special Art Rare',
  SR: 'Super Rare',
  SSR: 'Shiny Super Rare',
  UR: 'Ultra Rare',
};
const rarityOrder = [
  'Common',
  'Uncommon',
  'Rare',
  'Holo Rare',
  'RR',
  'Double Rare',
  'RRR',
  'AR',
  'Illustration Rare',
  'CHR',
  'SR',
  'Ultra Rare',
  'SAR',
  'Special Illustration Rare',
  'CSR',
  'HR',
  'Hyper Rare',
  'UR',
  'S',
  'Shiny Rare',
  'SSR',
  'Shiny Ultra Rare',
  'MAR',
  'Mega Attack Rare',
  'MUR',
  'Mega Hyper Rare',
  'Promo',
  'Unspecified',
];
const rank = (rarity: string) => {
  const index = rarityOrder.indexOf(rarity);
  return index < 0 ? rarityOrder.length - 2 : index;
};
export const cardRarityKey = (card: BinderCard) =>
  `${card.language}:${card.rarity ?? 'Unspecified'}`;
const languageOrder = (language: string) => {
  const index = (catalogLanguages as ReadonlyArray<string>).indexOf(language);
  return index < 0 ? catalogLanguages.length : index;
};

export function rarityLabel(rarity: string) {
  const name = rarityNames[rarity];
  return name
    ? `${rarity} · ${text(name)}`
    : rarity === 'Special Illustration Rare'
      ? `SIR · ${text(rarity)}`
      : rarity === 'Illustration Rare'
        ? `IR · ${text(rarity)}`
        : text(rarity);
}

export function groupRarities(cards: ReadonlyArray<BinderCard>) {
  const languages = new Map<string, Set<string>>();
  for (const card of cards) {
    const rarities = languages.get(card.language) ?? new Set<string>();
    rarities.add(card.rarity ?? 'Unspecified');
    languages.set(card.language, rarities);
  }
  return [...languages]
    .sort(([a], [b]) => languageOrder(a) - languageOrder(b) || a.localeCompare(b))
    .map(([language, rarities]) => ({
      language,
      rarities: [...rarities]
        .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        .map((rarity) => ({ rarity, value: `${language}:${rarity}` })),
    }));
}
