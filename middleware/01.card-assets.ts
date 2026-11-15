import { defineMiddleware } from 'void';
import { cardAssetURL } from '../src/card-assets';

export default defineMiddleware(async (c, next) => {
  const { pathname } = new URL(c.req.url);
  const target = cardAssetURL(pathname);
  if ((c.req.method === 'GET' || c.req.method === 'HEAD') && target !== pathname) {
    return Response.redirect(new URL(target, c.req.url), 302);
  }
  await next();
});
