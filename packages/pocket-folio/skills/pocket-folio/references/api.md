# Agent API v1

Production origin: `https://folio.nakazawa.tech`. Local: `http://127.0.0.1:5217`.
Create a named, expiring API key in Settings. Authenticate with `Authorization: Bearer <key>`.
The API accepts keys only; browser settings require a cookie session and same-origin writes.
Keys cannot impersonate browser sessions or manage other keys. Rate limit: 120 checks/minute/key.
The server stores hashed secrets; fresh policy reads and write guards enforce revocation.

- `GET /api/v1/catalog?q=...&set=vs&language=ja&offset=0`: up to 100 matches, exact printings,
  `total`, `nextOffset`. Search both local and English names. Card language and edition matter.
- `GET /api/v1/collection`: accountId, keyId, revision, document (restricted to permitted binders).
- `POST /api/v1/changes`: `{operations:[{id:UUID,command:...}],expectedRevision:number,dryRun?:boolean}`.
  Up to 100 operations and 500 KB. Every command is validated before any writes. Preview returns
  current revision and changes without modifying collection data. Apply requires that revision.
  Retry with the same operation IDs and payload after a lost response. Reusing IDs for different
  commands is rejected. Successful agent batches and before/after changes are audited atomically.

Commands:

```json
[
  { "type": "ownership.status", "printing": "13:first", "status": "purchased" },
  { "type": "ownership.status", "printing": "base5-83:unlimited", "status": "owned" }
]
```

Status values: `missing`, `wishlist`, `purchased`, `owned`. `ownership:write` required. This changes status,
not placement, and applies to the printing across all binders. The wire document retains existing
boolean ownership values (`true` = owned, `false`/absent = missing), plus `"wishlist"` and `"purchased"`.

Binder commands (`binders:write`):

- `binder.create`: `binder:{id:UUID,name,rows:3,columns:3,doubleSided:false,shareToken:null,slots:[]}`.
- `shelf.move`: `binderId`, `beforeId` (another binder ID, or `null` for the end). Requires collection-wide `binders:write`.
  Optional `color` is a six-digit hex color (`#RRGGBB`); omitted colors use charcoal.
  Optional `pocketOpening` is `top` (default), `side`, or `none` (no visible opening).
  Optional `presetSetId` remembers the starting catalog set; `coverSetId` selects its cover artwork.
- `binder.settings`: `binderId,name,rows,columns,doubleSided`. Rows/columns 2–4.
  Optional `color` changes the cover, lining, and spine; omitting it preserves the current color.
  Optional `pocketOpening` changes the sleeve opening to `top`, `side`, or `none`; omitting it preserves the current choice.
  Optional `coverSetId` is a catalog set ID for set artwork, or `null` for the first-card cover.
  Omitting it preserves the current cover. Cover changes never affect placement or ownership.
  Optional `showAllCardsInColor` displays all placed cards at full color and opacity, including in shared views.
  Defaults to false; omitting it preserves the current setting. It never changes ownership.
- `binder.slot`: `binderId,position,printing` and optional `status`; zero-based positions.
  `printing:null` empties a pocket. A status change additionally requires `ownership:write`.
- `binder.move`: `binderId,from,to` swaps zero-based pockets.
- `binder.page`: `binderId` appends a page.
- `binder.page.remove`: `binderId,page,expected:{columns,rows,slots}` removes a zero-based
  page of `columns × rows` pockets, shifting later pockets forward. At least one page must remain.
  Pass the current layout and full slots array as `expected`; stale snapshots are rejected.
  Card ownership/purchased status is preserved. Each side counts as a page for double-sided binders.
- `binder.delete`: `binderId`; requires `binders:delete`.
- `binder.share`: `binderId,token:UUID|null`; requires `sharing:write`.

`collection.import`: `document` in the version-1 export format. Requires `binders:write`
and `ownership:write`, with no binder restriction. Adds previously unseen binder IDs (private),
keeps existing binders, and merges statuses in order owned > purchased > wishlist > missing. It never
restores share tokens, removes binders, or downgrades status. Preview and apply use the same
atomic command and retry receipts as other changes.

New IDs must be UUIDs. Keys restricted to existing binders cannot create other binders.
Limits: 100 binders/account, 2,000 pockets/binder. All mutations require `collection:read` for
preview and readback. Key settings cannot grant catalog editing or account/key administration.
A 409 means stale revision or conflicting operation ID. A 401 means unavailable credentials;
403 means insufficient access. Do not retry by broadening access or changing IDs.

## CLI

`pocket-folio auth login` prompts without echoing; `--origin` selects a service.
`--stdin` is available for a secure pipe, never a literal secret in shell arguments/history.
macOS requires Command Line Tools to compile the small Security.framework helper once. Linux
uses Secret Service (`secret-tool`). There is no plaintext fallback. `~/.config/pkmn/config.json`
contains only the origin; the secret lives in the OS credential store. Each origin is isolated.
`auth logout` removes the local credential; revoke the server key separately in Settings.

`changes preview commands.json --out plan.json` saves a reviewable, account-bound plan without a
secret. `changes apply plan.json` applies the exact plan. Keep the same plan when retrying a lost
response. Both commands print JSON for agents. The CLI and skill ship together in `@nkzw/pocket-folio`. Run `pocket-folio skill show` to inspect it.

## Public profile

`profile.settings` accepts `profile: {name, token, binderIds}`. `token` is a new UUID to
publish or `null` to revoke the profile. Only selected binders are visible through
`/p/<token>`; individual binder share links remain independent. Requires an
account-wide key with `sharing:write`. Binder-restricted keys cannot change profiles.
Imported collections never publish their saved profiles.
