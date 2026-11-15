# @nkzw/pocket-folio

Pocket Folio's terminal client and portable agent skill, shipped together. Node.js 24+;
no runtime dependencies and no install scripts. The app and this package release independently.

## Connect

After the first npm release:

```sh
npm install -g @nkzw/pocket-folio
pocket-folio skill install --agent codex
pocket-folio auth login
```

Use `--agent claude` for Claude Code, or `--directory .agents/skills` for a project-scoped
installation. The agent options install into `~/.agents/skills` and `~/.claude/skills`,
respectively. Restart your agent session after installation. Other local agents can use
`--directory PATH` with their skills directory or read `pocket-folio skill show`.

Create a key at [Settings → API](https://folio.nakazawa.tech/settings?tab=api), then paste it into
the login command's hidden terminal prompt. Read-only keys need `collection:read`; marking cards
also needs `ownership:write`. Choose binder permissions only if you want the agent to arrange
or create binders. The key never belongs in chat, command arguments, or source control.

macOS uses Keychain and needs Command Line Tools (`xcode-select --install`) to compile the small
bundled Swift helper on first login. Linux needs an unlocked Secret Service and `secret-tool`
(often in `libsecret-tools`). Windows and cloud-only agents are not supported by this credential
flow. There is no plaintext fallback. `auth logout` removes the saved key; revoke it in Settings
to disable it on the server too. Existing local `PKMN_CONFIG_DIR` configurations remain compatible.

For another deployment, pass its exact HTTPS origin:

```sh
pocket-folio auth login --origin https://folio.nakazawa.tech
pocket-folio auth status
```

HTTP is accepted only for localhost development. Redirects are refused. Credentials are scoped
to the selected origin. Configure the deployment in your terminal; agents should not change it.

Ask your agent: “Use Pocket Folio to show my binders and the cards I still need.” Then try
“Mark my Japanese VS Raikou as purchased.” Ambiguous editions must be resolved before changes.

## Commands

```sh
pocket-folio --help
pocket-folio --version
pocket-folio catalog search Raikou --set vs --language ja
pocket-folio collection
pocket-folio changes preview commands.json --out plan.json
pocket-folio changes apply plan.json
pocket-folio api
```

The [API reference](skills/pocket-folio/references/api.md) describes commands and permissions.
Preview is read-only; apply uses the exact account, origin, key, revision, and operation IDs in
the saved plan. Retry the same plan after a network failure; preview again after a revision
conflict. Changes are audited and appear live in the app.

The [skill](skills/pocket-folio/SKILL.md) and reference are bundled, so installing a skill requires
no network access. Installing the same version is a no-op. A differing skill requires
`--replace`, which keeps the previous directory under `../pocket-folio-skill-backups/` outside
the agent's skill search directory. Re-run installation after updating the npm package.

## Develop and publish

This package lives in the app's Vite+ workspace but doesn't import the app or require its database.
From the repository root:

```sh
vp run test:agent-package
vp run test:api  # optional integration with the local app and OS credential store
node packages/pocket-folio/cli/pocket-folio.mjs --help
```

The package test packs and installs a tarball into a temporary directory and runs its executable
outside the checkout. It checks included files and skill installation without publishing or
touching your real agent configuration.

For a release, update this package's version, then run from the repository root:

```sh
vpr ship
```

This builds the app, runs fast checks, unit tests and the standalone package test, then publishes
only `@nkzw/pocket-folio`. A failure stops publication; the app is not deployed.
For API/auth changes, also run `vp run test:api` before publishing. It starts a local server if
needed and requires Chrome and an unlocked OS credential store. Run `vp run dev:setup` once
on a fresh checkout.

Use `vp run test:all` for fast checks without a browser. To inspect a tarball:

```sh
vp -C packages/pocket-folio pm pack
```

Publishing is a separate, explicit step requiring access to the `@nkzw` npm scope. No GitHub
repository is required; add a repository URL and provenance when the source is public. The
root app stays private. The npm `files` allowlist contains only the CLI, skill, reference,
README, license and package metadata—no card catalog, scans, database, or credentials.

The public `/agents` guide and Settings commands target the published package; publish version
0.1.0 before deploying that onboarding. Raw public docs are imported directly from this package
by the app, keeping them in sync without a separate generated copy.
