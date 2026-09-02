const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");
const STORAGE_KEY = "pixelArt:last";

let gridWidth = 32;
let gridHeight = 32;
let cellSize = 18;
let grid = [];
let currentColor = "#000000";
let currentTool = "pen";
let currentMode = "draw";
let currentAnchor = "center";
let traceOverlay = null;
let traceOffsetX = 0;
let traceOffsetY = 0;
let traceOpacity = 0.3;
let isDrawing = false;
let hoveredCell = null;
let selectedRow = null;
let undoStack = [];
let redoStack = [];
let GUIDE_PADDING = 52;
let gridOriginX = 0;
let gridOriginY = 0;

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#ff8800",
  "#8800ff",
  "#888888",
  "#553322",
  "#ff6688",
  "#88ff66",
  "#6688ff",
  "#ffcc00",
];

const COLOR_NAMES = [
  "Black",
  "White",
  "Red",
  "Lime",
  "Blue",
  "Yellow",
  "Magenta",
  "Cyan",
  "Orange",
  "Purple",
  "Gray",
  "Brown",
  "Pink",
  "Light Green",
  "Cornflower Blue",
  "Gold",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createEmptyGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill("#ffffff"));
}

function cloneGrid(sourceGrid) {
  return sourceGrid.map((row) => [...row]);
}

function syncGridInputs() {
  const widthInput = document.getElementById("grid-width");
  const heightInput = document.getElementById("grid-height");
  const presetSelect = document.getElementById("grid-size");

  if (widthInput) widthInput.value = String(gridWidth);
  if (heightInput) heightInput.value = String(gridHeight);
  if (presetSelect) {
    const presetValue = String(gridWidth);
    if (Array.from(presetSelect.options).some((option) => option.value === presetValue)) {
      presetSelect.value = presetValue;
    } else {
      presetSelect.value = "custom";
    }
  }
}

function updateCanvasMetrics() {
  const guideSpace = 140;
  cellSize = 44;
  gridOriginX = 70;
  gridOriginY = 70;
  canvas.width = gridWidth * cellSize + guideSpace;
  canvas.height = gridHeight * cellSize + guideSpace;
}

function saveArtworkToLocalStorage() {
  try {
    const payload = {
      version: 1,
      gridWidth,
      gridHeight,
      grid,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save artwork to localStorage", error);
  }
}

function deleteSavedArtwork() {
  const confirmed = window.confirm(
    "Delete the saved artwork permanently? This cannot be undone.",
  );
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  gridWidth = 32;
  gridHeight = 32;
  grid = createEmptyGrid(gridWidth, gridHeight);
  undoStack = [];
  redoStack = [];
  selectedRow = null;
  syncGridInputs();
  updateCanvasMetrics();
  render();
}

function restoreArtworkFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const payload = JSON.parse(raw);
    const savedWidth = Number(payload.gridWidth) || 0;
    const savedHeight = Number(payload.gridHeight) || 0;
    const savedGrid = Array.isArray(payload.grid) ? payload.grid : [];

    if (!savedGrid.length || savedWidth <= 0 || savedHeight <= 0) {
      return;
    }

    const nextGrid = createEmptyGrid(savedWidth, savedHeight);
    for (let row = 0; row < savedHeight; row++) {
      for (let col = 0; col < savedWidth; col++) {
        nextGrid[row][col] = savedGrid[row]?.[col] || "#ffffff";
      }
    }

    gridWidth = savedWidth;
    gridHeight = savedHeight;
    grid = nextGrid;
    syncGridInputs();
  } catch (error) {
    console.warn("Failed to restore artwork from localStorage", error);
  }
}

function applyGridSize(nextWidth, nextHeight, { preserveArtwork = true, anchor = currentAnchor } = {}) {
  const safeWidth = clamp(Number(nextWidth) || gridWidth, 8, 200);
  const safeHeight = clamp(Number(nextHeight) || gridHeight, 8, 200);
  if (safeWidth === gridWidth && safeHeight === gridHeight) {
    return;
  }

  const previousGrid = cloneGrid(grid);
  const nextGrid = preserveArtwork
    ? reanchorGrid(previousGrid, gridWidth, gridHeight, safeWidth, safeHeight, anchor)
    : createEmptyGrid(safeWidth, safeHeight);

  gridWidth = safeWidth;
  gridHeight = safeHeight;
  grid = nextGrid;
  syncGridInputs();
  updateCanvasMetrics();
  render();
  saveArtworkToLocalStorage();
}

