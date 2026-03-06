# Architecture

## Core Split
- JavaScript owns rendering, input, animation, and browser integration.
- Funk owns deterministic gameplay logic.

## Intended Runtime Shape
- JS gathers user input.
- JS calls into Funk runtime functions.
- Funk returns state snapshots or query results.
- JS renders from returned state.

## Initial Funk Boundary
- `init_game()` -> state
- `selected_actions(state, x, y)` -> actions
- `apply_action(state, action)` -> state
- `current_side(state)` -> side
- `game_status(state)` -> status
- `ai_pick_action(state)` -> action

## Data Model Notes
- Prefer simple, explicit lists/arrays first.
- Avoid rich nested encodings until interop constraints are known.
- Keep state serializable and deterministic.

## Pathfinding
- Reachability should likely use BFS/flood-fill.
- Single-target pursuit can use A*.
- The existing Funk `astar` style is a useful starting point, but not a finished general-purpose implementation.
