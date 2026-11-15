import { defineConfig } from 'void/config';
export default defineConfig({
  auth: { providers: ['email'] },
  cloudflare: {
    account_id: '004b3cabb810ff98895ea3a690f6ba00',
    d1_databases: [
      {
        binding: 'DB',
        database_id: '4d61e582-70f8-4ddf-b897-5b325e80b33d',
        database_name: 'pkmn-binder-db',
        migrations_dir: './db/migrations',
      },
    ],
    name: 'pkmn-binder',
    routes: [
      { custom_domain: true, pattern: 'folio.nakazawa.tech' },
      { custom_domain: true, pattern: 'pkmn.nakazawa.tech' },
    ],
    // Sending only: the apex continues receiving mail through Proton Mail.
    send_email: [
      { allowed_sender_addresses: ['noreply@mail.pkmn.nakazawa.tech'], name: 'SEND_EMAIL' },
    ],
    vars: { __VOID_EMAIL_FROM: 'Pocket Folio <noreply@mail.pkmn.nakazawa.tech>' },
  },
  email: { from: 'Pocket Folio <noreply@mail.pkmn.nakazawa.tech>' },
  head: {
    htmlAttrs: { lang: 'en' },
    link: [{ href: '/favicon.svg', rel: 'icon', sizes: 'any', type: 'image/svg+xml' }],
    meta: [
      { charset: 'utf8' },
      { content: 'no-referrer', name: 'referrer' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { content: '#141417', name: 'theme-color' },
      {
        content: 'Organize your cards, build binders, and share your collection.',
        name: 'description',
      },
      { content: 'Pocket Folio', property: 'og:site_name' },
      { content: 'Pocket Folio', property: 'og:title' },
      {
        content: 'Organize your cards, build binders, and share your collection.',
        property: 'og:description',
      },
      { content: 'website', property: 'og:type' },
      {
        content: 'https://assets.folio.nakazawa.tech/social/pocket-folio.png',
        property: 'og:image',
      },
      { content: 'image/png', property: 'og:image:type' },
      { content: '1200', property: 'og:image:width' },
      { content: '630', property: 'og:image:height' },
      {
        content:
          'Pocket Folio — a fan of Japanese Pokémon VS cards on a dark, iridescent background.',
        property: 'og:image:alt',
      },
      { content: 'summary_large_image', name: 'twitter:card' },
      { content: 'Pocket Folio', name: 'twitter:title' },
      {
        content: 'Organize your cards, build binders, and share your collection.',
        name: 'twitter:description',
      },
      {
        content: 'https://assets.folio.nakazawa.tech/social/pocket-folio.png',
        name: 'twitter:image',
      },
      {
        content:
          'Pocket Folio — a fan of Japanese Pokémon VS cards on a dark, iridescent background.',
        name: 'twitter:image:alt',
      },
    ],
    title: 'Pocket Folio',
  },
  inference: { build: 'vp run fbtee:all && vp -C . build' },
  routing: { typedRoutes: true },
  worker: {
    compatibility_date: '2026-11-01',
    compatibility_flags: ['nodejs_compat', 'no_handle_cross_request_promise_resolution'],
  },
});