function reanchorGrid(oldGrid, oldWidth, oldHeight, newWidth, newHeight, anchor) {
  const newGrid = createEmptyGrid(newWidth, newHeight);

  let offsetX = 0;
  let offsetY = 0;

  switch (anchor) {
    case "top-left": offsetX = 0; offsetY = 0; break;
    case "top-center": offsetX = Math.floor((newWidth - oldWidth) / 2); offsetY = 0; break;
    case "top-right": offsetX = newWidth - oldWidth; offsetY = 0; break;
    case "middle-left": offsetX = 0; offsetY = Math.floor((newHeight - oldHeight) / 2); break;
    case "center": offsetX = Math.floor((newWidth - oldWidth) / 2); offsetY = Math.floor((newHeight - oldHeight) / 2); break;
    case "middle-right": offsetX = newWidth - oldWidth; offsetY = Math.floor((newHeight - oldHeight) / 2); break;
    case "bottom-left": offsetX = 0; offsetY = newHeight - oldHeight; break;
    case "bottom-center": offsetX = Math.floor((newWidth - oldWidth) / 2); offsetY = newHeight - oldHeight; break;
    case "bottom-right": offsetX = newWidth - oldWidth; offsetY = newHeight - oldHeight; break;
  }

  for (let row = 0; row < oldHeight; row++) {
    for (let col = 0; col < oldWidth; col++) {
      const newRow = row + offsetY;
      const newCol = col + offsetX;

      if (newRow >= 0 && newRow < newHeight && newCol >= 0 && newCol < newWidth) {
        newGrid[newRow][newCol] = oldGrid[row][col];
      }
    }
  }

  return newGrid;
}

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll(".tool-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
}

function setMode(mode) {
  currentMode = mode;
  if (mode === "progress") {
    selectedRow = null;
  }
  const modeSelect = document.getElementById("mode-select");
  if (modeSelect) modeSelect.value = mode;
  render();
}

function getCellFromMouse(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const col = Math.floor((x - gridOriginX) / cellSize);
  const row = Math.floor((y - gridOriginY) / cellSize);

  if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
    return { row, col };
  }
  return null;
}

function paintCell(row, col) {
  const nextColor = currentTool === "eraser" ? "#ffffff" : currentColor;
  if (grid[row][col] === nextColor) return;

  grid[row][col] = nextColor;
  render();
  saveArtworkToLocalStorage();
}

function saveState() {
  undoStack.push({
    grid: cloneGrid(grid),
    width: gridWidth,
    height: gridHeight,
  });
  if (undoStack.length > 80) {
    undoStack.shift();
  }
  redoStack = [];
}

function restoreHistoryState(state) {
  gridWidth = state.width;
  gridHeight = state.height;
  grid = cloneGrid(state.grid);
  syncGridInputs();
  updateCanvasMetrics();
  render();
  saveArtworkToLocalStorage();
}

function undo() {
  if (!undoStack.length) return;

  const previousState = undoStack.pop();
  const currentState = {
    grid: cloneGrid(grid),
    width: gridWidth,
    height: gridHeight,
  };
  redoStack.push(currentState);
  restoreHistoryState(previousState);
}

function redo() {
  if (!redoStack.length) return;

  const nextState = redoStack.pop();
  const currentState = {
    grid: cloneGrid(grid),
    width: gridWidth,
    height: gridHeight,
  };
  undoStack.push(currentState);
  restoreHistoryState(nextState);
}

