# Pocket Folio

A free card binder app with tactile page turns, holo effects, and room for your collection.

**[Open Pocket Folio](https://folio.nakazawa.tech)**

- Arrange cards in custom binders or start from a set preset.
- Track owned, purchased, missing, and wishlist cards.
- Browse English, Japanese, and German cards with translated details.
- Share read-only binders and your profile with friends.
- Manage your collection through the [agent CLI and API](packages/pocket-folio/README.md).

Built with React, [Fate](https://fate.technology), Void, Vite+, Astryx, and fbtee.
Collection edits save locally and sync to Cloudflare D1; artwork is served from R2.

## Development

Use Node.js 24+ and [Vite+](https://viteplus.dev).

```sh
vp install
vp run dev:setup
vp run dev
```

Open [localhost:5217](http://127.0.0.1:5217). Browse without signing in, or create a local
account to save binders. Setup preserves existing accounts and collections.

Artwork is hosted separately and isn't included in Git. Development uses files from
`.cache/card-assets/files/` when available and falls back to the public image host.
Set `VITE_CARD_ASSET_BASE_URL` in `.env.local` to use your own host.

## Checks

```sh
vp check
vp test
```

`vp run test:all` runs fast checks and unit tests. Browser tests are optional:
`vp run test:browser` checks the core binder flow; `vp run test:api` checks API permissions and
the CLI. Both start a local server if needed and use Chrome or Playwright Chromium. The API
test also needs an unlocked macOS Keychain or Linux Secret Service. Run a build for release
or tooling changes.

## Contributing

New sets, translations, and improvements are welcome.

- [Adding cards and languages](docs/catalog.md)
- [Agent API](docs/api.md)
- [CLI and agent skill](packages/pocket-folio/README.md)

Pushes to `main` deploy the hosted app through [GitHub Actions](.github/workflows/push.yml)
after checks pass. Forks run checks only; self-hosting requires your own Cloudflare resources
and configuration in `void.config.ts` and `void.lock.json`.

## Card sources

Thanks to the [data and artwork providers](https://folio.nakazawa.tech/attribution).
See the [source manifest](src/catalog/sources.json) for per-set credits.
Scrydex supplies the Japanese
[Rocket’s Scizor 002/P scan](https://scrydex.com/pokemon/cards/rockets-scizor/miscpp_ja-2).

Pocket Folio is a noncommercial fan project, not affiliated with The Pokémon Company,
Nintendo, Creatures, or GAME FREAK. The [MIT license](LICENSE) covers our code;
card artwork and sourced data retain their respective rights. See [third-party notices](THIRD_PARTY_NOTICES.md).
