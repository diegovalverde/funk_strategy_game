const BOARD_SIZE = 8;
const CELL_SIZE = 80;

const initialState = {
  turn: "red",
  units: [
    { id: "r1", side: "red", x: 1, y: 1, hp: 10 },
    { id: "r2", side: "red", x: 2, y: 1, hp: 10 },
    { id: "b1", side: "blue", x: 5, y: 6, hp: 10 },
    { id: "b2", side: "blue", x: 6, y: 6, hp: 10 },
  ],
};

const state = {
  game: structuredClone(initialState),
  selected: null,
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const selectionEl = document.getElementById("selection");

canvas.addEventListener("click", onBoardClick);

render();

function onBoardClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);
  const unit = state.game.units.find((item) => item.x === x && item.y === y);

  state.selected = unit ? { x, y, unitId: unit.id } : { x, y, unitId: null };
  selectionEl.textContent = JSON.stringify(state.selected, null, 2);
  statusEl.textContent = unit
    ? `Selected ${unit.id}. Funk move queries will plug in here.`
    : `Tile ${x},${y} selected. No unit on tile.`;
  render();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawSelection();
  drawUnits();
}

function drawGrid() {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const dark = (x + y) % 2 === 1;
      ctx.fillStyle = dark ? "#b9c7a4" : "#e5edd8";
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawSelection() {
  if (!state.selected) {
    return;
  }
  ctx.strokeStyle = "#ffb703";
  ctx.lineWidth = 4;
  ctx.strokeRect(
    state.selected.x * CELL_SIZE + 2,
    state.selected.y * CELL_SIZE + 2,
    CELL_SIZE - 4,
    CELL_SIZE - 4,
  );
}

function drawUnits() {
  for (const unit of state.game.units) {
    const cx = unit.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = unit.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.fillStyle = unit.side === "red" ? "#c44949" : "#3d6cc9";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f7f3e8";
    ctx.font = "600 16px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(unit.id.toUpperCase(), cx, cy);
  }
}
