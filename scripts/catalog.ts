import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { catalog, printingId } from '../src/app/model';
import type { CardDetails } from '../src/catalog/details';
import germanDetails from '../src/german-card-details.json';
import vsDetails from '../src/vs-card-details.json';
const details: Record<string, Record<string, unknown>> = { de: germanDetails, ja: vsDetails };
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const packs = new Map<string, Record<string, CardDetails>>();
for (const path of new Set(
  catalog.map((card) => card.detailsPath).filter((path): path is string => Boolean(path)),
)) {
  packs.set(path, JSON.parse(await readFile(`public${path}`, 'utf8')));
}
const statements: Array<string> = [];
const homePools: { common: Array<string>; holo: Array<string> } = { common: [], holo: [] };
for (const card of catalog) {
  const info = (card.details ??
    (card.detailsPath ? packs.get(card.detailsPath)?.[card.id] : undefined) ??
    details[card.language]?.[card.id]) as CardDetails | undefined;
  if (info?.pokemon) {
    if (card.foil) {
      homePools.holo.push(card.id);
    } else if (info.rarity === 'common') {
      homePools.common.push(card.id);
    }
  }
  statements.push(
    `INSERT INTO catalog_card (id, setId, language, metadata, details) VALUES (${[card.id, card.setId, card.language, JSON.stringify(card), JSON.stringify(card.details ?? (card.detailsPath ? packs.get(card.detailsPath)?.[card.id] : undefined) ?? details[card.language]?.[card.id] ?? {})].map(quote).join(',')}) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata, details=excluded.details;`,
  );
  for (const edition of card.editions) {
    statements.push(
      `INSERT INTO printing (id, cardId, edition, finish) VALUES (${[printingId(card.id, edition), card.id, edition, card.foil ? 'holo' : 'non-holo'].map(quote).join(',')}) ON CONFLICT(id) DO NOTHING;`,
    );
  }
}
await mkdir('.void', { recursive: true });
await writeFile('.void/catalog.sql', statements.join('\n'));
// Keep the homepage's small selection manifest separate from the full card rules.
await writeFile('src/home-card-pools.json', JSON.stringify(homePools, null, 2) + '\n');
