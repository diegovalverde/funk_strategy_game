import initWasm, { call_function } from './pkg/funk_wasm.js';

const CELL_SIZE = 120;
const BOARD_SIZE = 6;

const SIDE_RED = 1;
const SIDE_BLUE = 2;

const STATUS_PLAYING = 0;
const STATUS_RED_WIN = 1;
const STATUS_BLUE_WIN = 2;

const ACTION_MOVE = 1;
const ACTION_ATTACK = 2;
const ACTION_WAIT = 3;

const TERRAIN_PLAIN = 0;
const TERRAIN_FOREST = 1;
const TERRAIN_WALL = 2;

const UNIT_SKINS = {
  11: { label: 'V', name: 'Vanguard' },
  12: { label: 'A', name: 'Archer' },
  21: { label: 'V', name: 'Vanguard' },
  22: { label: 'A', name: 'Archer' },
};

const ui = {
  canvas: document.getElementById('board'),
  status: document.getElementById('status'),
  turn: document.getElementById('turn'),
  selection: document.getElementById('selection'),
  roster: document.getElementById('roster'),
  log: document.getElementById('log'),
  reset: document.getElementById('reset'),
  endTurn: document.getElementById('end-turn'),
};

const ctx = ui.canvas.getContext('2d');

const state = {
  bytecode: null,
  game: null,
  selectedUnitId: null,
  availableActions: [],
  busy: false,
  log: [],
  effects: [],
  effectTimer: null,
};

ui.canvas.addEventListener('click', onBoardClick);
ui.reset.addEventListener('click', resetGame);
ui.endTurn.addEventListener('click', onEndTurnClick);

boot().catch((error) => {
  setStatus(`Startup failed: ${String(error)}`);
  appendLog(`boot error: ${String(error)}`);
});

async function boot() {
  setStatus('Loading Funk WASM runtime...');
  await initWasm();
  const response = await fetch('./game.fkb');
  if (!response.ok) {
    throw new Error(`failed to fetch game bytecode: ${response.status}`);
  }
  state.bytecode = new Uint8Array(await response.arrayBuffer());
  setStatus('Runtime ready. Initializing battle...');
  resetGame();
}

function resetGame() {
  try {
    state.game = callGame('init_game');
    state.selectedUnitId = null;
    state.availableActions = [];
    state.log = [];
    clearEffects();
    appendLog('battle reset');
    appendLog('forest tiles reduce incoming damage by 1');
    syncUi();
  } catch (error) {
    setStatus(`Reset failed: ${String(error)}`);
    appendLog(`reset error: ${String(error)}`);
  }
}

async function runAiTurn() {
  if (state.busy || !state.game || gameStatus(state.game) !== STATUS_PLAYING) {
    return;
  }
  if (currentSide(state.game) !== SIDE_BLUE) {
    appendLog('AI turn skipped: blue is not active');
    return;
  }

  state.busy = true;
  syncUi();
  await delay(180);

  try {
    const action = callGame('ai_pick_action', [state.game]);
    appendLog(`AI ${describeAction(action)}`);
    transitionGame(action, 'ai');
  } catch (error) {
    appendLog(`AI error: ${String(error)}`);
  } finally {
    state.selectedUnitId = null;
    state.availableActions = [];
    state.busy = false;
    syncUi();
  }
}

function onEndTurnClick() {
  if (!state.game || state.busy || gameStatus(state.game) !== STATUS_PLAYING) {
    return;
  }
  if (currentSide(state.game) === SIDE_RED) {
    const action = [ACTION_WAIT, 0, 0, 0, 0];
    appendLog('player ends the turn');
    transitionGame(action, 'player');
    state.selectedUnitId = null;
    state.availableActions = [];
    syncUi();
    if (currentSide(state.game) === SIDE_BLUE) {
      runAiTurn();
    }
    return;
  }
  runAiTurn();
}

async function onBoardClick(event) {
  if (!state.game || state.busy || gameStatus(state.game) !== STATUS_PLAYING) {
    return;
  }

  const { x, y } = boardPoint(event);
  const unit = findUnitAt(state.game, x, y);
  const current = currentSide(state.game);

  if (current === SIDE_BLUE) {
    appendLog('Blue is AI-controlled. Use "Force AI Turn" or finish your move.');
    return;
  }

  const directAction = findActionAt(x, y);
  if (directAction) {
    applyPlayerAction(directAction);
    return;
  }

  if (unit && unit.side === current) {
    selectUnit(unit.id, x, y);
    return;
  }

  state.selectedUnitId = null;
  state.availableActions = [];
  syncUi();
}

