# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`whatstalks` is a published npm CLI (`npx whatstalks`) that sends a movie script, line by line, to a chosen WhatsApp recipient — a for-fun tool. TypeScript, ES modules (`"type": "module"`), compiled with `tsc`.

## Commands

- `npm run build` — compile `src/**/*.ts` → `dist/` via `tsc`.
- `npm run dev` — `tsc --watch` incremental compile.
- `npm start` — run the compiled CLI (`node dist/index.js`).
- `npm test` — run the Vitest suite once (`vitest run`); `npm run test:watch` for watch mode. Run a single file with `npx vitest run test/jid.test.ts`.
- Node version is pinned to 24 via `mise.toml` (`mise install` to provision). No linter configured.

## Architecture

Source lives in `src/`, compiles to `dist/` (gitignored).

- `src/index.ts` — the **interactive CLI shell** (`#!/usr/bin/env node`, shebang preserved by tsc). Handles `--version`/`--help` (via `cli.ts`) up front, then owns all UX and the flow order: figlet banner → **connect first** (`ora` spinner, QR if needed) → load contacts → `@inquirer/prompts` `search` to pick a recipient from the contact list (typing a phone number offers a "manual number" option, so it works even with an empty contact list) → `select` a talk script → `confirm` → `cli-progress` bar for the send. Ctrl-C at a prompt surfaces as `ExitPromptError` and exits cleanly.
- `src/cli.ts` — pure CLI helpers: `parseFlag(arg)`, `resolveVersion(injected, reader)`, `helpText(version, sessionPath)`. Version comes from a build-time `__WHATSTALKS_VERSION__` define (for binaries) or falls back to reading `package.json`.
- `src/paths.ts` — `configDir()` / `authDir()`: cross-platform per-user config dir (`%APPDATA%` on Windows, `$XDG_CONFIG_HOME` or `~/.config` elsewhere). `env`/`platform` are injectable for tests. The CLI passes `authDir()` to the adapter so session state lives outside the CWD.
- `src/main.ts` — transport-agnostic **domain helpers** (no UX): `listScripts()` / `loadScript(name)` read the **embedded** `TALKS` (see below), and `sendScript(adapter, recipient, lines, onProgress?, delayMs?)` sends each line (100ms default throttle; tests pass `0`) via an already-connected adapter, calling `onProgress(sent, total)`.
- `src/adapters/` — the **adapter (ports & adapters) pattern**:
  - `whatsapp-adapter.ts` — the port: `interface WhatsAppAdapter { connect(); listContacts(): Promise<Contact[]>; sendMessage(recipient, text); disconnect(); }` plus the `Contact` type (`{ id: jid, name?, number }`). `recipient` semantics are adapter-specific.
  - `baileys-adapter.ts` — the backend. Uses [`baileys`](https://www.npmjs.com/package/baileys) to talk to WhatsApp's WebSocket directly (no browser). Session persisted under `auth/` via `useMultiFileAuthState`; Baileys' pino logger is silenced so it doesn't spam the CLI. QR handling: pass `onQr(qr)` in the constructor options to render it yourself (the CLI does this to pause the spinner); otherwise it prints via `qrcode-terminal`. Recipient is a **phone number** (digits + country code, no `+`) or a full JID, normalized to `<digits>@s.whatsapp.net`.

  **Contacts**: WhatsApp only delivers the full contact list during the *first* login's history sync (`messaging-history.set`); reconnects skip it. The adapter therefore captures contacts from the sync + `contacts.upsert`/`update` events and **persists them to `auth/contacts.json`**, seeding from that file on later runs. `listContacts()` returns the cache immediately when non-empty, else waits up to `contactSyncTimeoutMs` (default 8s) for a first sync. An existing pre-cache session shows 0 contacts until the user deletes `auth/` and re-scans (or a contact update happens to fire).

To add another backend, implement `WhatsAppAdapter` and construct it in `src/index.ts` instead of `BaileysAdapter`.

Talk scripts live in `talks/*.txt` at the repo root (the source of truth). `scripts/embed-talks.mjs` generates `src/talks.generated.ts` (a `TALKS: Record<string, string[]>` of non-empty lines), run via `prebuild` and `pretest`. `main.ts` reads that embedded map — no filesystem access at runtime — so a single-file binary works without shipping `talks/`. Drop a new `.txt` in `talks/` and it's picked up on the next build/test; `src/talks.generated.ts` is gitignored.

## Fragility to know about

- **Baileys** is pinned to a `7.0.0-rc*` prerelease; the API can shift between RCs. The `auth/` folder holds live session credentials — it is gitignored and must never be committed.

## Testing

Vitest, tests under `test/*.test.ts`. **New functions must ship with unit tests.**
To keep units pure and testable, extract logic out of the CLI/adapter side-effect
code into a plain module and test that (don't test `index.ts`/adapters directly —
importing them triggers side effects). Current tested modules:
- `src/adapters/jid.ts` — JID normalization (`toJid`, `jidToNumber`, `isUserJid`).
- `src/contact-search.ts` — `buildRecipientChoices` / `contactLabel` (the search
  filter + manual-number fallback), imported by `index.ts`.
- `src/signal-log-filter.ts` — exports `isSignalNoise` + `installSignalLogFilter`.
- `src/cli.ts` — `parseFlag` / `resolveVersion` / `helpText` (the `--version`/`--help` logic).
- `src/paths.ts` — `configDir` / `authDir` (inject `env`/`platform` to test each branch).
- `src/main.ts` `sendScript` takes a `delayMs` (default 100; tests pass `0`) and
  any `WhatsAppAdapter`, so a fake adapter can assert what got sent.

When adding behavior, prefer putting the logic in one of these pure modules and
having `index.ts` / `baileys-adapter.ts` just wire it up.

## CI/CD

- `.github/workflows/ci.yml` — build + `npm test` on PRs and non-main pushes.
- `.github/workflows/release.yml` — on push to `main`: build, test, then
  `npx semantic-release`.
- **semantic-release** (`.releaserc.json`) drives versioning/publishing from
  **conventional-commit** messages (see the convention below). It computes the
  version, creates the GitHub release + `vX.Y.Z` tag, and commits `CHANGELOG.md`
  + version bump back to `main`.
- **Publishing uses npm trusted publishing (OIDC) — no `NPM_TOKEN`.** The npm
  plugin is set to `npmPublish: false` (it only bumps the version); the actual
  publish is done by `@semantic-release/npm`'s replacement, the `@semantic-release/exec`
  plugin running `npm publish --provenance` in the publish step. This works
  because the workflow has `id-token: write` and the npm package is configured
  with a **Trusted Publisher** pointing at `ViniciusDev26/whatstalks` → `release.yml`.
  The workflow updates npm to the latest (OIDC needs npm ≥ 11.5.1). Only
  `GITHUB_TOKEN` (auto-provided) is needed as a secret.
- The baseline tag `v1.0.6` marks the last manual release so the first automated
  version continues from there (avoids colliding with versions already on npm).

## Commit message convention (REQUIRED)

Releases are triggered entirely by commit messages, so **every commit must follow
[Conventional Commits](https://www.conventionalcommits.org)**:

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

Version impact when merged to `main`:

| Type / marker | Example | Release |
| --- | --- | --- |
| `feat:` | `feat: add contact search picker` | minor (1.1.0) |
| `fix:` | `fix: normalize numbers with a leading +` | patch (1.0.1) |
| `feat!:` / `fix!:` or a `BREAKING CHANGE:` footer | `feat!: require Node 24` | major (2.0.0) |
| `perf:` | `perf: batch contact writes` | patch |
| `chore:` `ci:` `test:` `docs:` `refactor:` `style:` `build:` | `test: cover jid helpers` | **no release** |

Rules:
- Keep the description imperative and lowercase, no trailing period.
- Use a scope when it helps: `feat(baileys): ...`, `fix(cli): ...`.
- A commit that should never publish (tests, tooling, docs) must use a
  no-release type — otherwise a stray `feat:`/`fix:` cuts a new version.
- For a breaking change, add either `!` after the type or a `BREAKING CHANGE:`
  footer describing the migration.

> The `Co-Authored-By` trailer this repo appends to commits is fine — semantic
> release only reads the header line and `BREAKING CHANGE:` footers.

## Publishing

Published to npm as `whatstalks` / `@viniciusdev26/whatstalks` (`publishConfig.access: public`). `prepublishOnly` runs the build; only `dist/` and `talks/` are shipped (`files` field). `bin` points at `dist/index.js`. Publishing is automated via the release workflow above (trusted publishing / OIDC) — avoid manual `npm publish`.
