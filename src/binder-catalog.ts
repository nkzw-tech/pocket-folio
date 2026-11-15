import { additionalSets } from './catalog/additional-sets';
import originalRarities from './catalog/original-rarities.json';
import { germanCardData } from './german-card-data';
import { vsCardData } from './vs-card-data';
export type Edition = 'first' | 'unlimited' | 'unspecified';

export type CardFoil =
  | 'fullart'
  | 'modern'
  | 'base'
  | 'rocket-energy'
  | 'rocket-trainer'
  | 'vs'
  | 'vs-energy'
  | 'wizards';

export type BinderCard = {
  defaultEdition: Edition;
  details?: import('./catalog/details').CardDetails;
  detailsPath?: string;
  editions: ReadonlyArray<Edition>;
  english: string;
  finishes?: ReadonlyArray<string>;
  foil?: CardFoil;
  id: string;
  image: string;
  imageLanguage?: string;
  language: string;
  localName: string;
  number: string | null;
  printingId?: string;
  rarity?: string;
  slotIndex?: number;
  tag?: 'Promo' | 'Secret rare';
};

const germanSets = [
  {
    holoThrough: 16,
    href: '#grundset',
    id: 'base1',
    label: 'Grundset',
    printed: 102,
    releaseYear: 1999,
    subtitle: '',
  },
  {
    holoThrough: 16,
    href: '#dschungel',
    id: 'base2',
    label: 'Dschungel',
    printed: 64,
    releaseYear: 2000,
    subtitle: '',
  },
  {
    holoThrough: 15,
    href: '#fossil',
    id: 'base3',
    label: 'Fossil',
    printed: 62,
    releaseYear: 2000,
    subtitle: '',
  },
  {
    holoThrough: 17,
    href: '#team-rocket',
    id: 'base5',
    label: 'Team Rocket',
    printed: 82,
    releaseYear: 2000,
    subtitle: '',
  },
] as const;

const vsHoloArtwork = new Set([7, 13, 25, 32, 43, 84, 90, 91, 93, 94, 95, 96, 142]);
const vsHoloEnergy = new Set([143, 144, 151]);

function germanFoil(set: (typeof germanSets)[number], number: number): CardFoil | undefined {
  if (number > set.holoThrough && number <= set.printed) {
    return;
  }
  if (set.id === 'base5') {
    if (number === 17) {
      return 'rocket-energy';
    }
    if (number === 15 || number === 16) {
      return 'rocket-trainer';
    }
  }
  return set.id === 'base1' ? 'base' : 'wizards';
}

export const germanCollections = germanSets.map(
  (set) =>
    ({
      ...set,
      cards: germanCardData[set.id].map(([number, localName, english]): BinderCard => ({
        defaultEdition: 'unlimited',
        editions: ['unlimited', 'first', 'unspecified'],
        english,
        foil: germanFoil(set, number),
        id: `${set.id}-${number}`,
        image: `/cards/${set.id}-${number}.webp`,
        language: 'de',
        localName,
        number: `${number}/${set.printed}`,
        rarity: (originalRarities as Record<string, string>)[`${set.id}-${number}`],
        tag: number > set.printed ? 'Secret rare' : undefined,
      })),
      language: 'de',
    }) as const,
);

export const vsCollectionCatalog = {
  cards: vsCardData.map(([scanId, localName, english]): BinderCard => ({
    defaultEdition: 'first',
    editions: ['first', 'unspecified'],
    english,
    foil: vsHoloEnergy.has(scanId) ? 'vs-energy' : vsHoloArtwork.has(scanId) ? 'vs' : undefined,
    id: String(scanId),
    image: `/cards/vs/${String(scanId).padStart(3, '0')}.webp`,
    language: 'ja',
    localName,
    number: scanId <= 142 ? `${String(scanId).padStart(3, '0')}/141` : null,
    rarity: (originalRarities as Record<string, string>)[String(scanId)],
    tag: scanId === 142 ? 'Promo' : undefined,
  })),
  href: '#vs',
  id: 'vs',
  label: 'Pokémon ★VS',
  language: 'ja',
  releaseYear: 2001,
  subtitle: '',
} as const;

export type BinderSet = {
  cards: Array<BinderCard>;
  doubleSided?: boolean;
  englishLabel?: string;
  era?: string;
  href?: string;
  id: string;
  label: string;
  language: string;
  releaseYear: number;
  subtitle?: string;
};
export const binderCollections: Array<BinderSet> = [
  ...germanCollections.map((set) => ({ ...set, doubleSided: set.id === 'base1' })),
  vsCollectionCatalog,
  ...additionalSets,
];
export const languageName = (language: string, locale = 'en') =>
  new Intl.DisplayNames([locale], { type: 'language' }).of(language) ?? language;
