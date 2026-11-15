import { defineMiddleware } from 'void';
import { getSession } from 'void/auth';
export default defineMiddleware(async (c, next) => {
  const user = getSession()?.user;
  c.set('shared', {
    user: user
      ? { email: user.email, emailVerified: user.emailVerified, id: user.id, name: user.name }
      : null,
  });
  await next();
  c.res = new Response(c.res.body, c.res);
  if (/^\/(?:b|p|binders)(?:\/|$)/.test(new URL(c.req.url).pathname)) {
    c.res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  const pathname = new URL(c.req.url).pathname;
  // Let Void reuse prefetched catalog shells in this browser. They contain no
  // collection data; shared session metadata still excludes all shared caches.
  // API, account and shared-binder responses remain strictly no-store.
  if (!pathname.startsWith('/assets/')) {
    const catalogShell =
      c.req.method === 'GET' &&
      c.req.header('X-VoidPages') === 'true' &&
      c.res.status === 200 &&
      (pathname === '/cards' || pathname === '/sets' || pathname.startsWith('/sets/'));
    c.res.headers.set('Cache-Control', catalogShell ? 'private, no-cache' : 'no-store');
    if (catalogShell) {
      c.res.headers.append('Vary', 'Cookie');
    }
  }
});
