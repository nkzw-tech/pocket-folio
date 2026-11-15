import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

export async function verifyLocalEmail(context, base, email) {
  assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
  const token = (await readFile('.void/dev-trigger-token', 'utf8')).trim();
  const headers = { 'x-void-dev-trigger': token };
  const inbox = await (await context.request.get(`${base}/__void/inbox`, { headers })).text();
  const row = inbox
    .match(/<tr>[\s\S]*?<\/tr>/g)
    ?.find((row) => row.includes(email) && row.includes('Verify your Pocket Folio email'));
  assert(row, 'Expected a local verification email');
  const path = row.match(/href="([^"?]+)/)[1];
  const html = await (await context.request.get(base + path, { headers })).text();
  const link = html
    .match(/<pre>([\s\S]*?)<\/pre>/)[1]
    .replaceAll('&amp;', '&')
    .match(/https?:\/\/[^\s<]+/)[0];
  assert.equal(new URL(link).origin, base);
  const response = await context.request.get(link);
  assert.equal(response.status(), 200);
}
