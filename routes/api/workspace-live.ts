import { defineHandler } from 'void';
import { getSession } from 'void/auth';
import { workspaceLive } from '../../src/server/live';

export const GET = defineHandler((c) => {
  const user = getSession()?.user;
  return user
    ? workspaceLive.connect(c, { owner: `user:${user.id}` })
    : c.json({ error: 'Sign in to open your binders.' }, 401);
});
export const POST = defineHandler((c) => {
  const user = getSession()?.user;
  if (!user) {
    return c.json({ error: 'Sign in to open your binders.' }, 401);
  }
  if (c.req.header('origin') !== new URL(c.req.url).origin) {
    return c.json({ error: 'Invalid request origin.' }, 403);
  }
  return workspaceLive.control(c, { owner: `user:${user.id}` });
});
