# Contributing to mic-drop

Contributions are welcome and appreciated — whether that's a bug report, a feature idea, or a pull request.

## Reporting Issues

If something isn't working, please [open an issue](https://github.com/Michael23Magdy/mic-drop/issues). Include:

- Your OS and version (macOS 14, Ubuntu 22.04, Windows 11, etc.)
- The terminal app you're using (Warp, iTerm2, Terminal.app, GNOME Terminal, etc.)
- The AI CLI tool configured (`claude`, `gemini`, etc.)
- The full error output or unexpected behaviour you saw
- Steps to reproduce

### A note on platform coverage

mic-drop runs on macOS, Linux, and Windows, and supports a range of terminal apps — each with its own quirks around automation, shell integration, and launch behaviour. Issues are more likely on less-tested combinations.

**Well tested:** macOS + Warp terminal. If you're on a different setup and hit a problem, please report it — that's genuinely useful signal.

## Contributing Code

1. Fork the repository
2. Create a branch from `main` for your change
3. Make your changes — keep them focused and minimal
4. Run `npm run build` and `npm test` to make sure nothing is broken
5. Open a pull request with a clear description of what you changed and why

There's no contribution too small. Fixes for specific terminal/OS combinations, better error messages, or documentation improvements are all fair game.

## Ideas for Contributions

- Support or improve behaviour for a terminal app or OS you use
- Better error messages for common failure modes
- Test coverage for untested launchers or edge cases
- Improvements to the setup wizard flow

## Development Setup

```bash
git clone https://github.com/Michael23Magdy/mic-drop.git
cd mic-drop
npm install
npm run build      # compile TypeScript → dist/
npm run dev        # watch mode
npm run test       # run tests
npm install -g .   # install locally to test the CLI
```
