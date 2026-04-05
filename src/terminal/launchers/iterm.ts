import { execSync, spawn } from "child_process";
import { TerminalLauncher, LaunchOptions } from "../types.js";

export class ITermLauncher implements TerminalLauncher {
  readonly name = "iterm";
  readonly platform: NodeJS.Platform[] = ["darwin"];

  async isAvailable(): Promise<boolean> {
    try {
      execSync("test -d '/Applications/iTerm.app'", { stdio: "ignore" });
      return true;
    } catch {
      try {
        execSync("test -d '/Applications/iTerm2.app'", { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    }
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    // Escape single quotes for AppleScript string embedding
    const escapedDir = workingDirectory.replace(/'/g, "'\\''");
    const escapedCmd = command.replace(/'/g, "'\\''");

    const script = `
tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text "cd '${escapedDir}' && ${escapedCmd}"
  end tell
end tell`;

    spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" }).unref();
  }
}
