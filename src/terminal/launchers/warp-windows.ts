import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

export class WarpWindowsLauncher implements TerminalLauncher {
  readonly name = "warp";
  readonly platform: NodeJS.Platform[] = ["win32"];

  async isAvailable(): Promise<boolean> {
    try {
      execSync("where warp-terminal", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    // Write the command to a script file — same approach as macOS.
    // Warp on Windows runs bash (via Git Bash / WSL), so .sh works.
    const scriptPath = path.join(workingDirectory, ".start-claude.sh");
    fs.writeFileSync(scriptPath, `#!/bin/bash\n${command}\n`);

    // Open Warp in the worktree directory
    spawn("warp-terminal", ["--working-directory", workingDirectory], {
      detached: true,
      stdio: "ignore",
      shell: true,
    }).unref();

    // Wait for Warp to open and focus
    await sleep(2000);

    // Use PowerShell SendKeys to type the launch command — mirrors the macOS AppleScript approach
    const psScript = [
      `Add-Type -AssemblyName System.Windows.Forms`,
      `[System.Windows.Forms.SendKeys]::SendWait("bash .start-claude.sh{ENTER}")`,
    ].join("; ");

    spawn("powershell", ["-NoProfile", "-Command", psScript], {
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
