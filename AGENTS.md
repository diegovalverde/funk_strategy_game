# AGENTS.md

## Project
- Workspace: `/Users/diegovalverdegarro/workspace/projects/funk_strategy_game`
- Goal: build a small browser-based strategy/tactics game where rendering and input stay in JavaScript, and core game logic/state transitions/AI live in Funk running through the browser bytecode + WASM VM pipeline.

## Product Direction
- Start with a small grid tactics prototype, not a full engine.
- Prefer a vertical slice that is playable early.
- Keep the browser UI simple and functional until the Funk game loop is solid.

## Architecture
- JavaScript owns rendering, input, animation, asset loading, and browser integration.
- Funk owns rules, state transitions, move validation, turn handling, pathfinding/search, and AI decision logic.
- The JS/Funk boundary should stay explicit and narrow.
- Prefer pure Funk functions that accept state + action and return new state or query results.

## Initial Scope
- Grid size: start with `6x6` or `8x8`.
- Turn-based only.
- A few unit types at most.
- Simple terrain.
- One AI policy.
- No networking, no realtime simulation, no heavy content pipeline in v1.

## Recommended Funk API Shape
- `init_game()` -> state
- `selected_actions(state, x, y)` -> actions
- `apply_action(state, action)` -> state
- `current_side(state)` -> side
- `game_status(state)` -> status
- `ai_pick_action(state)` -> action

If interop becomes awkward, use flat arrays/lists and tagged tuples instead of trying to model rich objects too early.

## Pathfinding Guidance
- Use Funk for pathfinding.
- Treat the existing `astar.f` in the Funk repo as a useful starting point, not as a final general-purpose implementation.
- For reachable tiles, prefer BFS/flood-fill over A*.
- For single-route target pursuit, A* is acceptable on small boards.
- Keep board sizes and branching factors modest until search behavior is proven.

## Engineering Rules
- Keep game rules deterministic.
- Avoid browser-specific logic inside Funk.
- Keep save/load state serializable.
- Favor simple data formats over elegant but hard-to-debug encodings.
- Build small end-to-end increments and keep the game playable after each milestone.

## Near-Term Milestones
1. Define state/action encoding and the JS <-> Funk contract.
2. Implement board rendering and click selection in JS.
3. Implement Funk state initialization, unit selection, legal moves, and action application.
4. Add a basic enemy AI turn.
5. Add pathfinding/range logic.
6. Polish UI and package as a standalone browser demo.

## Repo Notes
- This folder is intended to become its own git repository.
- Keep dependencies minimal.
- Reuse ideas and selected code patterns from the Funk repo, but do not tightly couple this project layout to the current Funk repo workspace.
