BOARD_W <-> 6
BOARD_H <-> 6

SIDE_RED <-> 1
SIDE_BLUE <-> 2

STATUS_PLAYING <-> 0
STATUS_RED_WIN <-> 1
STATUS_BLUE_WIN <-> 2

ACTION_MOVE <-> 1
ACTION_ATTACK <-> 2
ACTION_WAIT <-> 3

TERRAIN_PLAIN <-> 0
TERRAIN_FOREST <-> 1
TERRAIN_WALL <-> 2

MAX_SCORE <-> 999

# Swap the active side after a completed turn.
other_side(SIDE_RED):
    SIDE_BLUE.

other_side(_):
    SIDE_RED.

# Small local absolute-value helper for distance math.
abs(n | n < 0):
    0 - n.

abs(n):
    n.

# Manhattan distance on the board grid.
distance(x1, y1, x2, y2):
    abs(x1 - x2) + abs(y1 - y2).

# Extract the side whose turn it is from the game state.
current_side([turn, _, _, _]):
    turn.

# Extract the current win/ongoing status from the game state.
game_status([_, status, _, _]):
    status.
