# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`whatstalks` is a published npm CLI (`npx whatstalks`) that sends a movie script, line by line, to a chosen WhatsApp recipient — a for-fun tool. TypeScript, ES modules (`"type": "module"`), compiled with `tsc`.

## Commands

- `npm run build` — compile `src/**/*.ts` → `dist/` via `tsc`.
- `npm run dev` — `tsc --watch` incremental compile.
- `npm start` — run the compiled CLI (`node dist/index.js`).
- Node version is pinned to 24 via `mise.toml` (`mise install` to provision).
- No test suite (`npm test` is a stub that exits 1) and no linter configured.

## Architecture

Source lives in `src/`, compiles to `dist/` (gitignored).

- `src/index.ts` — the **interactive CLI shell** (`#!/usr/bin/env node`, shebang preserved by tsc). Owns all UX and the flow order: figlet banner → **connect first** (`ora` spinner, QR if needed) → load contacts → `@inquirer/prompts` `search` to pick a recipient from the contact list (typing a phone number offers a "manual number" option, so it works even with an empty contact list) → `select` a talk script → `confirm` → `cli-progress` bar for the send. Ctrl-C at a prompt surfaces as `ExitPromptError` and exits cleanly.
- `src/main.ts` — transport-agnostic **domain helpers** (no UX): `listScripts()` (talk names under `talks/`), `loadScript(name)` (non-empty lines), and `sendScript(adapter, recipient, lines, onProgress?)` (assumes an already-connected adapter; sends each line with a 100ms delay, calling `onProgress(sent, total)`).
- `src/adapters/` — the **adapter (ports & adapters) pattern**:
  - `whatsapp-adapter.ts` — the port: `interface WhatsAppAdapter { connect(); listContacts(): Promise<Contact[]>; sendMessage(recipient, text); disconnect(); }` plus the `Contact` type (`{ id: jid, name?, number }`). `recipient` semantics are adapter-specific.
  - `baileys-adapter.ts` — the backend. Uses [`baileys`](https://www.npmjs.com/package/baileys) to talk to WhatsApp's WebSocket directly (no browser). Session persisted under `auth/` via `useMultiFileAuthState`; Baileys' pino logger is silenced so it doesn't spam the CLI. QR handling: pass `onQr(qr)` in the constructor options to render it yourself (the CLI does this to pause the spinner); otherwise it prints via `qrcode-terminal`. Recipient is a **phone number** (digits + country code, no `+`) or a full JID, normalized to `<digits>@s.whatsapp.net`.

  **Contacts**: WhatsApp only delivers the full contact list during the *first* login's history sync (`messaging-history.set`); reconnects skip it. The adapter therefore captures contacts from the sync + `contacts.upsert`/`update` events and **persists them to `auth/contacts.json`**, seeding from that file on later runs. `listContacts()` returns the cache immediately when non-empty, else waits up to `contactSyncTimeoutMs` (default 8s) for a first sync. An existing pre-cache session shows 0 contacts until the user deletes `auth/` and re-scans (or a contact update happens to fire).

To add another backend, implement `WhatsAppAdapter` and construct it in `src/index.ts` instead of `BaileysAdapter`.

Talk scripts live in `talks/*.txt` at the repo root, resolved from the compiled module as `join(__dirname, '..', 'talks', ...)`. The CLI lists them dynamically — dropping a new `.txt` there makes it selectable, no code change.

## Fragility to know about

- **Baileys** is pinned to a `7.0.0-rc*` prerelease; the API can shift between RCs. The `auth/` folder holds live session credentials — it is gitignored and must never be committed.

## Publishing

Published to npm as `whatstalks` / `@viniciusdev26/whatstalks` (`publishConfig.access: public`). `prepublishOnly` runs the build; only `dist/` and `talks/` are shipped (`files` field). `bin` points at `dist/index.js`.
