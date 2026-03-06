use common

# Board bounds check for any tile lookup or move probe.
in_bounds(x, y | x >= 0 /\ x < BOARD_W /\ y >= 0 /\ y < BOARD_H):
    1.

in_bounds(_, _):
    0.

# Read terrain metadata for a tile, defaulting to plain ground.
terrain_at(items, _, _ | len(items) = 0):
    TERRAIN_PLAIN.

terrain_at(t <~ [rest], x, y | t[0] = x /\ t[1] = y):
    t[2].

terrain_at(_ <~ [rest], x, y):
    terrain_at(rest, x, y).

# Detect whether another unit already occupies a tile.
tile_has_unit(items, _, _, _ | len(items) = 0):
    0.

tile_has_unit(u <~ [rest], unit_id, x, y | u[0] != unit_id /\ u[2] = x /\ u[3] = y):
    1.

tile_has_unit(_ <~ [rest], unit_id, x, y):
    tile_has_unit(rest, unit_id, x, y).

# Decide whether a unit can step onto a tile this turn.
tile_walkable(terrain, units, unit_id, x, y | in_bounds(x, y) = 1 /\ terrain_at(terrain, x, y) != TERRAIN_WALL /\ tile_has_unit(units, unit_id, x, y) = 0):
    1.

tile_walkable(_, _, _, _, _):
    0.

# Test whether a tile coordinate has already been visited by BFS.
contains_pos(items, _, _ | len(items) = 0):
    0.

contains_pos(p <~ [rest], x, y | p[0] = x /\ p[1] = y):
    1.

contains_pos(_ <~ [rest], x, y):
    contains_pos(rest, x, y).

# Enumerate the four orthogonal neighbor tiles around a position.
neighbor_positions(x, y):
    [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].

# Keep only unvisited, walkable neighbor positions.
filter_walkable(items, _, _, _, _ | len(items) = 0):
    [].

filter_walkable(p <~ [rest], terrain, units, unit_id, visited | tile_walkable(terrain, units, unit_id, p[0], p[1]) = 1 /\ contains_pos(visited, p[0], p[1]) = 0):
    p ~> [filter_walkable(rest, terrain, units, unit_id, visited)].

filter_walkable(_ <~ [rest], terrain, units, unit_id, visited):
    filter_walkable(rest, terrain, units, unit_id, visited).

# Annotate positions with the BFS depth used to reach them.
positions_to_nodes(items, _ | len(items) = 0):
    [].

positions_to_nodes(p <~ [rest], steps):
    node <- [p[0], p[1], steps]
    node ~> [positions_to_nodes(rest, steps)].

# Breadth-first flood fill for reachable move tiles.
flood(queue, _, _, _, _, _, acc | len(queue) = 0):
    acc.

flood(n <~ [queue], terrain, units, unit_id, max_steps, visited, acc | n[2] >= max_steps):
    flood(queue, terrain, units, unit_id, max_steps, visited, acc).

flood(n <~ [queue], terrain, units, unit_id, max_steps, visited, acc):
    next_positions <- filter_walkable(neighbor_positions(n[0], n[1]), terrain, units, unit_id, visited)
    next_nodes <- positions_to_nodes(next_positions, n[2] + 1)
    flood([queue] ++ [next_nodes], terrain, units, unit_id, max_steps, [visited] ++ [next_positions], [acc] ++ [next_positions]).

# Public move-range query used by action generation.
reachable_tiles([_, _, _, terrain, units], unit):
    flood([[unit[2], unit[3], 0]], terrain, units, unit[0], unit[5], [[unit[2], unit[3]]], []).
