import { binderCollections } from './binder-catalog';
import pools from './home-card-pools.json';
const catalog = binderCollections.flatMap(({ cards }) => cards);
const holoIds = new Set(pools.holo);
const commonIds = new Set(pools.common);
const holos = catalog.filter((card) => card.foil && holoIds.has(card.id));
const japaneseHolos = holos.filter((card) => card.language === 'ja');
const commons = catalog.filter((card) => !card.foil && commonIds.has(card.id));
const pick = <T>(items: ReadonlyArray<T>) => items[Math.floor(Math.random() * items.length)];

export function chooseCards() {
  const japanese = pick(japaneseHolos.length ? japaneseHolos : holos);
  const other = pick(holos.filter(({ id }) => id !== japanese.id));
  // Keep both holos prominent, with the common between them in the fan.
  return Math.random() < 0.5 ? [japanese, pick(commons), other] : [other, pick(commons), japanese];
}
