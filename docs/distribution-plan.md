# Distribution plan — native binary + package managers

Goal: ship `whatstalks` as a self-contained binary installable via **Homebrew**,
**AUR (yay)**, **Chocolatey**, and **apt** — on top of the existing `npx` flow.

This is a plan, not implemented yet. Work top-to-bottom: the prerequisites and
the binary spike gate everything else.

---

## 0. Prerequisites (do these first — they unblock everything)

### 0.1 Add non-interactive `--version` / `--help` flags
Package managers smoke-test binaries (`brew test`, choco verification) and users
expect them. The CLI is currently interactive-only, so add early flag handling in
`src/index.ts` before any prompt:

```ts
const arg = process.argv[2];
if (arg === '--version' || arg === '-v') { console.log(VERSION); process.exit(0); }
if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
```

`VERSION` should be injected at build time (see 1.2) so it matches the release.

### 0.2 Embed the talk scripts
Today `main.ts` reads `talks/*.txt` from disk relative to `dist/`. A single-file
binary has no `talks/` folder, so embed the scripts at build time. Add
`scripts/embed-talks.mjs` that reads `talks/` and generates
`src/talks.generated.ts`:

```ts
// AUTO-GENERATED — do not edit
export const TALKS: Record<string, string[]> = {
  shrek: ["SHREK", "Written by", /* ...lines... */],
};
```

Then `listScripts()` returns `Object.keys(TALKS)` and `loadScript(name)` returns
`TALKS[name]`. Run the generator in `prebuild`. (Keeps `talks/` as the source of
truth; the generated file is git-ignored and rebuilt.)

### 0.3 Store session state in a stable per-user dir
A globally-installed binary shouldn't drop `auth/` and `qr.png` into the user's
current directory. Switch `BaileysAdapter`'s default `authDir` to an XDG path,
e.g. `~/.config/whatstalks` (or `$XDG_CONFIG_HOME`). One-line change, big UX win
for an installed tool.

---

## 1. Build the binary

Baileys is heavy (bundled libsignal, `pino`, dynamic requires), so **de-risk with
a spike** before wiring CI: build one binary for your platform and confirm it
actually connects and sends. Pick a tool:

### Option A — Bun `--compile` (recommended: best bundler + cross-compile)
```bash
# one Linux/macOS machine can produce every target
bun build src/index.ts --compile --minify \
  --target=bun-linux-x64      --outfile dist/whatstalks-linux-x64
bun build src/index.ts --compile --target=bun-linux-arm64  --outfile dist/whatstalks-linux-arm64
bun build src/index.ts --compile --target=bun-darwin-x64   --outfile dist/whatstalks-darwin-x64
bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile dist/whatstalks-darwin-arm64
bun build src/index.ts --compile --target=bun-windows-x64  --outfile dist/whatstalks-windows-x64.exe
```
Runs the app on Bun's Node-compat layer. **Risk:** a Baileys edge case under Bun —
this is exactly what the spike checks.

### Option B — `@yao-pkg/pkg` (safest for Baileys: real Node runtime)
Maintained fork of the archived `vercel/pkg`. Stays on Node, but needs config for
dynamic deps and assets:
```jsonc
// package.json
"pkg": {
  "targets": ["node22-linux-x64", "node22-macos-arm64", "node22-win-x64"],
  "assets": ["talks/**/*", "node_modules/baileys/**/*"],
  "outputPath": "dist"
}
```
Then `pkg .`. More fiddly, but avoids the Bun-compat unknown.

### 1.2 Inject the version
Pass the release version into the bundle (both tools support a define/replace),
e.g. Bun: `--define VERSION='"2.0.1"'`, so `--version` and the About text match.

---

## 2. CI: build binaries and attach to the GitHub Release

semantic-release already creates the Release + tag. Add a second workflow that
fires **after** a release is published, builds all targets (Bun cross-compiles
from a single Ubuntu runner — no matrix needed), checksums them, and uploads:

```yaml
# .github/workflows/binaries.yml
name: Binaries
on:
  release:
    types: [published]
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: npm ci && npm run build
      - run: node scripts/embed-talks.mjs
      - run: bash scripts/build-binaries.sh "${{ github.event.release.tag_name }}"
      - run: (cd dist && sha256sum whatstalks-* > checksums.txt)
      - run: gh release upload "${{ github.event.release.tag_name }}" dist/whatstalks-* dist/checksums.txt --clobber
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
```

The release assets (per-OS binaries + `checksums.txt`) are what every package
manager below downloads.

---

## 3. Package managers

All four are just a manifest that pulls the right release binary and its sha256.

