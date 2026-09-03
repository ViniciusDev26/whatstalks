import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Per-user config directory for whatstalks, cross-platform:
 * - Windows: %APPDATA%\whatstalks
 * - macOS/Linux: $XDG_CONFIG_HOME/whatstalks or ~/.config/whatstalks
 *
 * Keeps session state out of the current working directory so a globally
 * installed binary behaves the same wherever it's launched from.
 *
 * `env` and `platform` are injectable for testing; they default to the process.
 */
export function configDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string {
  if (platform === 'win32' && env.APPDATA) return join(env.APPDATA, 'whatstalks');
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, 'whatstalks');
  return join(homedir(), '.config', 'whatstalks');
}

/** Directory where the WhatsApp session (Baileys auth + contact cache) lives. */
export function authDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string {
  return join(configDir(env, platform), 'auth');
}
