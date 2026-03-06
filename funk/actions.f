use common, board, units

# Turn reachable tiles into encoded move actions.
move_actions(items, _ | len(items) = 0):
    [].

move_actions(p <~ [rest], unit):
    action <- [ACTION_MOVE, unit[0], p[0], p[1], 0]
    action ~> [move_actions(rest, unit)].

# Turn in-range enemy units into encoded attack actions.
attack_actions(items, _ | len(items) = 0):
    [].

attack_actions(target <~ [rest], unit | target[1] != unit[1] /\ distance(unit[2], unit[3], target[2], target[3]) <= unit[6]):
    action <- [ACTION_ATTACK, unit[0], target[2], target[3], target[0]]
    action ~> [attack_actions(rest, unit)].

attack_actions(_ <~ [rest], unit):
    attack_actions(rest, unit).

# Forest tiles reduce incoming damage by one point.
terrain_defense_bonus(terrain, x, y | terrain_at(terrain, x, y) = TERRAIN_FOREST):
    1.

terrain_defense_bonus(_, _, _):
    0.

# Clamp combat damage so every successful hit still matters.
clamp_damage(damage | damage < 1):
    1.

clamp_damage(damage):
    damage.

# Compute attack damage after terrain mitigation.
attack_damage(attacker, target, terrain):
    raw_damage <- attacker[7] - terrain_defense_bonus(terrain, target[2], target[3])
    clamp_damage(raw_damage).

# Query every legal action for the unit on a clicked tile.
selected_actions([turn, status, turn_count, terrain, units], _, _ | status != STATUS_PLAYING):
    [].

selected_actions([turn, status, turn_count, terrain, units], x, y):
    unit <- find_unit_by_xy(units, x, y)
    selected_actions_for_unit([turn, status, turn_count, terrain, units], unit).

# Reject empty selections and off-turn units before generating actions.
selected_actions_for_unit(_, unit | len(unit) = 0):
    [].

selected_actions_for_unit([turn, status, turn_count, terrain, units], unit | unit[1] != turn):
    [].

selected_actions_for_unit([turn, status, turn_count, terrain, units], unit):
    [move_actions(reachable_tiles([turn, status, turn_count, terrain, units], unit), unit)] ++ [attack_actions(units, unit)].

# Compare two encoded actions field by field.
action_eq(a, b | a[0] = b[0] /\ a[1] = b[1] /\ a[2] = b[2] /\ a[3] = b[3] /\ a[4] = b[4]):
    1.

action_eq(_, _):
    0.

# Membership test for an action in a generated legal-action list.
contains_action(items, _ | len(items) = 0):
    0.

contains_action(a <~ [rest], wanted | action_eq(a, wanted) = 1):
    1.

contains_action(_ <~ [rest], wanted):
    contains_action(rest, wanted).

# Validate an action against the current game state.
action_valid([turn, status, turn_count, terrain, units], _ | status != STATUS_PLAYING):
    0.

action_valid([turn, status, turn_count, terrain, units], action | action[0] = ACTION_WAIT):
    1.

action_valid([turn, status, turn_count, terrain, units], action):
    unit <- find_unit_by_id(units, action[1])
    action_valid_for_unit([turn, status, turn_count, terrain, units], unit, action).

# Reject actions whose actor is missing or belongs to the wrong side.
action_valid_for_unit(_, unit, _ | len(unit) = 0):
    0.

action_valid_for_unit([turn, status, turn_count, terrain, units], unit, _ | unit[1] != turn):
    0.

action_valid_for_unit([turn, status, turn_count, terrain, units], unit, action):
    contains_action(selected_actions([turn, status, turn_count, terrain, units], unit[2], unit[3]), action).

# Apply an action and leave invalid requests untouched.
apply_action([turn, status, turn_count, terrain, units], action | action_valid([turn, status, turn_count, terrain, units], action) = 0):
    [turn, status, turn_count, terrain, units].

apply_action([turn, status, turn_count, terrain, units], action):
    updated <- apply_action_inner([turn, status, turn_count, terrain, units], action)
    finalize_turn(updated).

# Dispatch to the concrete move or attack state transition.
apply_action_inner([turn, status, turn_count, terrain, units], action | action[0] = ACTION_MOVE):
    [turn, status, turn_count, terrain, move_unit(units, action[1], action[2], action[3])].

apply_action_inner([turn, status, turn_count, terrain, units], action | action[0] = ACTION_WAIT):
    [turn, status, turn_count, terrain, units].

apply_action_inner([turn, status, turn_count, terrain, units], action):
    attacker <- find_unit_by_id(units, action[1])
    target <- find_unit_by_id(units, action[4])
    damage <- attack_damage(attacker, target, terrain)
    [turn, status, turn_count, terrain, damage_units(units, action[4], damage)].

# Update winner state and advance the turn if the match is still live.
finalize_turn([turn, status, turn_count, terrain, units]):
    next_turn_count <- turn_count + 1
    result <- resolve_status(units, next_turn_count)
    next_turn <- next_turn(result, turn)
    [next_turn, result, next_turn_count, terrain, units].

# Determine whether the game ended by elimination or by turn cap.
resolve_status(units, turn_count | winner_status(units) != STATUS_PLAYING):
    winner_status(units).

resolve_status(_, turn_count | turn_count >= MAX_TURNS):
    STATUS_DRAW.

resolve_status(_, _):
    STATUS_PLAYING.

# Keep the acting side on wins; otherwise hand control to the opponent.
next_turn(STATUS_PLAYING, turn):
    other_side(turn).

next_turn(_, turn):
    turn.

# Collect all legal actions for one side across its living units.
collect_actions(items, _, _ | len(items) = 0):
    [].

collect_actions(u <~ [rest], state, side | u[1] = side):
    [selected_actions(state, u[2], u[3])] ++ [collect_actions(rest, state, side)].

collect_actions(_ <~ [rest], state, side):
    collect_actions(rest, state, side).

# Keep only one action kind from a mixed action list.
filter_action_kind(items, _ | len(items) = 0):
    [].

filter_action_kind(a <~ [rest], kind | a[0] = kind):
    a ~> [filter_action_kind(rest, kind)].

filter_action_kind(_ <~ [rest], kind):
    filter_action_kind(rest, kind).