### 3.1 Homebrew 🍺 (easiest, self-hosted, instant)
Create a **tap** repo `ViniciusDev26/homebrew-whatstalks` with `Formula/whatstalks.rb`:
```ruby
class Whatstalks < Formula
  desc "Send a movie script to a WhatsApp contact, line by line"
  homepage "https://github.com/ViniciusDev26/whatstalks"
  version "2.0.1"
  on_macos do
    on_arm   { url "#{homepage}/releases/download/v#{version}/whatstalks-darwin-arm64"; sha256 "..." }
    on_intel { url "#{homepage}/releases/download/v#{version}/whatstalks-darwin-x64";   sha256 "..." }
  end
  on_linux do
    on_arm   { url "#{homepage}/releases/download/v#{version}/whatstalks-linux-arm64"; sha256 "..." }
    on_intel { url "#{homepage}/releases/download/v#{version}/whatstalks-linux-x64";   sha256 "..." }
  end
  def install
    bin.install Dir["whatstalks-*"].first => "whatstalks"
  end
  test { assert_match version.to_s, shell_output("#{bin}/whatstalks --version") }
end
```
Install: `brew install viniciusdev26/whatstalks/whatstalks`.
Auto-bump on release with the `dawidd6/action-homebrew-bump-formula` action.

### 3.2 AUR / yay (self-hosted, instant)
Package `whatstalks-bin` with a `PKGBUILD` pulling the Linux binary:
```bash
pkgname=whatstalks-bin
pkgver=2.0.1
pkgrel=1
pkgdesc="Send a movie script to a WhatsApp contact, line by line"
arch=('x86_64' 'aarch64')
url="https://github.com/ViniciusDev26/whatstalks"
license=('ISC')
provides=('whatstalks'); conflicts=('whatstalks')
source_x86_64=("$url/releases/download/v$pkgver/whatstalks-linux-x64")
source_aarch64=("$url/releases/download/v$pkgver/whatstalks-linux-arm64")
sha256sums_x86_64=('...'); sha256sums_aarch64=('...')
package() { install -Dm755 "whatstalks-linux-${CARCH/x86_64/x64}" "$pkgdir/usr/bin/whatstalks"; }
```
Also needs `.SRCINFO`. Publish by pushing to the AUR git remote; automate with the
`KSXGitHub/github-actions-deploy-aur` action.

### 3.3 Chocolatey (Windows; community repo has a moderation queue)
`whatstalks.nuspec` + `tools/chocolateyinstall.ps1`:
```powershell
Install-ChocolateyPackage `
  -PackageName 'whatstalks' `
  -FileType 'exe' `
  -Url64 "https://github.com/ViniciusDev26/whatstalks/releases/download/v$($env:ChocolateyPackageVersion)/whatstalks-windows-x64.exe" `
  -Checksum64 '...' -ChecksumType64 'sha256' `
  -SilentArgs '' # then shim it as whatstalks.exe
```
`choco pack` then `choco push` to community.chocolatey.org (expect review latency
on first submit).

### 3.4 apt / .deb (most work — needs a hosted repo)
Build a `.deb` with `fpm`:
```bash
fpm -s dir -t deb -n whatstalks -v 2.0.1 --architecture amd64 \
    --license ISC --description "Send a movie script to a WhatsApp contact" \
    dist/whatstalks-linux-x64=/usr/bin/whatstalks
```
Distribution options, cheapest first:
- **Attach the `.deb` to the GitHub Release** → users `curl -LO ... && sudo dpkg -i`. Zero infra, no `apt install` though.
- **Self-hosted apt repo** via `aptly` (or `reprepro`) published to **GitHub Pages**, GPG-signed → real `apt-get install whatstalks` after adding the repo. Needs a signing key + `sources.list` snippet in the README.
- **Launchpad PPA** — most "official" but geared to source builds; awkward for a prebuilt Node binary.

---

## 4. Keeping manifests in sync per release
After `binaries.yml` uploads assets, chain steps (or a `manifests.yml`) to bump the
version + sha256 in each channel:
- Homebrew → `action-homebrew-bump-formula`
- AUR → `github-actions-deploy-aur`
- Choco → `choco push` in CI
- apt → rebuild `.deb`, re-publish the repo index

## 5. Suggested rollout order
1. Prereqs (§0) + **binary spike** (§1) — prove Baileys survives the bundler.
2. `binaries.yml` (§2) — releases start carrying binaries.
3. **Homebrew** tap (§3.1) — fastest win.
4. **AUR** (§3.2).
5. **Chocolatey** (§3.3).
6. **apt** (§3.4) — last, since it needs hosted-repo infra.

## Open risks
- **Baileys under Bun** — the single biggest unknown; the spike resolves it. If it
  fails, fall back to `@yao-pkg/pkg` (Node runtime).
- **Binary size** — expect 50–100 MB per binary (whole runtime embedded). Fine for
  releases, just noteworthy.
- **Baileys is a `7.0.0-rc` prerelease** — pin it hard before shipping installers so
  a bad RC can't break published binaries.
- **`talks/` licensing** — embedding full movie scripts in a distributed binary is a
  copyright consideration for a public package; worth a glance before shipping.
