# Funk Strategy Game

Small browser-based strategy/tactics game prototype.

## Direction
- Rendering and input stay in JavaScript.
- Game rules, state transitions, pathfinding, and AI live in Funk.
- Start with a small, playable vertical slice.

## Planned Layout
- `web/`: browser app shell and rendering.
- `funk/`: Funk gameplay sources.
- `docs/`: design notes and interface contracts.

## First Vertical Slice
- Small grid board.
- Two sides.
- Unit selection.
- Legal move highlighting.
- Move + attack resolution.
- Basic AI turn.

## Local Setup

### Prerequisites
- Python 3.11 with `lark` available for the local Funk compiler.
- Node.js for the browser app.
- `wasm-pack`.
- A `rustup`-managed Rust toolchain.

### Rust setup

This repo expects `rustc` and `cargo` to come from `rustup`, not Homebrew Rust. The clean setup is:

```bash
rustup toolchain install stable
rustup target add wasm32-unknown-unknown --toolchain stable
```

Then make sure your shell resolves `~/.cargo/bin` before `/opt/homebrew/bin`:

```bash
which rustc
which cargo
rustup target list --installed
```

Expected result:
- `rustc` and `cargo` resolve from `~/.cargo/bin`
- `wasm32-unknown-unknown` is installed

### Build and run

```bash
cd web
npm install
npm run build
npm run dev
```

`npm run build` and `npm run dev` do three things:
- compile `funk/game.f` and its helper modules to bytecode
- prepare the `funk_wasm` browser package
- build or serve the Vite frontend

### WASM fallback behavior

If local WASM compilation is unavailable, `scripts/prepare_wasm_pkg.py` falls back to copying a prebuilt `funk_wasm` package from the sibling local Funk repo at `/Users/diegovalverdegarro/workspace/projects/funk`.

That fallback keeps this repo usable on machines where the Rust target is missing, but the preferred setup is still local `rustup` builds.