function applyPlayerAction(action) {
  try {
    appendLog(`player ${describeAction(action)}`);
    transitionGame(action, 'player');
    state.selectedUnitId = null;
    state.availableActions = [];
    syncUi();
    if (currentSide(state.game) === SIDE_BLUE && gameStatus(state.game) === STATUS_PLAYING) {
      runAiTurn();
    }
  } catch (error) {
    appendLog(`action error: ${String(error)}`);
    syncUi();
  }
}

function selectUnit(unitId, x, y) {
  state.selectedUnitId = unitId;
  state.availableActions = callGame('selected_actions', [state.game, x, y]);
  appendLog(`selected unit ${unitId}`);
  syncUi();
}

function callGame(functionName, args = []) {
  const result = call_function(state.bytecode, functionName, args, 2_000_000, 64 * 1024, false);
  if (!result.ok) {
    const error = result.error ? `${result.error.code}: ${result.error.message}` : 'unknown error';
    throw new Error(`${functionName} failed: ${error}`);
  }
  return parseValue(result.return_value);
}

function parseValue(input) {
  const text = String(input ?? '').trim();
  if (text === '[]') {
    return [];
  }
  if (text === '()' || text === '') {
    return null;
  }
  if (text[0] !== '[') {
    return Number(text);
  }
  let index = 0;

  function skip() {
    while (index < text.length && /\s/.test(text[index])) {
      index += 1;
    }
  }

  function parseNumber() {
    const start = index;
    if (text[index] === '-') {
      index += 1;
    }
    while (index < text.length && /[0-9]/.test(text[index])) {
      index += 1;
    }
    return Number(text.slice(start, index));
  }

  function parseList() {
    const out = [];
    index += 1;
    skip();
    if (text[index] === ']') {
      index += 1;
      return out;
    }
    while (index < text.length) {
      out.push(parseAny());
      skip();
      if (text[index] === ',') {
        index += 1;
        skip();
        continue;
      }
      if (text[index] === ']') {
        index += 1;
        break;
      }
    }
    return out;
  }

  function parseAny() {
    skip();
    if (text[index] === '[') {
      return parseList();
    }
    return parseNumber();
  }

  return parseAny();
}

function syncUi() {
  render();
  const side = currentSide(state.game);
  const status = gameStatus(state.game);

  if (status === STATUS_RED_WIN) {
    setStatus('Red wins.');
  } else if (status === STATUS_BLUE_WIN) {
    setStatus('Blue wins.');
  } else if (state.busy) {
    setStatus('Blue AI is deciding...');
  } else {
    setStatus(side === SIDE_RED ? 'Red turn. Select a unit.' : 'Blue turn.');
  }

  ui.turn.textContent = statusLabel(status, side);
  ui.selection.textContent = selectionText();
  ui.roster.innerHTML = rosterHtml();
  ui.log.textContent = state.log.join('\n');
}

function render() {
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
  drawBoard();
  drawActionHints();
  drawUnits();
  drawEffects();
  drawHudFrame();
}

