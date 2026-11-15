import { eq } from 'drizzle-orm';
import { defineHandler } from 'void';
import { getSession } from 'void/auth';
import { workspaceRevision } from '../../db/schema';
import { primaryDb } from '../../db/workspace';

export const GET = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  const user = getSession()?.user;
  if (!user) {
    return c.json({ error: 'Sign in to open your binders.' }, 401);
  }
  const [row] = await primaryDb()
    .select({ revision: workspaceRevision.revision })
    .from(workspaceRevision)
    .where(eq(workspaceRevision.userId, user.id));
  return { id: user.id, revision: row?.revision ?? 0 };
});
