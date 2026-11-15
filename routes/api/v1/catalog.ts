import { defineHandler } from 'void';
import { apiResponse, authenticateKey } from '../../../src/api/server';
import { catalog, printingId } from '../../../src/app/model';
import { normalize } from '../../../src/normalize';
export const GET = defineHandler((c) =>
  apiResponse(c, async () => {
    await authenticateKey(c, 'collection:read');
    const query = normalize(c.req.query('q') ?? '');
    const set = c.req.query('set');
    const language = c.req.query('language');
    const offset = Math.max(0, Math.floor(Number(c.req.query('offset')) || 0));
    const matches = catalog.filter(
      (card) =>
        (!set || card.setId === set) &&
        (!language || card.language === language) &&
        normalize(`${card.id} ${card.localName} ${card.english} ${card.number ?? ''}`).includes(
          query,
        ),
    );
    return {
      cards: matches.slice(offset, offset + 100).map((card) => ({
        ...card,
        printings: card.editions.map((edition) => ({
          edition,
          id: printingId(card.id, edition),
        })),
      })),
      nextOffset: offset + 100 < matches.length ? offset + 100 : null,
      total: matches.length,
    };
  }),
);
