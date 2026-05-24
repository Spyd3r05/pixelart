const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");

let gridSize = 16;
let cellSize = 0;
let grid = [];

let currentColor = "#000000";
let currentTool = "pen";
let isDrawing = false;
let hoveredCell = null;

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

// --- Step 1-a: Initialize the grid and canvas ---

function init() {
    //draw a grid ie 2D array
    grid = Array.from({ length: gridSize }, () =>
        Array(gridSize).fill("#ffffff"),
    );

    cellSize = Math.floor(480 / gridSize);

    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;

    //call to draw the grid
    render();
}

// --- Step 1-b: Render the grid onto the canvas ---

function render() {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillStyle = grid[row][col];
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
    }

    if (hoveredCell && !isDrawing) {
        const { row, col } = hoveredCell;
        const previewColor = currentTool === "eraser" ? "#ffffff" : currentColor;

        ctx.fillStyle = previewColor;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1.0;
    }
}

// --- Step 2-a: Map mouse position to grid cell ---

function getCellFromMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        return { row, col };
    }
    return null;
}

// --- Step 2-b: Paint a single cell ---

function paintCell(row, col) {
    if (currentTool === "pen") {
        grid[row][col] = currentColor;
    } else if (currentTool === "eraser") {
        grid[row][col] = "#ffffff";
    }
    render();
}

// --- Step 2-c: Mouse event handlers ---

canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    const cell = getCellFromMouse(e);
    if (cell) {
        if (currentTool === "fill") {
            floodFill(cell.row, cell.col, currentColor);
        } else {
            paintCell(cell.row, cell.col);
        }
    }
});

canvas.addEventListener("mousemove", (e) => {
    const cell = getCellFromMouse(e);
    hoveredCell = cell;

    if (isDrawing && currentTool !== "fill" && cell) {
        paintCell(cell.row, cell.col);
    } else {
        render();
    }
});

canvas.addEventListener("mouseup", () => {
    isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
    isDrawing = false;
    hoveredCell = null;
    render();
});

// --- Step 3: Flood fill algorithm ---

function floodFill(row, col, newColor) {
    const targetColor = grid[row][col];
    if (targetColor === newColor) return;

    const stack = [[row, col]];

    while (stack.length > 0) {
        const [r, c] = stack.pop();

        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        if (grid[r][c] !== targetColor) continue;

        grid[r][c] = newColor;

        stack.push([r - 1, c]);
        stack.push([r + 1, c]);
        stack.push([r, c - 1]);
        stack.push([r, c + 1]);
    }

    render();
}

// --- Step 4-a: Build the color palette ---

function buildPalette() {
    const palette = document.getElementById("color-palette");
    PRESET_COLORS.forEach((color) => {
        const swatch = document.createElement("div");
        swatch.classList.add("color-swatch");
        if (color === currentColor) {
            swatch.classList.add("active");
        }
        swatch.style.backgroundColor = color;
        swatch.addEventListener("click", () => {
            currentColor = color;
            document.getElementById("custom-color").value = color;

            document.querySelectorAll(".color-swatch").forEach((s) => {
                s.classList.remove("active");
            });
            swatch.classList.add("active");
        });
        palette.appendChild(swatch);
    });
}

// --- Step 4-b: Custom color picker ---
document.getElementById("custom-color").addEventListener("input", (e) => {
    currentColor = e.target.value;

    document.querySelectorAll(".color-swatch").forEach((s) => {
        s.classList.remove("active");
    });
});

// --- Step 4-c: Tool switching (buttons + keyboard shortcuts) ---

// helper to set the current tool and update UI
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
    const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
    if (btn) btn.classList.add("active");
}

// wire up click handlers on tool buttons
document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        setTool(btn.dataset.tool);
    });
});

// keyboard shortcuts: p = pen, e = eraser, f = fill
document.addEventListener("keydown", (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;

    const key = e.key.toLowerCase();
    if (key === "p" || key === "P") {
        setTool("pen");
    } else if (key === "e" || key === "E") {
        setTool("eraser");
    } else if (key === "f" || key === "F") {
        setTool("fill");
    }
});

buildPalette();

// --- Step 5: Grid size switching ---
function saveArtworkToLocalStorage() {
    try {
        const payload = {
            gridSize: gridSize,
            grid: grid,
        };
        localStorage.setItem("pixelArt:last", JSON.stringify(payload));
    } catch (err) {
        console.warn("Failed to save artwork to localStorage", err);
    }
}

