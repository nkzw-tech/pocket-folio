// Keep legacy API clients on their original origin: redirecting bearer requests
// can discard authorization headers, and mutations must never be replayed here.
export function canonicalPageURL(requestURL: string, method: string): string | null {
  const url = new URL(requestURL);
  if (
    url.hostname !== 'pkmn.nakazawa.tech' ||
    !['GET', 'HEAD'].includes(method) ||
    /^\/api(?:\/|$)/.test(url.pathname)
  ) {
    return null;
  }
  url.protocol = 'https:';
  url.hostname = 'folio.nakazawa.tech';
  url.port = '';
  url.username = '';
  url.password = '';
  return url.href;
}