function drawBoard() {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const terrain = terrainAt(state.game, x, y);
      ctx.fillStyle = terrainColor(terrain, x, y);
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = 'rgba(36, 44, 35, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawActionHints() {
  for (const action of state.availableActions) {
    const x = action[2];
    const y = action[3];
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;

    if (action[0] === ACTION_MOVE) {
      ctx.fillStyle = 'rgba(58, 139, 94, 0.24)';
      ctx.fillRect(x * CELL_SIZE + 10, y * CELL_SIZE + 10, CELL_SIZE - 20, CELL_SIZE - 20);
      ctx.strokeStyle = '#1f6b44';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * CELL_SIZE + 10, y * CELL_SIZE + 10, CELL_SIZE - 20, CELL_SIZE - 20);
    }

    if (action[0] === ACTION_ATTACK) {
      ctx.fillStyle = 'rgba(182, 54, 54, 0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8f1f1f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const selected = selectedUnit(state.game, state.selectedUnitId);
  if (!selected) {
    return;
  }
  ctx.strokeStyle = '#f4ae2b';
  ctx.lineWidth = 5;
  ctx.strokeRect(selected.x * CELL_SIZE + 6, selected.y * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12);
}

function drawUnits() {
  for (const unit of allUnits(state.game)) {
    const cx = unit.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = unit.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.fillStyle = unit.side === SIDE_RED ? '#af4331' : '#285d9f';
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 9, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff8e7';
    ctx.font = '700 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(UNIT_SKINS[unit.id]?.label ?? 'U', cx, cy - 1);

    ctx.fillStyle = '#151515';
    ctx.fillRect(unit.x * CELL_SIZE + 16, unit.y * CELL_SIZE + 86, CELL_SIZE - 32, 12);
    ctx.fillStyle = unit.side === SIDE_RED ? '#efb09f' : '#a6caef';
    ctx.fillRect(unit.x * CELL_SIZE + 18, unit.y * CELL_SIZE + 88, Math.max(0, ((CELL_SIZE - 36) * unit.hp) / unit.maxHp), 8);
  }
}

function drawHudFrame() {
  ctx.strokeStyle = 'rgba(61, 48, 20, 0.45)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, ui.canvas.width - 8, ui.canvas.height - 8);
}

function drawEffects() {
  const now = performance.now();
  const active = [];
  for (const effect of state.effects) {
    const age = now - effect.startedAt;
    if (age >= effect.durationMs) {
      continue;
    }
    const progress = age / effect.durationMs;
    const alpha = 1 - progress;
    const lift = progress * 26;
    const x = effect.x * CELL_SIZE + CELL_SIZE / 2;
    const y = effect.y * CELL_SIZE + CELL_SIZE / 2 - lift;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 28px Georgia, serif';
    ctx.fillStyle = effect.kind === 'damage' ? '#8f1f1f' : effect.kind === 'defeat' ? '#2a2014' : '#1f6b44';
    ctx.strokeStyle = 'rgba(255, 248, 231, 0.85)';
    ctx.lineWidth = 6;
    ctx.strokeText(effect.text, x, y);
    ctx.fillText(effect.text, x, y);
    ctx.restore();
    active.push(effect);
  }
  state.effects = active;
  if (state.effects.length > 0) {
    scheduleEffectRender();
  }
}

function boardPoint(event) {
  const rect = ui.canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * BOARD_SIZE);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * BOARD_SIZE);
  return { x, y };
}

function currentSide(game) {
  return Array.isArray(game) ? game[0] : SIDE_RED;
}

function gameStatus(game) {
  return Array.isArray(game) ? game[1] : STATUS_PLAYING;
}

function terrainAt(game, x, y) {
  const terrain = Array.isArray(game?.[2]) ? game[2] : [];
  const entry = terrain.find((tile) => tile[0] === x && tile[1] === y);
  return entry ? entry[2] : TERRAIN_PLAIN;
}

function allUnits(game) {
  const units = Array.isArray(game?.[3]) ? game[3] : [];
  return units.map(([id, side, x, y, hp, move, range, attack]) => ({
    id,
    side,
    x,
    y,
    hp,
    maxHp: id === 11 || id === 21 ? 8 : 6,
    move,
    range,
    attack,
  }));
}

function findUnitAt(game, x, y) {
  return allUnits(game).find((unit) => unit.x === x && unit.y === y) ?? null;
}

function selectedUnit(game, unitId) {
  if (!unitId) {
    return null;
  }
  return allUnits(game).find((unit) => unit.id === unitId) ?? null;
}

function findActionAt(x, y) {
  return state.availableActions.find((action) => action[2] === x && action[3] === y) ?? null;
}

function transitionGame(action, actorLabel) {
  const previous = state.game;
  const next = callGame('apply_action', [state.game, action]);
  state.game = next;
  enqueueEffects(previous, next, action, actorLabel);
}

function statusLabel(status, side) {
  if (status === STATUS_RED_WIN) {
    return 'Outcome: Red victory';
  }
  if (status === STATUS_BLUE_WIN) {
    return 'Outcome: Blue victory';
  }
  return `Active side: ${side === SIDE_RED ? 'Red' : 'Blue'}`;
}

function selectionText() {
  const unit = selectedUnit(state.game, state.selectedUnitId);
  if (!unit) {
    return 'None';
  }
  const skin = UNIT_SKINS[unit.id];
  const actions = state.availableActions.map((action) => describeAction(action)).join('\n');
  return [
    `${skin?.name ?? 'Unit'} #${unit.id}`,
    `Side: ${unit.side === SIDE_RED ? 'Red' : 'Blue'}`,
    `Tile: ${unit.x},${unit.y}`,
    `Terrain: ${terrainName(terrainAt(state.game, unit.x, unit.y))}`,
    `HP: ${unit.hp}/${unit.maxHp}`,
    `Move: ${unit.move}`,
    `Range: ${unit.range}`,
    `Attack: ${unit.attack}`,
    '',
    actions || 'No legal actions',
  ].join('\n');
}

