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

export type StackedCard = { card: BinderCard; depth: number; slot: number };

// A transparent sheet reveals the nearest visible card underneath each pocket.
// Resolve this from all sheets, but render at most one card per pocket. The
// returned slots identify physical placements, keeping images stable when a
// preloaded page becomes the resting page after a turn.
export function binderUnderlay(
  cards: ReadonlyArray<BinderCard | undefined>,
  page: BinderPage,
  visible: (card: BinderCard) => boolean,
  columns = 3,
  rows = 3,
): ReadonlyArray<StackedCard | undefined> {
  const size = columns * rows;
  const result = Array<StackedCard | undefined>(size).fill(undefined);
  if (page.kind !== 'front' && page.kind !== 'reverse') {
    return result;
  }
  const reverse = page.kind === 'reverse';
  const step = reverse ? -size : size;
  for (let pocket = 0; pocket < size; pocket++) {
    if (!reverse && page.cards[pocket]) {
      continue;
    }
    const offset = reverse
      ? Math.floor(pocket / columns) * columns + columns - 1 - (pocket % columns)
      : pocket;
    for (
      let slot = page.start + step + offset, depth = 1;
      slot >= 0 && slot < cards.length;
      slot += step, depth++
    ) {
      const card = cards[slot];
      if (card && visible(card)) {
        result[pocket] = { card, depth, slot };
        break;
      }
    }
  }
  return result;
}
