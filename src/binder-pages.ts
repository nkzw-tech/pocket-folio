import type { BinderCard } from './binder-catalog';
export type BinderPresentation = {
  cards: ReadonlyArray<BinderCard | undefined>;
  color?: string;
  columns?: number;
  doubleSided?: boolean;
  id: string;
  label: string;
  language?: 'de' | 'ja' | 'mixed';
  pocketOpening?: 'top' | 'side' | 'none';
  releaseYear?: number;
  rows?: number;
  showAllCardsInColor?: boolean;
};
export type BinderPage = {
  cards: ReadonlyArray<BinderCard | undefined>;
  kind: 'back' | 'cover' | 'front' | 'inside' | 'reverse';
  reverseCards?: ReadonlyArray<BinderCard | undefined>;
  sheet: number;
  start: number;
};
export function spreadCount(cardCount: number, doubleSided: boolean, capacity = 9) {
  const faces = Math.ceil(cardCount / capacity);
  return Math.max(1, doubleSided ? Math.ceil(faces / 2) + 1 : faces);
}
export function cardSpread(index: number, doubleSided: boolean, capacity = 9) {
  return doubleSided
    ? Math.floor((Math.floor(index / capacity) + 1) / 2)
    : Math.floor(index / capacity);
}
export function binderPages(
  cards: ReadonlyArray<BinderCard | undefined>,
  spread: number,
  doubleSided: boolean,
  columns = 3,
  rows = 3,
): { left: BinderPage; right: BinderPage } {
  const size = columns * rows;
  const start = spread * (doubleSided ? size * 2 : size);
  const oppositeFace = (start: number) =>
    Array.from(
      { length: size },
      (_, index) =>
        cards[start + Math.floor(index / columns) * columns + columns - 1 - (index % columns)],
    );
  return {
    left: {
      cards: spread && doubleSided ? cards.slice(start - size, start) : [],
      kind: spread ? (doubleSided ? 'back' : 'reverse') : 'inside',
      reverseCards: spread ? oppositeFace(start - size * (doubleSided ? 2 : 1)) : undefined,
      sheet: spread,
      start: start - size,
    },
    right: {
      cards: cards.slice(start, start + size),
      kind: start < cards.length ? 'front' : 'cover',
      reverseCards: doubleSided ? oppositeFace(start + size) : undefined,
      sheet: spread + 1,
      start,
    },
  };
}
export function pageRange(page: BinderPage) {
  return page.cards.length
    ? `${page.start + 1}–${page.start + page.cards.length}`
    : page.kind === 'reverse' || page.reverseCards?.some(Boolean)
      ? 'Card backs'
      : 'Inside cover';
}
