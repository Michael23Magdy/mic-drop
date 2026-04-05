import { execSync, spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

// Phase 2: Linux Konsole (KDE) support
export class KonsoleLauncher implements TerminalLauncher {
  readonly name = "konsole";
  readonly platform: NodeJS.Platform[] = ["linux"];

  async isAvailable(): Promise<boolean> {
    try {
      execSync("which konsole", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    spawn("konsole", ["--workdir", workingDirectory, "-e", command], {
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}
