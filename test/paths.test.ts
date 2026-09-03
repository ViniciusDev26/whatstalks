import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { configDir, authDir } from '../src/paths.js';

describe('configDir', () => {
  it('uses %APPDATA% on Windows', () => {
    const env = { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' } as NodeJS.ProcessEnv;
    expect(configDir(env, 'win32')).toBe(join('C:\\Users\\me\\AppData\\Roaming', 'whatstalks'));
  });

  it('falls back to ~/.config on Windows when APPDATA is unset', () => {
    expect(configDir({} as NodeJS.ProcessEnv, 'win32')).toBe(
      join(homedir(), '.config', 'whatstalks')
    );
  });

  it('uses $XDG_CONFIG_HOME when set (non-Windows)', () => {
    const env = { XDG_CONFIG_HOME: '/home/me/.xdg' } as NodeJS.ProcessEnv;
    expect(configDir(env, 'linux')).toBe(join('/home/me/.xdg', 'whatstalks'));
  });

  it('falls back to ~/.config on macOS/Linux without XDG_CONFIG_HOME', () => {
    expect(configDir({} as NodeJS.ProcessEnv, 'linux')).toBe(
      join(homedir(), '.config', 'whatstalks')
    );
    expect(configDir({} as NodeJS.ProcessEnv, 'darwin')).toBe(
      join(homedir(), '.config', 'whatstalks')
    );
  });

  it('ignores XDG_CONFIG_HOME on Windows when APPDATA is present', () => {
    const env = {
      APPDATA: 'C:\\AppData',
      XDG_CONFIG_HOME: '/should/not/win',
    } as NodeJS.ProcessEnv;
    expect(configDir(env, 'win32')).toBe(join('C:\\AppData', 'whatstalks'));
  });
});

describe('authDir', () => {
  it('is the auth subfolder of configDir', () => {
    const env = { XDG_CONFIG_HOME: '/home/me/.xdg' } as NodeJS.ProcessEnv;
    expect(authDir(env, 'linux')).toBe(join(configDir(env, 'linux'), 'auth'));
    expect(authDir(env, 'linux')).toBe(join('/home/me/.xdg', 'whatstalks', 'auth'));
  });
});
