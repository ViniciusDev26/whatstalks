# [2.0.0](https://github.com/ViniciusDev26/whatstalks/compare/v1.0.6...v2.0.0) (2026-09-03)


* feat!: rewrite as an interactive TypeScript CLI powered by Baileys ([b641497](https://github.com/ViniciusDev26/whatstalks/commit/b6414979ee4a298aad7fe259a3f7f0946d6fe8f5))


### BREAKING CHANGES

* requires Node.js >= 24; recipients are chosen from your
WhatsApp contacts (or entered as a phone number with country code)
instead of the old contact-name prompt, and messages are sent through
Baileys rather than WhatsApp Web browser automation.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