function floodFill(row, col, newColor) {
  const targetColor = grid[row][col];
  if (targetColor === newColor) return;

  const stack = [[row, col]];
  while (stack.length) {
    const [nextRow, nextCol] = stack.pop();
    if (nextRow < 0 || nextRow >= gridHeight || nextCol < 0 || nextCol >= gridWidth) continue;
    if (grid[nextRow][nextCol] !== targetColor) continue;

    grid[nextRow][nextCol] = newColor;

    stack.push([nextRow - 1, nextCol]);
    stack.push([nextRow + 1, nextCol]);
    stack.push([nextRow, nextCol - 1]);
    stack.push([nextRow, nextCol + 1]);
  }

  render();
  saveArtworkToLocalStorage();
}

function buildPalette() {
  const palette = document.getElementById("color-palette");
  PRESET_COLORS.forEach((color, index) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.classList.add("color-swatch");
    swatch.setAttribute("aria-label", `${COLOR_NAMES[index]} ${color}`);
    const colorBlock = document.createElement("span");
    colorBlock.className = "swatch-color";
    colorBlock.style.backgroundColor = color;
    const label = document.createElement("span");
    label.className = "swatch-label";
    label.textContent = COLOR_NAMES[index];
    swatch.append(colorBlock, label);
    if (color === currentColor) {
      swatch.classList.add("active");
    }
    swatch.addEventListener("click", () => {
      setCurrentColor(color);
      closeColorModal();
    });
    palette.appendChild(swatch);
  });
}

function setCurrentColor(color) {
  currentColor = color;
  document.getElementById("custom-color").value = color;
  document.getElementById("custom-color-value").textContent = color;
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.getAttribute("aria-label")?.endsWith(color));
  });
  document.querySelector("#current-color-preview span").style.backgroundColor = color;
}

function openColorModal() {
  const modal = document.getElementById("color-modal");
  modal.hidden = false;
  document.getElementById("close-color-btn").focus();
}

function closeColorModal() {
  document.getElementById("color-modal").hidden = true;
  document.getElementById("open-color-btn").focus();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render Trace Overlay
  if (currentMode === "trace" && traceOverlay) {
    ctx.save();
    ctx.globalAlpha = traceOpacity;
    ctx.drawImage(
      traceOverlay,
      gridOriginX + traceOffsetX * cellSize,
      gridOriginY + traceOffsetY * cellSize,
      gridWidth * cellSize,
      gridHeight * cellSize
    );
    ctx.restore();
  }

  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#3d3529";

  for (let row = 0; row < gridHeight; row++) {
    const pixelY = gridOriginY + row * cellSize + cellSize / 2;
    const sideValue = gridHeight - row;
    const xPos = sideValue % 2 === 1 ? gridOriginX + gridWidth * cellSize + 18 : gridOriginX - 18;
    ctx.fillText(String(sideValue), xPos, pixelY);
  }

  for (let col = 0; col < gridWidth; col++) {
    const pixelX = gridOriginX + col * cellSize + cellSize / 2;
    const topValue = col + 1;
    const bottomValue = gridWidth - col;
    ctx.fillText(String(topValue), pixelX, gridOriginY - 18);
    ctx.fillText(String(bottomValue), pixelX, gridOriginY + gridHeight * cellSize + 18);
  }

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const cellX = gridOriginX + col * cellSize;
      const cellY = gridOriginY + row * cellSize;
      const isDimmed = currentMode === "progress" && selectedRow !== null && row !== selectedRow;

      ctx.save();
      if (isDimmed) {
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        ctx.restore();
        ctx.fillStyle = grid[row][col] || "#ffffff";
        ctx.globalAlpha = 0.15;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = grid[row][col] || "#ffffff";
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
      }
      ctx.restore();

      ctx.strokeStyle = "#d6c9af";
      ctx.lineWidth = 0.65;
      ctx.strokeRect(cellX, cellY, cellSize, cellSize);
    }
  }

  if (hoveredCell && !isDrawing && currentMode === "draw") {
    const { row, col } = hoveredCell;
    const previewColor = currentTool === "eraser" ? "#ffffff" : currentColor;
    ctx.fillStyle = previewColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(gridOriginX + col * cellSize, gridOriginY + row * cellSize, cellSize, cellSize);
    ctx.globalAlpha = 1;
  }
}

