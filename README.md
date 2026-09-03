<div align="center">

# 📜 whatstalks

**Send a movie script to a WhatsApp contact, line by line — just for fun.**

[![npm version](https://img.shields.io/npm/v/whatstalks.svg?color=25D366&label=npm)](https://www.npmjs.com/package/whatstalks)
[![Release](https://github.com/ViniciusDev26/whatstalks/actions/workflows/release.yml/badge.svg)](https://github.com/ViniciusDev26/whatstalks/actions/workflows/release.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](#license)

</div>

---

`whatstalks` is an interactive CLI that connects to WhatsApp (via [Baileys](https://github.com/WhiskeySockets/Baileys) — no browser needed), lets you **search your contacts**, pick a script, and fires it off one message at a time.

```bash
npx whatstalks
```

## ✨ Features

- 🔌 **Direct WhatsApp connection** — talks to WhatsApp's WebSocket through Baileys; no Puppeteer, no headless Chromium.
- 🔍 **Searchable contact picker** — pick a recipient from your contact list (or type a raw number).
- 🎬 **Choose your script** — any `.txt` in `talks/` shows up in the menu.
- 📊 **Live progress** — a spinner while connecting and a progress bar while sending.
- 🔒 **Persistent login** — scan the QR once; the session is cached under `auth/`.

## 🚀 Usage

```bash
npx whatstalks
```

1. **Scan the QR code** shown in your terminal (WhatsApp → *Linked devices* → *Link a device*). This only happens the first time.
2. **Search and select** the contact you want to message.
3. **Pick a script** to send.
4. **Confirm**, then watch the progress bar do its thing.

> [!NOTE]
> Your contact list is delivered by WhatsApp on the **first** login and cached in `auth/contacts.json`. If the picker is empty, delete the `auth/` folder and re-scan — or just type the phone number (with country code) directly.

## 🎥 Add your own scripts

Drop a plain-text file into [`talks/`](./talks) — one line per message:

```
talks/
├── shrek.txt
└── your-movie.txt   ← add this, it appears in the menu automatically
```

No code changes needed.

## 🛠️ Development

```bash
git clone https://github.com/ViniciusDev26/whatstalks.git
cd whatstalks
mise install        # Node 24 (or use your own Node ≥ 24)
npm install

npm run build       # compile src/ → dist/
npm start           # run the compiled CLI
npm run dev         # tsc --watch
npm test            # run the Vitest suite
```

### Architecture

The messaging backend sits behind a small **adapter port** (`WhatsAppAdapter`), so the transport is swappable:

```
src/
├── index.ts                     # interactive CLI (inquirer + ora + cli-progress)
├── main.ts                      # domain helpers: list/load scripts, send loop
├── contact-search.ts            # contact filtering + manual-number fallback
└── adapters/
    ├── whatsapp-adapter.ts      # the port (interface)
    ├── baileys-adapter.ts       # Baileys implementation (default)
    └── jid.ts                   # phone ↔ JID helpers
```

## 🤝 Contributing

Commits follow [**Conventional Commits**](https://www.conventionalcommits.org) — releases are automated with [semantic-release](https://semantic-release.gitbook.io):

| Prefix | Effect |
| --- | --- |
| `feat:` | minor release |
| `fix:` | patch release |
| `feat!:` / `BREAKING CHANGE:` | major release |
| `chore:` `ci:` `test:` `docs:` | no release |

## ⚠️ Disclaimer

This is a **for-fun** project. Automating WhatsApp is against its Terms of Service, and blasting hundreds of messages can get your number rate-limited or banned. Only send to people who are in on the joke, and use at your own risk.

## License

[ISC](https://opensource.org/licenses/ISC) © [Carlos Vinicius Lopes](https://github.com/ViniciusDev26)
