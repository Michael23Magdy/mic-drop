import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

export class WarpLauncher implements TerminalLauncher {
  readonly name = "warp";
  readonly platform: NodeJS.Platform[] = ["darwin"];

  async isAvailable(): Promise<boolean> {
    try {
      execSync("test -d /Applications/Warp.app", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    // Write the full claude invocation to a script file so we only need to
    // type a short safe string via AppleScript. AppleScript keystroke cannot
    // reliably type special characters like $, (, ), " that appear in
    // the claude command.
    const scriptPath = path.join(workingDirectory, ".start-claude.sh");
    fs.writeFileSync(scriptPath, `#!/bin/bash\n${command}\n`, { mode: 0o755 });

    // Open Warp in the worktree directory
    spawn("open", ["-a", "Warp", workingDirectory], { detached: true, stdio: "ignore" }).unref();

    // Wait for Warp to open and focus (2s is more reliable than 1s)
    await sleep(2000);

    // Type the short launcher command and press Enter
    const script = [
      `tell application "System Events" to tell process "Warp" to keystroke "bash .start-claude.sh"`,
      `tell application "System Events" to tell process "Warp" to keystroke return`,
    ].join("\n");

    spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" }).unref();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
