# MultiverseOS

MultiverseOS is a local-first experiment management layer for Claude Code that automatically collects development events via hooks and organizes them into Verses (experiment recipes bound to git branches) with a Timeline UI.

## Quick Start

```bash
pnpm install
pnpm -r build
```

## Usage

Initialize a verse in your project:
```bash
verse init
```

Start the Timeline UI server:
```bash
verse serve
verse ui
```

Create and manage verses:
```bash
verse create <name>           # Create new verse
verse list                    # List all verses
verse show <name>             # Show verse details
verse fork <name> <new-name>  # Fork a verse
verse diff <verse1> <verse2>  # Compare verses
```

## Architecture

See `docs/design/2026-03-25-mvp-architecture.md` for detailed architecture and design decisions.
