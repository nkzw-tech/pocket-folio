import { defineHandler, type InferProps } from 'void';
import { readPublicBinder } from '../../../db/profile';

export const loader = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  const token = c.req.param('token') ?? '';
  const document = await readPublicBinder(token, c.req.param('binderId') ?? '');
  if (!document) {
    return c.notFound();
  }
  return { document };
});
export type Props = InferProps<typeof loader>;
