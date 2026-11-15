import { defineHandler } from 'void';
import { readPublicBinder } from '../../../db/profile';
export const GET = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  const document = await readPublicBinder(c.req.param('token') ?? '');
  return document ?? c.json({ error: 'This binder is private or the link has expired.' }, 404);
});
