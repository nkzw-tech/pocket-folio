# Adding cards and languages

The catalog is reviewed source data. Account API keys cannot edit it. Add a pack through a pull
request; no account data or database credentials belong in a pack.

1. Create a TypeScript module in `src/catalog/` exporting a `BinderSet`. Register it in
   `additionalSets` in `src/catalog/additional-sets.ts`.
2. Give each set and card a permanent, globally unique ID. Card IDs cannot contain `:`. A new
   language edition is a separate catalog card, even if its set number matches another language.
   Never rename/reuse an existing ID: collections store these IDs.
3. Supply the set label, BCP 47 language tag, release year and ordered cards. Each card includes
   `localName`, `english`, printed `number` (or null), `language`, `image`, `editions` and
   `defaultEdition`. Editions are `first`, `unlimited`, or `unspecified`; list only real variants.
4. Put optimized scans in `.cache/card-assets/files/cards/` and reference `/cards/filename.webp`. Record attribution
   in the README and the public `/attribution` page. Add optional bilingual `details` using `src/catalog/details.ts`: local/English
   attacks, costs, powers, rules, weakness, resistance and retreat. `foil` selects the existing
   art-area effect; omit it for a non-holo card. A scan need not exist for every printing, so don't
   imply that a shared scan proves a card's edition.
   Upload new artwork to the image host and run `vp run assets:inventory` to update the manifest
   before publishing the pack. Keep artwork out of Git and `public/`.
5. Run `vp test`, `vp check`, `vp run catalog:import`, then browse the new set and its dialogs.
   Catalog import upserts cards/printings without resetting accounts or rearranging binders.
   It also refreshes `src/home-card-pools.json` from Pokémon rarity metadata for the homepage fan.
   GitHub Actions syncs the catalog after deployment. To sync manually, run `vp run catalog:sync`
   with Cloudflare credentials. This uses Wrangler's file upload with Void's generated
   `.void-wrangler.jsonc`; Void's current remote SQL wrapper expands files into command-line
   arguments, which cannot hold the full catalog. Only catalog tables are upserted.

The browser snapshot keeps binder interactions immediate. The database catalog and agent search
use the same source. Existing set presets are snapshots: a new card doesn't silently change a
user's binder.

## Interface translations

Card language and interface locale are independent. English, German and Japanese UI translations
use fbtee. Add a literal message in `src/i18n/text.ts` and translations in
`translations/messages.json`, then run `vp run fbtee:all`. Missing translations fail the build.
Generated fbtee sources and locale dictionaries are checked in. To support another interface
locale, extend `src/i18n/locale.tsx`, the translation script and dictionary entries. Card packs
can use any valid language tag without requiring that interface locale.

## Reviewed catalog expansion (November 2026)

`src/catalog/sources.json` records the source URL, language, roster count and scan coverage for each
new pack. `src/catalog/packs.json` is a compact metadata index; `additional-sets.ts` reconstructs
stable card objects. Full rules live in `public/card-details/<set-id>.json`, are fetched on opening a
card, and are cached per set. They are not part of the initial search bundle. Scans are local WebP
assets, decoded and optimized with `cwebp` at 900px height.

The compact card tuple also includes a rarity for filtering. `scripts/catalog/rarities.py`
preserves source rarity distinctions, including Japanese SAR/SR/UR and CHR/CSR/RRR,
instead of using the simplified rarity in the rules files. Missing source rarities are
explicitly unspecified. `original-rarities.json` supplies the same lightweight metadata for
the original German sets and VS. The Cards and individual-set filters scope search suggestions,
the grid and bulk ownership actions together, without loading detailed rules.
When multiple card languages are visible, rarities are grouped in English, Japanese, German
order. Selection keys include the language, so German Common does not also match English
Common. Single-language views omit group headings; Japanese tier abbreviations include their
full names, and unavailable selections clear when changing the language or set.

The packs cover English Base-era/Gym/Neo/e-Card, the first three EX sets and Team Rocket Returns;
German Neo/e-Card/early EX; native Japanese Gym and Neo; 151, Crown Zenith/Galarian Gallery and
VSTAR Universe; the released English and Japanese Mega expansions; and English 30th Celebration
plus its Classic Collection. Language counterparts are independent rosters, not assumed to have
matching numbering. Japanese Pokédex numbers and unnumbered cards retain their printed numbers;
internal IDs use the source's unique card key. Classic Collection reprints also retain original
numbers, including repeated numerators with different denominators.

The launch expansion adds all English and Japanese Scarlet & Violet booster expansions,
including their secret rares, plus Evolving Skies/Eevee Heroes/Blue Sky Stream/Towering
Perfection, Brilliant Stars through Silver Tempest with all four Trainer Galleries and their
Japanese source expansions, VMAX Climax, Hidden Fates and its Shiny Vault/GX Ultra Shiny,
the English TAG TEAM sets and Japanese Tag Bolt through Tag All Stars. Japanese original
Base/Jungle/Fossil/Rocket and 30th Celebration are included. Numbered English SM/SWSH/SV/Mega
and Japanese SM/SWSH/SV/Mega promo collections are included as source snapshots, not promises of
every event stamp, finish or later promo. English Scarlet & Violet Energies are a separate pack.

