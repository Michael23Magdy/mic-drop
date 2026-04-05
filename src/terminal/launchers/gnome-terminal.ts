import { execSync, spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

// Phase 2: Linux GNOME Terminal support
export class GnomeTerminalLauncher implements TerminalLauncher {
  readonly name = "gnome-terminal";
  readonly platform: NodeJS.Platform[] = ["linux"];

  async isAvailable(): Promise<boolean> {
    try {
      execSync("which gnome-terminal", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    spawn(
      "gnome-terminal",
      ["--working-directory", workingDirectory, "--", "bash", "-c", command],
      { detached: true, stdio: "ignore" }
    ).unref();
  }
}
