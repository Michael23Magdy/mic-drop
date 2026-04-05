import { execSync, spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

// Phase 3: Windows Terminal support
export class WindowsTerminalLauncher implements TerminalLauncher {
  readonly name = "windows-terminal";
  readonly platform: NodeJS.Platform[] = ["win32"];

  async isAvailable(): Promise<boolean> {
    try {
      execSync("where wt", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    spawn("wt", ["-d", workingDirectory, "powershell", "-Command", command], {
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}
