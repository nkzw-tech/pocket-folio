Never use ChatGPT Sites plugins, tools or skills. Build and preview this app locally.

Use Vite+ (`vp`) and Void Pages. Read relevant installed documentation under
`node_modules/react-fate/docs/` and `node_modules/void` before changing data or framework behavior.
Keep mutations local-first with durable account-scoped Fate state. Database writes must preserve
atomic retry receipts and collection revisions. Authenticate private reads and every write;
public binder sharing must project only one binder and never include private account data.
Public profiles expose only explicitly selected binder summaries; their binder pages must
project one selected binder. Keep profile links revocable and independent of individual shares.

Do not reset local databases or rewrite existing IndexedDB data.
`vp run dev:setup` and `vp run catalog:import` preserve personal data. `void db seed/reset` do not.
Keep the local shopping project separate. No deployment is implied by a code change.

Keep verification proportional to the change. For code changes, use `vp check` and the relevant
unit tests (`vp test` runs the small unit suite). Documentation-only changes need no app build.
Use the optional `vp run test:browser` smoke test for core UI flows, `vp run test:api` for
API/auth/CLI changes, and `vp run test:catalog-import` for catalog import changes. Do not run
these integrations or a production build for every edit. Build when changing bundling,
dependencies or deployment. Do not add per-feature browser suites or cosmetic regression tests.
Do not weaken lint rules to avoid fixing issues. Preserve the binder's fast pointer interactions,
reduced-motion handling, squircle styling, and bilingual card details.

UI text uses fbtee via src/i18n; keep English, German and Japanese dictionaries in sync.
Use Astryx where it fits standard controls without replacing custom binder rendering.
Agent writes must remain scoped, previewable, idempotent and audited. Never log API secrets,
store plaintext credentials, or allow bearer keys to become browser sessions.
See docs/catalog.md for adding stable catalog packs.

Use @nkzw/typeahead for search/typeahead controls. Keep catalog, picker and binder matching
consistent through src/card-search-data.ts; preserve exact card numbers and Japanese marks.

UI consistency: use Astryx for standard buttons, fields, selectors, dialogs, menus and tabs.
Keep @nkzw/typeahead and the custom card, binder, ownership-overlay and holo interactions.
Use Astryx Stack for flow layouts and src/ui/form-stack.tsx for semantic forms. Stack spacing
steps are 4px; use whole steps, and multiples of 4 for CSS layout padding, margins and gaps.
Use src/ui/theme.ts and src/ui/controls.css for shared control styling; do not add per-screen
button heights or field padding. Standard controls are 44px, compact controls 32px. Preserve
Salesforce Sans, bold headings/tabs, neutral dark surfaces, faint borders and squircle corners.
Fine border strokes, font sizes and physical card/page/artwork geometry are not spacing tokens.
