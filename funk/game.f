use common, actions, ai

# Build the initial scenario state consumed by the browser.
init_game():
    terrain <- [[2, 1, TERRAIN_FOREST], [4, 1, TERRAIN_FOREST], [1, 4, TERRAIN_FOREST], [3, 4, TERRAIN_FOREST], [2, 2, TERRAIN_WALL], [3, 2, TERRAIN_WALL], [2, 3, TERRAIN_WALL]]
    units <- [[11, SIDE_RED, 0, 4, 8, 3, 1, 3], [12, SIDE_RED, 1, 5, 6, 2, 2, 2], [21, SIDE_BLUE, 5, 1, 8, 3, 1, 3], [22, SIDE_BLUE, 4, 0, 6, 2, 2, 2]]
    [SIDE_RED, STATUS_PLAYING, terrain, units].