function init() {
  restoreArtworkFromLocalStorage();
  if (!grid.length) {
    grid = createEmptyGrid(gridWidth, gridHeight);
  }
  syncGridInputs();
  setTool(currentTool);
  setMode(currentMode);
  updateCanvasMetrics();
  render();
}

canvas.addEventListener("pointerdown", (event) => {
  if (currentMode === "progress") {
    const cell = getCellFromMouse(event);
    if (cell) {
      selectedRow = cell.row;
      render();
    }
    return;
  }

  const cell = getCellFromMouse(event);
  if (!cell) return;

  isDrawing = true;
  saveState();

  if (currentTool === "fill") {
    floodFill(cell.row, cell.col, currentColor);
  } else {
    paintCell(cell.row, cell.col);
  }
});

canvas.addEventListener("pointermove", (event) => {
  const cell = getCellFromMouse(event);
  hoveredCell = cell;

  if (currentMode === "progress") {
    render();
    return;
  }

  if (isDrawing && currentTool !== "fill" && cell) {
    paintCell(cell.row, cell.col);
  } else {
    render();
  }
});

canvas.addEventListener("pointerup", () => {
  if (isDrawing) {
    isDrawing = false;
    saveArtworkToLocalStorage();
  }
});

canvas.addEventListener("pointerleave", () => {
  if (isDrawing) {
    isDrawing = false;
    hoveredCell = null;
    render();
    saveArtworkToLocalStorage();
  } else {
    hoveredCell = null;
    render();
  }
});

document.querySelectorAll(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

document.getElementById("custom-color").addEventListener("input", (event) => {
  document.getElementById("custom-color-value").textContent = event.target.value;
});

document.getElementById("mode-select").addEventListener("change", (event) => {
  setMode(event.target.value);
});

document.getElementById("grid-size").addEventListener("change", (event) => {
  const nextValue = Number(event.target.value);
  if (!nextValue) return;
  saveState();
  applyGridSize(nextValue, nextValue);
});

document.getElementById("apply-grid-size").addEventListener("click", () => {
  const width = Number(document.getElementById("grid-width").value) || gridWidth;
  const height = Number(document.getElementById("grid-height").value) || gridHeight;
  saveState();
  applyGridSize(width, height, { anchor: currentAnchor });
});

document.querySelectorAll(".anchor-btn").forEach((button) => {
  button.addEventListener("click", () => {
    currentAnchor = button.dataset.anchor;
    document.querySelectorAll(".anchor-btn").forEach((btn) => {
      btn.classList.remove("active");
      btn.removeAttribute("aria-current");
    });
    button.classList.add("active");
    button.setAttribute("aria-current", "page");
  });
});

document.getElementById("undo-btn").addEventListener("click", undo);
document.getElementById("redo-btn").addEventListener("click", redo);
document.getElementById("delete-btn").addEventListener("click", deleteSavedArtwork);
document.getElementById("open-color-btn").addEventListener("click", openColorModal);
document.getElementById("close-color-btn").addEventListener("click", closeColorModal);
document.getElementById("apply-custom-color").addEventListener("click", () => {
  setCurrentColor(document.getElementById("custom-color").value);
  closeColorModal();
});
document.getElementById("color-modal").addEventListener("click", (event) => {
  if (event.target.id === "color-modal") closeColorModal();
});

window.addEventListener("beforeunload", saveArtworkToLocalStorage);
window.addEventListener("pagehide", saveArtworkToLocalStorage);

window.addEventListener("resize", () => {
  updateCanvasMetrics();
  render();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;
  const colorModal = document.getElementById("color-modal");

  if (key === "escape" && colorModal && !colorModal.hidden) {
    event.preventDefault();
    closeColorModal();
    return;
  }

  if (modifier && key === "z") {
    event.preventDefault();
    event.stopPropagation();
    undo();
    return;
  }

  if (modifier && (key === "y" || (event.shiftKey && key === "z"))) {
    event.preventDefault();
    event.stopPropagation();
    redo();
    return;
  }

  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable) return;

  if (!modifier) {
    if (key === "c") {
      event.preventDefault();
      openColorModal();
      return;
    }

    if (currentMode === "progress" && (key === "arrowup" || key === "arrowdown")) {
      event.preventDefault();
      const direction = key === "arrowup" ? -1 : 1;
      const currentRow = selectedRow === null
        ? (direction === 1 ? 0 : gridHeight - 1)
        : selectedRow;
      selectedRow = clamp(currentRow + direction, 0, gridHeight - 1);
      render();
      return;
    }

    if (currentMode === "trace") {
        if (key === "arrowup") { traceOffsetY--; render(); return; }
        if (key === "arrowdown") { traceOffsetY++; render(); return; }
        if (key === "arrowleft") { traceOffsetX--; render(); return; }
        if (key === "arrowright") { traceOffsetX++; render(); return; }
        if (key === "+" || key === "=") { traceOpacity = clamp(traceOpacity + 0.1, 0, 1); render(); return; }
        if (key === "-" || key === "_") { traceOpacity = clamp(traceOpacity - 0.1, 0, 1); render(); return; }
    }

    if (key === "p") setTool("pen");
    else if (key === "e") setTool("eraser");
    else if (key === "f") setTool("fill");
    else if (key === "d") setMode("draw");
    else if (key === "g") setMode("progress");
  }
});

