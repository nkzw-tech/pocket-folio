import { defineHandler } from 'void';
import api from '../../packages/pocket-folio/skills/pocket-folio/references/api.md?raw';
import skill from '../../packages/pocket-folio/skills/pocket-folio/SKILL.md?raw';

// Serve the exact documents bundled with the CLI, with no account data.
export const GET = defineHandler((c) => {
  const path = new URL(c.req.url).pathname;
  const document =
    path === '/agent/SKILL.md' ? skill : path === '/agent/references/api.md' ? api : null;
  if (!document) {
    return c.notFound();
  }
  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('X-Content-Type-Options', 'nosniff');
  return c.body(document);
});
