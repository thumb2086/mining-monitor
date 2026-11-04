"use strict";

/**
 * blessed-contrib dashboard.
 *
 *  rows  0- 4   GPUs                    Miner
 *  rows  5- 8   Hashrate chart (TH/s)   (full width)
 *  rows  9-11   Difficulty chart (M)
 *  rows 12-15   Events                  Payout / Pearl network
 *
 * Grid is 16 rows x 12 cols. Cell rectangles MUST NOT overlap — blessed
 * silently clips widgets that share grid cells, which used to cut the chart
 * plot area down to a single row so every sample was drawn on the baseline.
 */

const blessed = require("blessed");
const contrib = require("blessed-contrib");
const { Canvas: InnerCanvas } = require("drawille-canvas-blessed-contrib");

const GRID_ROWS = 16;
const GRID_COLS = 12;

/** HH:MM:SS in 24h — the locale string (下午1:57:21) is too wide for an axis. */
function clockLabel(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Auto-scale a blessed-contrib line chart to its own data instead of a fixed
 * 0-based axis. A miner holding ~65 TH/s with minY=0 draws a flat line glued to
 * the top border; scaling around the observed range makes real variation
 * visible.
 */
function applyScale(chart, points) {
  const ys = points.map((p) => p.y).filter((v) => Number.isFinite(v));
  if (ys.length === 0) return;
  let min = Math.min(...ys);
  let max = Math.max(...ys);

  // Keep a floor on the visible span. blessed-contrib switches to 2-decimal
  // y labels whenever (max-min)/numYLabels < 1, and those labels are wider
  // than the axis gutter, so they get clipped. A span of >= 3 keeps the
  // labels short and still shows real movement.
  const MIN_SPAN = 3;
  const span = max - min;
  if (span < MIN_SPAN) {
    const mid = (max + min) / 2;
    min = mid - MIN_SPAN / 2;
    max = mid + MIN_SPAN / 2;
  } else {
    const pad = span * 0.2;
    min -= pad;
    max += pad;
  }

  min = Math.max(0, Math.floor(min));
  max = Math.ceil(max);
  if (max <= min) max = min + MIN_SPAN;

  chart.options.minY = min;
  chart.options.maxY = max;
}

/**
 * blessed-contrib stops the polyline at the last sample and leaves the rest of
 * the canvas empty (its x mapping divides by `points.length`, so a short series
 * ends several columns before the right border). Extend the newest value to the
 * right edge as a dim "holds at" segment — that is what the value is doing
 * right now, and it makes the chart flush with the frame.
 */
function drawHoldSegment(chart, lastValue) {
  const ctx = chart.ctx;
  const size = chart.canvasSize;
  if (!ctx || !size) return;

  const xs = chart._lastXs || [];
  const n = xs.length;
  if (n === 0) return;

  const maxY = chart.options.maxY;
  const minY = chart.options.minY;
  if (!Number.isFinite(maxY) || !Number.isFinite(minY) || maxY <= minY) return;

  const xPadding = chart.options.xPadding || 10;
  const yPadding = 11; // hard-coded inside blessed-contrib's Line.setData

  const width = size.width;
  const height = size.height;

  const startX = ((width - xPadding) / n) * (n - 1) + xPadding + 2;
  const y = height - yPadding - ((height - yPadding) / (maxY - minY)) * (lastValue - minY) - 2;
  if (startX >= width - 2) return;

  ctx.strokeStyle = chart.options.style.line || "green";
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}

/**
 * blessed-contrib only computes the chart's braille canvas once, on the
 * element's `attach` event, and never again. If the widget is not fully laid
 * out yet (or the terminal is resized), the canvas stays too small: the plot
 * is drawn tiny in the top-left corner and the rest of the box stays blank.
 *
 * Recompute it whenever the widget size changed. `height * 4` (instead of
 * blessed's `height * 4 - 8`) makes the x-axis labels land on the last rows of
 * the box instead of floating above an empty band.
 */
function ensureCanvas(chart) {
  // Canvas rows are braille sub-rows (4 per terminal row). Use the widget's
  // INNER size (borders excluded) so the axis and the plot reach the right and
  // bottom borders instead of stopping short of them.
  const width = Math.max(24, (chart.width - 2) * 2);
  // +4 pulls the x-axis label row down onto the last line of the box, so the
  // axis sits flush with the bottom border instead of floating above a gap.
  const height = Math.max(12, (chart.height - 2) * 4 + 4);
  if (chart.canvasSize && chart.canvasSize.width === width && chart.canvasSize.height === height) {
    return;
  }
  chart.canvasSize = { width, height };
  chart._canvas = new InnerCanvas(width, height);
  chart.ctx = chart._canvas.getContext();
}

class Dashboard {
  /**
   * @param {object}  [opts]
   * @param {string}  [opts.title]
   * @param {boolean} [opts.demo]
   * @param {object}  [opts.output]  stream override (used by --dump / tests)
   * @param {object}  [opts.input]   stream override
   */
  constructor({ title = "mining-monitor", demo = false, output, input } = {}) {
    this.demo = demo;
    this.maxPoints = 60;
    this.hashrateData = [];
    this.difficultyData = [];
    this.deferred = false;

    const screenOpts = {
      smartCSR: true,
      fullUnicode: true,
      title,
      dockBorders: true,
      autoPadding: true,
    };
    if (output) screenOpts.output = output;
    if (input) screenOpts.input = input;

    this.screen = blessed.screen(screenOpts);
    this.grid = new contrib.grid({
      rows: GRID_ROWS,
      cols: GRID_COLS,
      screen: this.screen,
    });

    // --- row 0-4 ------------------------------------------------------------
    this.gpuTable = this.grid.set(0, 0, 5, 6, contrib.table, {
      keys: true,
      label: " GPUs ",
      columnSpacing: 1,
      columnWidth: [3, 20, 8, 5, 5, 4, 11],
      border: { fg: "cyan" },
    });

    this.minerBox = this.grid.set(0, 6, 5, 6, contrib.table, {
      keys: true,
      label: " Miner ",
      columnSpacing: 1,
      columnWidth: [14, 30],
      border: { fg: "magenta" },
    });

    // --- rows 5-8: hashrate ------------------------------------------------
    this.chart = this.grid.set(5, 0, 4, GRID_COLS, contrib.line, {
      label: " Hashrate (TH/s) ",
      showLegend: false,
      wholeNumbersOnly: false,
      minY: 0,
      numYLabels: 3,
      style: { line: "green", text: "green", baseline: "black" },
      border: { fg: "green" },
    });

    // --- rows 9-11: difficulty --------------------------------------------
    this.diffChart = this.grid.set(9, 0, 3, GRID_COLS, contrib.line, {
      label: " Difficulty (M) ",
      showLegend: false,
      wholeNumbersOnly: false,
      minY: 0,
      numYLabels: 3,
      style: { line: "yellow", text: "yellow", baseline: "black" },
      border: { fg: "yellow" },
    });

    // --- rows 12-15 ---------------------------------------------------------
    this.log = this.grid.set(12, 0, 4, 7, contrib.log, {
      label: " Events ",
      tags: true,
      border: { fg: "grey" },
    });

    this.rightBox = this.grid.set(12, 7, 4, 5, contrib.table, {
      keys: true,
      label: " Payout / Pearl network ",
      columnSpacing: 1,
      columnWidth: [13, 16],
      border: { fg: "yellow" },
    });

    this.screen.key(["q", "C-c"], () => {
      this.screen.destroy();
      process.exit(0);
    });

    this.screen.on("resize", () => {
      // Re-fit table columns: the GPU table drops the optional columns (W,
      // Temp, Fan, Clk) instead of clipping them on narrow terminals.
      this.setGpu(this._lastGpus || []);
      this.setRight(this._lastRight || {});
      // Charts cache their braille canvas size — redraw them at the new size.
      this.setHashrate(this.hashrateData);
      this.setDifficulty(this.difficultyData);
      this.paint();
    });

    // Only paint what we already have. Never hand the charts an empty series:
    // blessed-contrib computes Math.max(...[]) === -Infinity and the broken
    // scale sticks for the rest of the process.
    this._lastGpus = [];
    this.setGpu([]);
    this.setMiner(null);
    this.setRight({});
  }

  // --- batches all widget updates into one terminal repaint -----------------
  begin() {
    this.deferred = true;
  }

  refresh() {
    // First frame: widget widths are only known after blessed lays out the
    // grid, so refit the tables once before painting.
    if (!this._fitted) {
      if (this.gpuTable.width) {
        this._fitted = true;
        this.setGpu(this._lastGpus || []);
        this.setRight(this._lastRight || {});
      }
    }
    this.deferred = false;
    this.screen.render();
  }

  paint() {
    if (!this.deferred) this.screen.render();
  }

  // --- GPUs ----------------------------------------------------------------
  setGpu(gpus) {
    this._lastGpus = gpus || [];

    const cells = [
      { head: "#", w: 3, get: (g) => String(g.index) },
      { head: "Name", w: 14, get: (g) => (g.name || "").replace(/^NVIDIA GeForce /, "") },
      { head: "TH/s", w: 7, get: (g) => (g.hashrateTh != null ? g.hashrateTh.toFixed(2) : "-") },
      { head: "W", w: 5, get: (g) => (g.powerW != null ? String(Math.round(g.powerW)) : "-"), optional: true },
      { head: "Temp", w: 5, get: (g) => (g.tempC != null ? `${Math.round(g.tempC)}C` : "-"), optional: true },
      { head: "Fan", w: 4, get: (g) => (g.fanPercent != null ? `${Math.round(g.fanPercent)}%` : "-"), optional: true },
      {
        head: "Clk/Mem",
        w: 11,
        get: (g) => `${Math.round(g.coreClockMhz || 0)}/${Math.round(g.memClockMhz || 0)}`,
        optional: true,
      },
    ];

    // Border + padding eat 4 columns; keep at least one space between cells.
    const inner = Math.max(20, (this.gpuTable.width || 60) - 4);
    const spacing = 1;

    const used = cells.filter((c) => !c.optional).reduce((n, c) => n + c.w + spacing, 0);
    const extra = cells.filter((c) => c.optional);

    const chosen = cells.filter((c) => !c.optional);
    let total = used;
    for (const c of extra) {
      if (total + c.w + spacing <= inner) {
        chosen.push(c);
        total += c.w + spacing;
      }
    }
    // Order must stay stable (optional columns are appended in declaration order).
    chosen.sort((a, b) => cells.indexOf(a) - cells.indexOf(b));

    // Give the leftover width to the name column so long GPU names fit.
    const left = inner - chosen.reduce((n, c) => n + c.w + spacing, 0);
    const nameCell = chosen.find((c) => c.head === "Name");
    if (nameCell && left > 0) nameCell.w = Math.min(26, nameCell.w + left);

    this.gpuTable.options.columnWidth = chosen.map((c) => c.w);
    this.gpuTable.setData({
      headers: chosen.map((c) => c.head),
      data: (gpus || []).map((g) => chosen.map((c) => String(c.get(g)))),
    });
    this.paint();
  }

  // --- miner ---------------------------------------------------------------
  setMiner(miner) {
    const rows = [];
    if (!miner) {
      rows.push(["Status", "miner API unreachable"]);
      rows.push(["", "start SRBMiner with --api-enable"]);
    } else {
      const th = (hs) => (hs != null ? `${(hs / 1e12).toFixed(2)} TH/s` : "-");
      const dh = (hs) => (hs != null ? `${(hs / 1e6).toFixed(2)} MH/s` : "-");
      const hr = (hs) => (hs == null ? "-" : hs >= 1e12 ? th(hs) : dh(hs));
      const dur = (sec) => {
        if (sec == null) return "-";
        sec = Math.floor(sec);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
      };
      rows.push([
        "Rig",
        `${miner.rigName || "?"} (v${miner.version || "?"})${miner.stale ? " stale" : ""}`,
      ]);
      rows.push(["Algorithm", miner.algorithm || "-"]);
      rows.push([
        "Share diff",
        miner.difficulty != null ? String(miner.difficulty) : "-",
      ]);
      rows.push([
        "Shares A/R",
        `${miner.accepted ?? "-"} / ${miner.rejected ?? "-"}`,
      ]);
      if (miner.avgFindTime != null) {
        rows.push(["Avg find time", dur(miner.avgFindTime)]);
      }
      rows.push(["Hashrate 1m", hr(miner.hashrate1m)]);
      rows.push(["Hashrate 15m", hr(miner.hashrate15m)]);
      rows.push(["Hashrate 1h", hr(miner.hashrate1h)]);
      rows.push([
        "Latency",
        miner.latency != null ? `${miner.latency} ms` : "-",
      ]);
      rows.push(["Pool uptime", dur(miner.poolUptimeSec)]);
    }
    this.minerBox.setData({ headers: ["Item", "Value"], data: rows });
    this.paint();
  }

  // --- payout + network ----------------------------------------------------
  setRight(opts = {}) {
    this._lastRight = opts;
    const { pool = {}, net = {} } = opts;
    const rows = [];
    const num = (v, d = 4) => (v == null ? "-" : Number(v).toFixed(d));

    const pct =
      pool.balance != null && pool.threshold
        ? ` ${((pool.balance / pool.threshold) * 100).toFixed(0)}%`
        : "";
    rows.push(["Balance", `${num(pool.balance, 4)} DOGE${pct}`]);
    rows.push(["24h Reward", `${num(pool.rewarded24h)} DOGE`]);
    rows.push(["7d Reward", `${num(pool.rewarded7d)} DOGE`]);
    rows.push([
      "Pearl Height",
      net.blockHeight != null ? String(net.blockHeight) : "-",
    ]);
    rows.push([
      "New Blocks",
      net.sessionBlocks != null ? `+${net.sessionBlocks}` : "-",
    ]);
    rows.push([
      "Net Diff",
      net.difficulty != null ? Number(net.difficulty).toExponential(2) : "-",
    ]);

    this.rightBox.setData({ headers: ["Item", "Value"], data: rows });
    this.paint();
  }

  // --- charts --------------------------------------------------------------
  pushHashrate(th) {
    if (th == null || !Number.isFinite(th)) return;
    this.hashrateData.push({ x: clockLabel(), y: th });
    if (this.hashrateData.length > this.maxPoints) this.hashrateData.shift();
    this.setHashrate(this.hashrateData);
  }

  /** @param {number} millionDiff difficulty already divided by 1e6 */
  pushDifficulty(millionDiff) {
    if (millionDiff == null || !Number.isFinite(millionDiff)) return;
    this.difficultyData.push({ x: clockLabel(), y: millionDiff });
    if (this.difficultyData.length > this.maxPoints) this.difficultyData.shift();
    this.setDifficulty(this.difficultyData);
  }

  setHashrate(points) {
    if (!points || points.length === 0) return;
    applyScale(this.chart, points);
    ensureCanvas(this.chart);
    this.chart._lastXs = points.map((p) => p.x);
    this.chart.setData([
      { title: "hashrate", x: points.map((p) => p.x), y: points.map((p) => p.y) },
    ]);
    drawHoldSegment(this.chart, points[points.length - 1].y);
    this.paint();
  }

  setDifficulty(points) {
    if (!points || points.length === 0) return;
    this.difficultyData = points;
    applyScale(this.diffChart, points);
    ensureCanvas(this.diffChart);
    this.diffChart._lastXs = points.map((p) => p.x);
    this.diffChart.setData([
      {
        title: "difficulty",
        x: points.map((p) => p.x),
        y: points.map((p) => p.y),
      },
    ]);
    drawHoldSegment(this.diffChart, points[points.length - 1].y);
    this.paint();
  }

  // --- events --------------------------------------------------------------
  logLine(msg) {
    this.log.log(`{grey-fg}[${clockLabel()}]{/} ${msg}`);
    this.paint();
  }

  render() {
    this.screen.render();
  }
}

module.exports = { Dashboard, clockLabel };
