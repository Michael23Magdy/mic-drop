export interface LaunchOptions {
  workingDirectory: string;
  /** The full shell command to run, e.g. claude --permission-mode plan "$(cat .ticket.md)" */
  command: string;
}

export interface TerminalLauncher {
  readonly name: string;
  /** Platforms this launcher supports, e.g. ['darwin'] */
  readonly platform: NodeJS.Platform[];
  /** Returns true if this terminal app is installed and available */
  isAvailable(): Promise<boolean>;
  /** Opens the terminal in workingDirectory and runs command */
  launch(options: LaunchOptions): Promise<void>;
}
