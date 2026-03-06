use common

# Find a unit record by its stable unit id.
find_unit_by_id(items, _ | len(items) = 0):
    [].

find_unit_by_id(u <~ [rest], unit_id | u[0] = unit_id):
    u.

find_unit_by_id(_ <~ [rest], unit_id):
    find_unit_by_id(rest, unit_id).

# Find the unit standing on a specific tile.
find_unit_by_xy(items, _, _ | len(items) = 0):
    [].

find_unit_by_xy(u <~ [rest], x, y | u[2] = x /\ u[3] = y):
    u.

find_unit_by_xy(_ <~ [rest], x, y):
    find_unit_by_xy(rest, x, y).

# Count how many living units remain for one side.
count_side(items, _ | len(items) = 0):
    0.

count_side(u <~ [rest], side | u[1] = side):
    1 + count_side(rest, side).

count_side(_ <~ [rest], side):
    count_side(rest, side).

# Convert surviving unit counts into the public game status code.
winner_status(units | count_side(units, SIDE_BLUE) = 0):
    STATUS_RED_WIN.

winner_status(units | count_side(units, SIDE_RED) = 0):
    STATUS_BLUE_WIN.

winner_status(_):
    STATUS_PLAYING.

# Filter the unit list down to one side.
units_for_side(items, _ | len(items) = 0):
    [].

units_for_side(u <~ [rest], side | u[1] = side):
    u ~> [units_for_side(rest, side)].

units_for_side(_ <~ [rest], side):
    units_for_side(rest, side).

# Move one unit to a new tile while leaving the rest untouched.
move_unit(items, _, _, _ | len(items) = 0):
    [].

move_unit(u <~ [rest], unit_id, x, y | u[0] = unit_id):
    updated <- [u[0], u[1], x, y, u[4], u[5], u[6], u[7]]
    updated ~> [move_unit(rest, unit_id, x, y)].

move_unit(u <~ [rest], unit_id, x, y):
    u ~> [move_unit(rest, unit_id, x, y)].

# Apply attack damage and remove a unit if its hp reaches zero.
damage_units(items, _, _ | len(items) = 0):
    [].

damage_units(u <~ [rest], target_id, damage | u[0] = target_id /\ u[4] - damage > 0):
    updated <- [u[0], u[1], u[2], u[3], u[4] - damage, u[5], u[6], u[7]]
    updated ~> [damage_units(rest, target_id, damage)].

damage_units(u <~ [rest], target_id, damage | u[0] = target_id):
    damage_units(rest, target_id, damage).

damage_units(u <~ [rest], target_id, damage):
    u ~> [damage_units(rest, target_id, damage)].
