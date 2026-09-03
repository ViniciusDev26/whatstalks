export type CliAction = 'version' | 'help' | 'run';

/** Decide what the CLI should do based on the first argument. */
export function parseFlag(arg: string | undefined): CliAction {
  if (arg === '--version' || arg === '-v') return 'version';
  if (arg === '--help' || arg === '-h') return 'help';
  return 'run';
}

/**
 * Resolve the version to display: a build-time injected value when present
 * (e.g. Bun `--define`), otherwise whatever `readPackageVersion` returns.
 */
export function resolveVersion(
  injected: string | undefined,
  readPackageVersion: () => string
): string {
  return typeof injected === 'string' && injected.length > 0 ? injected : readPackageVersion();
}

/** The text shown for `--help`. */
export function helpText(version: string, sessionPath: string): string {
  return `whatstalks v${version}

Send a movie script to a WhatsApp contact, line by line — for fun.

Usage:
  whatstalks            Start the interactive flow
  whatstalks --version  Print the version
  whatstalks --help     Show this help

On first run, scan the QR code with WhatsApp (Settings > Linked devices).
Session state is stored in ${sessionPath}.`;
}
