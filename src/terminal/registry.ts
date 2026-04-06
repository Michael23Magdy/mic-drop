import { TerminalLauncher } from "./types.js";
import { FallbackLauncher } from "./fallback.js";
import { WarpLauncher } from "./launchers/warp.js";
import { WarpWindowsLauncher } from "./launchers/warp-windows.js";
import { ITermLauncher } from "./launchers/iterm.js";
import { TerminalAppLauncher } from "./launchers/terminal-app.js";
import { GnomeTerminalLauncher } from "./launchers/gnome-terminal.js";
import { KonsoleLauncher } from "./launchers/konsole.js";
import { WindowsTerminalLauncher } from "./launchers/windows-terminal.js";

const ALL_LAUNCHERS: TerminalLauncher[] = [
  new WarpLauncher(),
  new WarpWindowsLauncher(),
  new ITermLauncher(),
  new TerminalAppLauncher(),
  new GnomeTerminalLauncher(),
  new KonsoleLauncher(),
  new WindowsTerminalLauncher(),
];

const FALLBACK = new FallbackLauncher();

/**
 * Returns the launcher for the given terminal name, or the fallback if unknown.
 * Also respects the current platform — non-platform launchers are skipped.
 */
export function getLauncher(name: string): TerminalLauncher {
  const platform = process.platform as NodeJS.Platform;
  const launcher = ALL_LAUNCHERS.find(
    (l) => l.name === name && l.platform.includes(platform)
  );
  return launcher ?? FALLBACK;
}

/**
 * Returns all launchers that are supported on the current platform and installed.
 * Used by the setup wizard to offer only valid terminal choices.
 */
export async function getAvailableLaunchers(): Promise<TerminalLauncher[]> {
  const platform = process.platform as NodeJS.Platform;
  const platformLaunchers = ALL_LAUNCHERS.filter((l) =>
    l.platform.includes(platform)
  );

  const available: TerminalLauncher[] = [];
  for (const launcher of platformLaunchers) {
    if (await launcher.isAvailable()) {
      available.push(launcher);
    }
  }
  return available;
}
