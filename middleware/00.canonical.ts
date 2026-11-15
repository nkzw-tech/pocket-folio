import { defineMiddleware } from 'void';
import { canonicalPageURL } from '../src/server/canonical-url';

export default defineMiddleware(async (c, next) => {
  const target = canonicalPageURL(c.req.url, c.req.method);
  if (target) {
    return Response.redirect(target, 308);
  }
  await next();
});