document.getElementById("export-btn").addEventListener("click", () => {
  const confirmed = window.confirm("Do you want to download your pattern sheet as a PNG?");
  if (!confirmed) return;

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  const padding = 80;
  const exportCellSize = Math.max(18, Math.floor(1000 / Math.max(gridWidth, gridHeight)));
  const exportWidth = gridWidth * exportCellSize + padding * 2 + 80;
  const exportHeight = gridHeight * exportCellSize + padding * 2 + 80;

  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  exportCtx.fillStyle = "#f5f0e8";
  exportCtx.fillRect(0, 0, exportWidth, exportHeight);

  const originX = padding + 30;
  const originY = padding + 30;

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      exportCtx.fillStyle = grid[row][col] || "#ffffff";
      exportCtx.fillRect(originX + col * exportCellSize, originY + row * exportCellSize, exportCellSize, exportCellSize);
      exportCtx.strokeStyle = "#d6c9af";
      exportCtx.lineWidth = 1;
      exportCtx.strokeRect(originX + col * exportCellSize, originY + row * exportCellSize, exportCellSize, exportCellSize);
    }
  }

  exportCtx.fillStyle = "#3d3529";
  exportCtx.font = "12px 'Segoe UI', sans-serif";
  exportCtx.textAlign = "center";
  exportCtx.textBaseline = "middle";

  for (let row = 0; row < gridHeight; row++) {
    const y = originY + row * exportCellSize + exportCellSize / 2;
    const sideValue = gridHeight - row;
    const xPos = sideValue % 2 === 1 ? originX + gridWidth * exportCellSize + 18 : originX - 18;
    exportCtx.fillText(String(sideValue), xPos, y);
  }

  for (let col = 0; col < gridWidth; col++) {
    const x = originX + col * exportCellSize + exportCellSize / 2;
    const topValue = col + 1;
    const bottomValue = gridWidth - col;
    exportCtx.fillText(String(topValue), x, originY - 18);
    exportCtx.fillText(String(bottomValue), x, originY + gridHeight * exportCellSize + 18);
  }

  const link = document.createElement("a");
  const randomValue = Math.floor(Math.random() * 100000);
  link.download = `pixel-art-${randomValue}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});

document.getElementById("import-btn").addEventListener("click", () => document.getElementById("import-input").click());

document.getElementById("import-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Importing will replace your current grid and palette. Proceed?")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Sanitize dimensions
            const targetWidth = Math.min(img.width, 200);
            const targetHeight = Math.min(img.height, 200);

            if (confirm(`Auto-adjust grid to ${targetWidth}x${targetHeight}?`)) {
                applyGridSize(targetWidth, targetHeight, { preserveArtwork: false });
            }
            
            traceOverlay = img;
            traceOffsetX = 0;
            traceOffsetY = 0;
            setMode("trace");
            // Ensure next frame uses the image
            requestAnimationFrame(() => render());
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

buildPalette();
setCurrentColor(currentColor);
init();