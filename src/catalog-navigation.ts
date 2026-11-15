import { binderCollections, type BinderSet } from './binder-catalog';

export const catalogLanguages = ['en', 'ja', 'de'] as const;
const languageOrder = new Map<string, number>(
  catalogLanguages.map((language, index) => [language, index]),
);
export function sortSets(sets: ReadonlyArray<BinderSet>) {
  return [...sets].sort(
    (a, b) =>
      b.releaseYear - a.releaseYear ||
      (languageOrder.get(a.language) ?? catalogLanguages.length) -
        (languageOrder.get(b.language) ?? catalogLanguages.length) ||
      a.label.localeCompare(b.label),
  );
}
export const catalogSets = sortSets(binderCollections);

export function groupSetsByYear(sets: ReadonlyArray<BinderSet>) {
  const years = new Map<number, Array<BinderSet>>();
  for (const set of sortSets(sets)) {
    const group = years.get(set.releaseYear);
    if (group) {
      group.push(set);
    } else {
      years.set(set.releaseYear, [set]);
    }
  }
  return [...years].map(([year, sets]) => ({ sets, year }));
}

// These ranges describe the available catalog, not every release in an era.
// Keep them independent of language filters so labels do not shift during browsing.
export const catalogEras = [...new Set(catalogSets.map((set) => set.era ?? 'Classic'))].map(
  (era) => {
    const years = catalogSets
      .filter((set) => (set.era ?? 'Classic') === era)
      .map((set) => set.releaseYear);
    const first = Math.min(...years);
    const last = Math.max(...years);
    return { era, range: first === last ? String(first) : `${first}–${last}` };
  },
);
