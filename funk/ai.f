use common, units, actions

# Score a tile by its nearest enemy using Manhattan distance.
nearest_enemy_distance(enemies, _, _ | len(enemies) = 0):
    MAX_SCORE.

nearest_enemy_distance(enemy <~ [rest], x, y):
    best_distance(rest, x, y, distance(x, y, enemy[2], enemy[3])).

# Fold the minimum distance across all enemy units.
best_distance(items, _, _, best | len(items) = 0):
    best.

best_distance(enemy <~ [rest], x, y, best | distance(x, y, enemy[2], enemy[3]) < best):
    best_distance(rest, x, y, distance(x, y, enemy[2], enemy[3])).

best_distance(_ <~ [rest], x, y, best):
    best_distance(rest, x, y, best).

# Pick the move action that lands closest to any enemy.
best_move(items, _, current, _ | len(items) = 0):
    current.

best_move(a <~ [rest], enemies, current, _ | len(current) = 0):
    best_move(rest, enemies, a, nearest_enemy_distance(enemies, a[2], a[3])).

best_move(a <~ [rest], enemies, current, current_score | nearest_enemy_distance(enemies, a[2], a[3]) < current_score):
    best_move(rest, enemies, a, nearest_enemy_distance(enemies, a[2], a[3])).

best_move(_ <~ [rest], enemies, current, current_score):
    best_move(rest, enemies, current, current_score).

# Main AI entrypoint: attack first, otherwise advance toward the player.
ai_pick_action([turn, status, terrain, units] | status != STATUS_PLAYING):
    [].

ai_pick_action([turn, status, terrain, units]):
    actions <- collect_actions(units, [turn, status, terrain, units], turn)
    attacks <- filter_action_kind(actions, ACTION_ATTACK)
    ai_pick_from_actions([turn, status, terrain, units], attacks, actions).

# Prefer the first legal attack; otherwise fall back to best movement.
ai_pick_from_actions(_, first <~ [rest], _):
    first.

ai_pick_from_actions([turn, status, terrain, units], attacks, actions | len(attacks) = 0):
    moves <- filter_action_kind(actions, ACTION_MOVE)
    enemies <- units_for_side(units, other_side(turn))
    best_move(moves, enemies, [], MAX_SCORE).
