/**
 * `libsignal` (bundled by Baileys) writes session-lifecycle chatter directly to
 * `console.info` / `console.warn`, bypassing Baileys' logger. That floods the
 * CLI with lines like `Closing session: SessionEntry { ... }`. This module can
 * filter out that specific noise while leaving all other output intact.
 */
export const SIGNAL_NOISE: RegExp[] = [
  /^Closing session:/,
  /^Opening session:/,
  /^Migrating session to:/,
  /^Removing old closed session:/,
  /^Session already (closed|open)/,
  /^Closing open session in favor of/,
];

/** Whether a console call's arguments match known libsignal session noise. */
export function isSignalNoise(args: unknown[]): boolean {
  const first = args[0];
  return typeof first === 'string' && SIGNAL_NOISE.some((re) => re.test(first));
}

/**
 * Wrap `console.info` / `console.warn` so libsignal's session chatter is
 * dropped. Idempotent-safe to call once before creating a Baileys socket.
 */
export function installSignalLogFilter(): void {
  for (const method of ['info', 'warn'] as const) {
    const original = console[method].bind(console);
    console[method] = ((...args: unknown[]) => {
      if (isSignalNoise(args)) return;
      original(...args);
    }) as typeof console.info;
  }
}