Pokémon GO is included in English and German (88 cards each) and Japanese (101 cards),
including secret rares, native scans and bilingual details.

The launch snapshot has 161 set/language entries and 22,321 cards (including the five original
embedded collections). Existing card IDs, edition IDs and roster order remain unchanged.
The extra English Sun & Moon reference packs supply translations without adding those sets
to the visible catalog. `scripts/catalog/overrides.json` records scan-verified corrections:
the Japanese Pretend Comedian Pikachu promo has two attacks, although the upstream roster
included only one. Missing alternate-art rules are restored from an unambiguous same-set
printing or checked against independent Japanese records; source IDs are recorded in the audit.
Every Pokémon detail must contain at least one attack or power. Reprint matching normalizes equivalent no-cost attacks and source-only
Ability metadata before deciding whether an English translation is unambiguous.
HP discrepancies are checked independently against TCGdex and original scans; Japanese
promo Dragonair 302/SM-P intentionally retains its printed HP90 rather than inheriting the
HP100 of a similar English card. Original Japanese Base-era translations prefer the matching
English set instead of later reprints with revised Pokémon Power wording.

This expanded image library requires the Workers Paid static-asset allowance (100,000 files),
which this deployment uses; it exceeds the free plan's 20,000-file allowance. Keep card scans
as static assets for now. Recheck the actual build file count before substantially expanding
the catalog again; the entire image directory is not part of the Worker JavaScript bundle.

Reproduce the snapshot from the repository root (Python 3, `cwebp`, and ImageMagick for AVIF scans):

```sh
python3 scripts/catalog/fetch.py
python3 scripts/catalog/repairs.py
python3 scripts/catalog/generate.py
python3 scripts/catalog/images.py
vp run catalog:import
vp check
vp test
vp run test:catalog-import
vp run build
```

Acquisition caches live in ignored `.cache/catalog/`. No account database, IndexedDB, credentials,
or shopping data are read by these acquisition scripts. Imports only upsert catalog/printing rows.
Existing card IDs, binder slots, ownership and account revisions are preserved.

ShinyBeak/Scrydex supply English/Japanese rosters, text and scans; TCGdex supplies German text and
available German scans. English reference scans are explicitly marked with `imageLanguage: 'en'`
where German scans are unavailable (older German packs and Galarian Gallery). CardCosmos was
checked but uses English fallback images for these missing scans, so its filenames were not treated
as proof of German image language. English translations are taken from supplied bilingual text or
unambiguous matching English mechanics. An upstream duplicate German Expedition attack is
resolved by matching cost/damage to the English card instead of displaying the inconsistent attack.

`editions` remain actual first/unlimited/unspecified editions. Modern packs do not invent first
editions. `finishes` records ordinary source finishes separately; collection ownership currently
remains edition-based, not a reverse-holo/master-set inventory. Stamped finish variants and price feeds are excluded. The Japanese Sword & Shield promo
collection includes six unnumbered Jumbo Collection cards, explicitly labelled as Jumbo. Reprint image artwork alone is not evidence of a particular edition.

The all-card grid starts with 60 cards and appends batches as its scroll sentinel approaches the
viewport. The card picker uses the same behavior in its dialog. Search still covers the entire index.
The `/sets` overview owns set search and language/era filters; `/cards` contains only card search. Set
selection uses `@nkzw/typeahead` in the catalog, binder presets and insertion picker. Bulk ownership
writes retain the existing 2,000-printing command limit and stop if any batch fails.

The Japanese alternate-art records with missing HP are independently checked against TCGdex by
`repairs.py`; these rules correct missing HP and inconsistent attack costs/names. Two Japanese Neo
Destiny Unown records are corrected to HP50 after inspecting their original scans. Source metadata
also records unresolved English rule/Ability translations; the UI retains Japanese text instead of
inventing an English equivalent. Reference-only English packs are downloaded for matching reprint
translations but are not silently added to the catalog. Available German scans may be downloaded
through CardCosmos’s mirror of the same TCGdex assets; missing German scans never use that fallback.

Set overview covers combine local card scans with original set logos where available. Logo URLs
and cached paths are recorded in `src/catalog/set-covers.json`; regenerate these with
`python3 scripts/catalog/set-covers.py`. Logos live under `/set-logos/` to avoid the `/sets/[id]` route.

Card text display uses the original language and the viewer’s interface language. Run `vp run catalog:translations` after changing detail packs to regenerate the lazily loaded German/Japanese phrase dictionaries from existing catalog text. Ambiguous translations are omitted; unavailable phrases fall back to English. Card images and search aliases stay unchanged.
