import { TerminalLauncher, LaunchOptions } from "./types.js";
import { logger } from "../utils/logger.js";

export class FallbackLauncher implements TerminalLauncher {
  readonly name = "fallback";
  readonly platform: NodeJS.Platform[] = ["darwin", "linux", "win32"];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async launch({ workingDirectory, command }: LaunchOptions): Promise<void> {
    logger.warn("Could not auto-launch a terminal. Run these commands manually:");
    console.log(`\n    cd ${workingDirectory}`);
    console.log(`    ${command}\n`);
  }
}
