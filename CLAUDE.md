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

- `src/index.ts` — CLI entry (`#!/usr/bin/env node`, shebang preserved by tsc). Figlet banner, `readline` prompt for the target phone number, then `main(phone)`.
- `src/main.ts` — transport-agnostic orchestration. `main(recipient, adapter = new BaileysAdapter())` connects the adapter, reads `talks/shrek.txt`, splits on newlines, and sends each line with a 100ms delay, then disconnects.
- `src/adapters/` — the **adapter (ports & adapters) pattern**:
  - `whatsapp-adapter.ts` — the port: `interface WhatsAppAdapter { connect(); sendMessage(recipient, text); disconnect(); }`. `recipient` semantics are adapter-specific.
  - `baileys-adapter.ts` — the backend. Uses [`baileys`](https://www.npmjs.com/package/baileys) to talk to WhatsApp's WebSocket directly (no browser). QR printed to the terminal via `qrcode-terminal`; session persisted under `auth/` via `useMultiFileAuthState`. Recipient is a **phone number** (digits + country code, no `+`), normalized to a `<digits>@s.whatsapp.net` JID.

To add another backend, implement `WhatsAppAdapter` and pass an instance as `main`'s second argument.

Scripts to send live in `talks/*.txt` at the repo root (currently only `shrek.txt`), resolved from the compiled module as `join(__dirname, '..', 'talks', ...)`.

`clear` has no published types; a local ambient declaration lives in `src/types/clear.d.ts`.

## Fragility to know about

- **Baileys** is pinned to a `7.0.0-rc*` prerelease; the API can shift between RCs. The `auth/` folder holds live session credentials — it is gitignored and must never be committed.
- The talk file is hardcoded to `shrek.txt` in `src/main.ts` — sending a different script means editing that path.

## Publishing

Published to npm as `whatstalks` / `@viniciusdev26/whatstalks` (`publishConfig.access: public`). `prepublishOnly` runs the build; only `dist/` and `talks/` are shipped (`files` field). `bin` points at `dist/index.js`.