function rosterHtml() {
  const units = allUnits(state.game);
  const activeSide = currentSide(state.game);
  return [SIDE_RED, SIDE_BLUE]
    .map((side) => {
      const sideUnits = units.filter((unit) => unit.side === side);
      const title = side === SIDE_RED ? 'Red squad' : 'Blue squad';
      const sideClass = side === SIDE_RED ? 'roster-side-red' : 'roster-side-blue';
      const body = sideUnits.length > 0
        ? sideUnits.map((unit) => rosterItemHtml(unit, activeSide)).join('')
        : '<div class="roster-item"><div class="roster-meta">Defeated</div></div>';
      return `<section class="roster-side ${sideClass}"><h3>${title}</h3><div class="roster-list">${body}</div></section>`;
    })
    .join('');
}

function rosterItemHtml(unit, activeSide) {
  const skin = UNIT_SKINS[unit.id];
  const classes = ['roster-item'];
  if (unit.side === activeSide) {
    classes.push('roster-item-active');
  }
  if (unit.id === state.selectedUnitId) {
    classes.push('roster-item-selected');
  }
  return [
    `<article class="${classes.join(' ')}">`,
    `<div class="roster-row"><span class="roster-name">${skin?.name ?? 'Unit'} #${unit.id}</span><span>${unit.hp}/${unit.maxHp} HP</span></div>`,
    `<div class="roster-row roster-meta"><span>${terrainName(terrainAt(state.game, unit.x, unit.y))}</span><span>${unit.x},${unit.y}</span></div>`,
    `<div class="roster-row roster-meta"><span>Move ${unit.move}</span><span>Range ${unit.range} | ATK ${unit.attack}</span></div>`,
    '</article>',
  ].join('');
}

function describeAction(action) {
  if (!Array.isArray(action) || action.length === 0) {
    return 'does nothing';
  }
  if (action[0] === ACTION_MOVE) {
    return `moves unit ${action[1]} to ${action[2]},${action[3]}`;
  }
  if (action[0] === ACTION_WAIT) {
    return 'waits';
  }
  return `attacks target ${action[4]} with unit ${action[1]} at ${action[2]},${action[3]}`;
}

function enqueueEffects(previous, next, action, actorLabel) {
  clearEffects();
  const prevUnits = allUnits(previous);
  const nextUnits = allUnits(next);

  if (action[0] === ACTION_MOVE) {
    pushEffect({ x: action[2], y: action[3], text: actorLabel === 'ai' ? 'ADVANCE' : 'MOVE', kind: 'move' });
    return;
  }

  if (action[0] === ACTION_WAIT) {
    pushEffect({
      x: actorLabel === 'ai' ? 4 : 1,
      y: actorLabel === 'ai' ? 1 : 4,
      text: 'WAIT',
      kind: 'move',
    });
    return;
  }

  if (action[0] !== ACTION_ATTACK) {
    return;
  }

  const before = prevUnits.find((unit) => unit.id === action[4]) ?? null;
  const after = nextUnits.find((unit) => unit.id === action[4]) ?? null;
  if (!before) {
    return;
  }
  const damage = after ? before.hp - after.hp : before.hp;
  pushEffect({ x: before.x, y: before.y, text: `-${damage}`, kind: 'damage' });
  if (!after) {
    pushEffect({ x: before.x, y: before.y, text: 'KO', kind: 'defeat' });
  }
}

function pushEffect(effect) {
  state.effects.push({
    ...effect,
    startedAt: performance.now(),
    durationMs: effect.kind === 'defeat' ? 1050 : 820,
  });
  scheduleEffectRender();
}

function clearEffects() {
  state.effects = [];
  if (state.effectTimer !== null) {
    cancelAnimationFrame(state.effectTimer);
    state.effectTimer = null;
  }
}

function scheduleEffectRender() {
  if (state.effectTimer !== null) {
    return;
  }
  state.effectTimer = requestAnimationFrame(() => {
    state.effectTimer = null;
    render();
  });
}

function terrainColor(terrain, x, y) {
  if (terrain === TERRAIN_FOREST) {
    return (x + y) % 2 === 0 ? '#9bb78e' : '#88a77b';
  }
  if (terrain === TERRAIN_WALL) {
    return (x + y) % 2 === 0 ? '#6f655b' : '#61574d';
  }
  return (x + y) % 2 === 0 ? '#efe5bf' : '#e4d7ab';
}

function terrainName(terrain) {
  if (terrain === TERRAIN_FOREST) {
    return 'Forest (+1 defense)';
  }
  if (terrain === TERRAIN_WALL) {
    return 'Wall';
  }
  return 'Plain';
}

function setStatus(message) {
  ui.status.textContent = message;
}

function appendLog(line) {
  state.log = [...state.log.slice(-8), line];
  ui.log.textContent = state.log.join('\n');
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
