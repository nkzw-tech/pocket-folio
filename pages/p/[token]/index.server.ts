import { defineHandler, type InferProps } from 'void';
import { readProfileSummary } from '../../../db/profile';

export const loader = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  const token = c.req.param('token') ?? '';
  const profile = await readProfileSummary(token);
  if (!profile) {
    return c.notFound();
  }
  return { profile, token };
});
export type Props = InferProps<typeof loader>;
