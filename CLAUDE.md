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

- `src/index.ts` — the **interactive CLI shell** (`#!/usr/bin/env node`, shebang preserved by tsc). Owns all UX: figlet banner, `@inquirer/prompts` (`input` for the phone with validation, `select` to pick a talk script, `confirm` before sending), an `ora` spinner for the connect/QR phase, and a `cli-progress` bar for the send. Ctrl-C at a prompt surfaces as `ExitPromptError` and exits cleanly.
- `src/main.ts` — transport-agnostic **domain helpers** (no UX): `listScripts()` (talk names under `talks/`), `loadScript(name)` (non-empty lines), and `sendScript(adapter, recipient, lines, onProgress?)` (assumes an already-connected adapter; sends each line with a 100ms delay, calling `onProgress(sent, total)`).
- `src/adapters/` — the **adapter (ports & adapters) pattern**:
  - `whatsapp-adapter.ts` — the port: `interface WhatsAppAdapter { connect(); sendMessage(recipient, text); disconnect(); }`. `recipient` semantics are adapter-specific.
  - `baileys-adapter.ts` — the backend. Uses [`baileys`](https://www.npmjs.com/package/baileys) to talk to WhatsApp's WebSocket directly (no browser). Session persisted under `auth/` via `useMultiFileAuthState`. QR handling: pass `onQr(qr)` in the constructor options to render it yourself (the CLI does this to pause the spinner); otherwise it prints via `qrcode-terminal`. Recipient is a **phone number** (digits + country code, no `+`), normalized to a `<digits>@s.whatsapp.net` JID.

To add another backend, implement `WhatsAppAdapter` and construct it in `src/index.ts` instead of `BaileysAdapter`.

Talk scripts live in `talks/*.txt` at the repo root, resolved from the compiled module as `join(__dirname, '..', 'talks', ...)`. The CLI lists them dynamically — dropping a new `.txt` there makes it selectable, no code change.

## Fragility to know about

- **Baileys** is pinned to a `7.0.0-rc*` prerelease; the API can shift between RCs. The `auth/` folder holds live session credentials — it is gitignored and must never be committed.

## Publishing

Published to npm as `whatstalks` / `@viniciusdev26/whatstalks` (`publishConfig.access: public`). `prepublishOnly` runs the build; only `dist/` and `talks/` are shipped (`files` field). `bin` points at `dist/index.js`.