function restoreArtworkFromLocalStorage() {
    try {
        const raw = localStorage.getItem("pixelArt:last");
        if (!raw) return;
        const payload = JSON.parse(raw);
        const oldSize = payload.gridSize;
        const oldGrid = payload.grid;
        if (!Array.isArray(oldGrid) || oldSize <= 0) return;
        const newSize = gridSize;
        const mappedGrid = Array.from({ length: newSize }, () => Array(newSize).fill("#ffffff"));

        // If sizes are equal just copy
        if (oldSize === newSize) {
            for (let r = 0; r < newSize; r++) {
                for (let c = 0; c < newSize; c++) {
                    mappedGrid[r][c] = oldGrid[r][c] || "#ffffff";
                }
            }
            grid = mappedGrid;
            render();
            return;
        }

        // Upscale (newSize > oldSize): map each source pixel to a single target pixel.
        // This makes the artwork occupy fewer grid cells in the higher-resolution grid
        // (the image will look "smaller" on the grid and leave space to expand),
        if (newSize > oldSize) {
            // initialize mappedGrid with white
            for (let r = 0; r < newSize; r++) {
                for (let c = 0; c < newSize; c++) mappedGrid[r][c] = "#ffffff";
            }

            for (let sr = 0; sr < oldSize; sr++) {
                for (let sc = 0; sc < oldSize; sc++) {
                    const color = (oldGrid[sr] && oldGrid[sr][sc]) ? oldGrid[sr][sc] : "#ffffff";
                    // map source center to target index (source -> target mapping)
                    const tr = Math.min(newSize - 1, Math.floor(((sr + 0.5) * newSize) / oldSize));
                    const tc = Math.min(newSize - 1, Math.floor(((sc + 0.5) * newSize) / oldSize));
                    mappedGrid[tr][tc] = color;
                }
            }

            grid = mappedGrid;
            render();
            return;
        }

        // Downscale (newSize < oldSize): aggregate source pixels for each target cell.
        // We'll use majority voting (mode) across the source rectangle that maps to the target cell.
        for (let r = 0; r < newSize; r++) {
            // source row range [rStart, rEnd] that maps to this target row
            const rStart = Math.floor((r * oldSize) / newSize);
            const rEnd = Math.floor(((r + 1) * oldSize) / newSize) - 1;
            for (let c = 0; c < newSize; c++) {
                const cStart = Math.floor((c * oldSize) / newSize);
                const cEnd = Math.floor(((c + 1) * oldSize) / newSize) - 1;

                const counts = Object.create(null);
                for (let sr = rStart; sr <= rEnd; sr++) {
                    for (let sc = cStart; sc <= cEnd; sc++) {
                        const col = (oldGrid[sr] && oldGrid[sr][sc]) ? oldGrid[sr][sc] : "#ffffff";
                        counts[col] = (counts[col] || 0) + 1;
                    }
                }

                // pick color with highest count
                let bestColor = "#ffffff";
                let bestCount = -1;
                for (const col in counts) {
                    if (counts[col] > bestCount) {
                        bestCount = counts[col];
                        bestColor = col;
                    }
                }
                mappedGrid[r][c] = bestColor;
            }
        }

        grid = mappedGrid;
        render();
    } catch (err) {
        console.warn("Failed to restore artwork from localStorage", err);
    }
}

document.querySelector("#grid-size").addEventListener("change", (e) => {
    const newSize = parseInt(e.target.value);
    const proceed = window.confirm("Change grid size?");
    if (!proceed) {
        e.target.value = gridSize;
        return;
    }

    saveArtworkToLocalStorage();

    gridSize = newSize;
    init();

    restoreArtworkFromLocalStorage();
});

// --- Step 6: PNG export ---
document.querySelector(".export-btn").addEventListener("click", (e) =>{
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    const exportCellSize = Math.max(16, Math.floor(512 / gridSize));
    exportCanvas.width = gridSize * exportCellSize;
    exportCanvas.height = gridSize * exportCellSize;

    for(let row =0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            exportCtx.fillStyle = grid[row][col];
            exportCtx.fillRect(col * exportCellSize, row * exportCellSize, exportCellSize, exportCellSize);
        }
    }
    const link = document.createElement("a");
    //confirm download
    const confirmed = confirm("Do you want to download your pixel art as a PNG image?");
    if (!confirmed) return;
    link.download = "pixel-art.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
})

init();