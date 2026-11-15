import { defineHandler } from 'void';
import { db } from 'void/db';
import { catalogCard, printing } from '../../db/schema';
export const GET = defineHandler(async (c) => {
  c.header('Cache-Control', 'public, max-age=3600');
  return {
    cards: await db.select().from(catalogCard),
    printings: await db.select().from(printing),
    version: 1,
  };
});
