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

## Next Steps
1. Define the JS/Funk state and action encoding.
2. Add a minimal browser UI that can render a board.
3. Add Funk entrypoints for game state initialization and action application.
4. Connect the browser shell to the Funk runtime.
