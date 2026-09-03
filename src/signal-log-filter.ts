/**
 * `libsignal` (bundled by Baileys) writes session-lifecycle chatter directly to
 * `console.info` / `console.warn`, bypassing Baileys' logger. That floods the
 * CLI with lines like `Closing session: SessionEntry { ... }`. This side-effect
 * module filters out that specific noise and leaves all other output intact.
 *
 * Import it once (for its side effect) before creating a Baileys socket.
 */
const SIGNAL_NOISE: RegExp[] = [
  /^Closing session:/,
  /^Opening session:/,
  /^Migrating session to:/,
  /^Removing old closed session:/,
  /^Session already (closed|open)/,
  /^Closing open session in favor of/,
];

function isSignalNoise(args: unknown[]): boolean {
  const first = args[0];
  return typeof first === 'string' && SIGNAL_NOISE.some((re) => re.test(first));
}

for (const method of ['info', 'warn'] as const) {
  const original = console[method].bind(console);
  console[method] = ((...args: unknown[]) => {
    if (isSignalNoise(args)) return;
    original(...args);
  }) as typeof console.info;
}
