# [2.1.0](https://github.com/ViniciusDev26/whatstalks/compare/v2.0.1...v2.1.0) (2026-09-03)


### Features

* add --version/--help flags, cross-platform config dir, embedded talks ([173f211](https://github.com/ViniciusDev26/whatstalks/commit/173f21102599d0c953ceabe435dff1dec957d73c))

## [2.0.1](https://github.com/ViniciusDev26/whatstalks/compare/v2.0.0...v2.0.1) (2026-09-03)


### Bug Fixes

* correct invalid bin alias and repository url ([019f705](https://github.com/ViniciusDev26/whatstalks/commit/019f7050e33c65c7e3a73f77ee0373d4f1305dd4))

# [2.0.0](https://github.com/ViniciusDev26/whatstalks/compare/v1.0.6...v2.0.0) (2026-09-03)


* feat!: rewrite as an interactive TypeScript CLI powered by Baileys ([b641497](https://github.com/ViniciusDev26/whatstalks/commit/b6414979ee4a298aad7fe259a3f7f0946d6fe8f5))


### BREAKING CHANGES

* requires Node.js >= 24; recipients are chosen from your
WhatsApp contacts (or entered as a phone number with country code)
instead of the old contact-name prompt, and messages are sent through
Baileys rather than WhatsApp Web browser automation.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
