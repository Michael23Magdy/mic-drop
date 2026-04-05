import { spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

export class TerminalAppLauncher implements TerminalLauncher {
  readonly name = "terminal";
  readonly platform: NodeJS.Platform[] = ["darwin"];

  async isAvailable(): Promise<boolean> {
    // Terminal.app is always available on macOS
    return process.platform === "darwin";
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    // Escape single quotes for AppleScript string embedding
    const escapedDir = workingDirectory.replace(/'/g, "'\\''");
    const escapedCmd = command.replace(/'/g, "'\\''");

    const script = `
tell application "Terminal"
  activate
  do script "cd '${escapedDir}' && ${escapedCmd}"
end tell`;

    spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" }).unref();
  }
}
