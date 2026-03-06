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

# Score an attack by lethality first, then by raw expected damage.
attack_score(action, units, terrain):
    attacker <- find_unit_by_id(units, action[1])
    target <- find_unit_by_id(units, action[4])
    damage <- attack_damage(attacker, target, terrain)
    lethality <- attack_lethality(target, damage)
    lethality * 100 + damage.

# Lethal attacks should dominate non-lethal ones.
attack_lethality(target, damage | target[4] - damage <= 0):
    1.

attack_lethality(_, _):
    0.

# Choose the highest-value attack from the available attack list.
best_attack(items, _, _, current, _ | len(items) = 0):
    current.

best_attack(a <~ [rest], units, terrain, current, _ | len(current) = 0):
    best_attack(rest, units, terrain, a, attack_score(a, units, terrain)).

best_attack(a <~ [rest], units, terrain, current, current_score | attack_score(a, units, terrain) > current_score):
    best_attack(rest, units, terrain, a, attack_score(a, units, terrain)).

best_attack(_ <~ [rest], units, terrain, current, current_score):
    best_attack(rest, units, terrain, current, current_score).

# Main AI entrypoint: attack first, otherwise advance toward the player.
ai_pick_action([turn, status, turn_count, terrain, units] | status != STATUS_PLAYING):
    [].

ai_pick_action([turn, status, turn_count, terrain, units]):
    actions <- collect_actions(units, [turn, status, turn_count, terrain, units], turn)
    attacks <- filter_action_kind(actions, ACTION_ATTACK)
    ai_pick_from_actions([turn, status, turn_count, terrain, units], attacks, actions).

# Prefer the best legal attack; otherwise fall back to best movement.
ai_pick_from_actions([turn, status, turn_count, terrain, units], attacks, _ | len(attacks) > 0):
    best_attack(attacks, units, terrain, [], -1).

ai_pick_from_actions([turn, status, turn_count, terrain, units], attacks, actions | len(attacks) = 0):
    moves <- filter_action_kind(actions, ACTION_MOVE)
    enemies <- units_for_side(units, other_side(turn))
    fallback <- best_move(moves, enemies, [], MAX_SCORE)
    choose_fallback_action(fallback).

# Convert an empty AI fallback into an explicit wait action.
choose_fallback_action(action | len(action) = 0):
    [ACTION_WAIT, 0, 0, 0, 0].

choose_fallback_action(action):
    action.
