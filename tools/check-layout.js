#!/usr/bin/env node
"use strict";

/**
 * Layout + chart regression check. Runs without a TTY.
 *
 *   node tools/check-layout.js
 *
 * Catches the two bugs that broke the dashboard before:
 *   1. grid rectangles that overlap (widgets clipping each other)
 *   2. charts fed an empty series (Math.max(...[]) === -Infinity poisons
 *      blessed-contrib's y-scale, and every later point draws on the baseline)
 */

const { Writable, PassThrough } = require("stream");
const { Dashboard } = require("../src/ui.js");

const WIDGETS = ["gpuTable", "minerBox", "chart", "diffChart", "log", "rightBox"];
let failures = 0;

function fail(msg) {
  failures++;
  console.error(`FAIL  ${msg}`);
}

function ok(msg) {
  console.log(`ok    ${msg}`);
}

function makeDashboard(cols = 120, rows = 42) {
  const out = new Writable({
    write(chunk, enc, cb) {
      cb();
    },
  });
  out.columns = cols;
  out.rows = rows;
  out.isTTY = true;
  return new Dashboard({ demo: true, output: out, input: new PassThrough() });
}

// --- 1. no overlapping widgets ---------------------------------------------
function checkOverlap(dash) {
  const rects = WIDGETS.map((name) => {
    const w = dash[name];
    return {
      name,
      top: w.top,
      left: w.left,
      bottom: w.top + w.height,
      right: w.left + w.width,
    };
  });

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const overlap =
        a.top < b.bottom && b.top < a.bottom && a.left < b.right && b.left < a.right;
      if (overlap) {
        fail(
          `${a.name} overlaps ${b.name} ` +
            `(${a.top},${a.left} ${a.height}x${a.width} vs ${b.top},${b.left} ${b.height}x${b.width})`
        );
      }
    }
  }
  ok("widget rectangles do not overlap");
}

// --- 2. charts actually receive data ---------------------------------------
function checkCharts(dash) {
  if (!dash.hashrateData) fail("hashrateData is not initialised");
  if (!dash.difficultyData) fail("difficultyData is not initialised");

  for (let i = 0; i < 8; i++) {
    dash.pushHashrate(62 + i * 0.4);
    dash.pushDifficulty(52 + i * 0.1);
  }

  if (dash.hashrateData.length !== 8) {
    fail(`hashrateData has ${dash.hashrateData.length} points, expected 8`);
  }
  if (dash.difficultyData.length !== 8) {
    fail(`difficultyData has ${dash.difficultyData.length} points, expected 8`);
  }

  for (const [name, widget] of [
    ["chart", dash.chart],
    ["diffChart", dash.diffChart],
  ]) {
    const { minY, maxY } = widget.options;
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      fail(`${name} y-scale is not finite (minY=${minY}, maxY=${maxY})`);
    } else if (maxY <= minY) {
      fail(`${name} y-scale collapsed (minY=${minY}, maxY=${maxY})`);
    } else {
      ok(`${name} y-scale ${minY}..${maxY}`);
    }
  }
}

// --- 3. the frame renders the axis and a plotted line ----------------------
function checkRender(dash) {
  dash.refresh();
  const frame = (dash.screen.lines || [])
    .map((row) => row.map((cell) => (cell && cell[1]) || " ").join(""))
    .join("\n");

  for (const label of ["Hashrate (TH/s)", "Difficulty (M)", "Payout / Pearl network"]) {
    if (!frame.includes(label)) fail(`rendered frame is missing "${label}"`);
  }

  const braille = (frame.match(/[⠁-⣿]/g) || []).length;
  if (braille < 10) {
    fail(`frame contains only ${braille} braille glyphs — the line chart did not draw`);
  } else {
    ok(`line chart drew ${braille} braille cells`);
  }
}

// --- 3b. the chart fills its box and the x-axis is flush at the bottom -----
function checkChartFillsBox() {
  for (const rows of [30, 42, 50, 60, 70]) {
    const dash = makeDashboard(120, rows);
    dash.begin();
    for (let i = 0; i < 12; i++) {
      dash.pushHashrate(62 + Math.sin(i / 3) * 1.4);
      dash.pushDifficulty(52.1 + Math.cos(i / 4) * 0.3);
    }
    dash.refresh();

    const frame = (dash.screen.lines || []).map((row) =>
      row.map((cell) => (cell && cell[1]) || " ").join("")
    );
    const top = frame.findIndex((l) => l.includes("Hashrate (TH/s)"));
    if (top < 0) {
      fail(`no hashrate box in a ${rows}-row terminal`);
      dash.screen.destroy();
      continue;
    }

    const inner = frame.slice(top + 1, top + dash.chart.height - 1);
    const labelRow = inner.findIndex((l) => /\d\d:\d\d:\d\d/.test(l));
    const brailleRows = inner.filter((l) => /[⠁-⣿]/.test(l)).length;
    const last = inner.length - 1;

    if (labelRow < 0) {
      fail(`${rows}-row terminal: x-axis time labels are not rendered`);
    } else if (labelRow !== last) {
      fail(
        `${rows}-row terminal: x-axis sits on row ${labelRow} of ${last} — ` +
          `${last - labelRow} blank line(s) above the border`
      );
    } else if (brailleRows < last - 1) {
      fail(
        `${rows}-row terminal: plot only covers ${brailleRows} of ${last} rows — ` +
          `the chart canvas is smaller than its box`
      );
    } else {
      // Right edge: the newest sample (or its hold segment) must reach the
      // inner border, otherwise the chart stops short of the frame.
      let rightmost = 0;
      for (const line of inner) {
        const chars = Array.from(line);
        for (let x = chars.length - 1; x > rightmost; x--) {
          if (/[⠁-⣿]/.test(chars[x])) {
            rightmost = x;
            break;
          }
        }
      }
      const innerRight = Array.from(inner[0] || "").length - 2;
      if (rightmost < innerRight - 3) {
        fail(
          `${rows}-row terminal: plot stops at column ${rightmost} of ${innerRight} — ` +
            `blank space on the right`
        );
      } else {
        ok(`${rows}-row terminal: plot fills ${brailleRows} rows, flush to both edges, x-axis at bottom`);
      }
    }
    dash.screen.destroy();
  }
}

// --- 3c. a stale canvas size must be recovered on the next draw -----------
function checkCanvasRecovery() {
  const dash = makeDashboard(120, 50);
  // Simulate blessed-contrib's attach-time sizing: the widget had no real
  // height yet, so the canvas was created far too small.
  dash.chart.canvasSize = { width: 40, height: 8 };
  dash.begin();
  for (let i = 0; i < 10; i++) dash.pushHashrate(60 + i * 0.3);
  dash.refresh();

  const frame = (dash.screen.lines || []).map((row) =>
    row.map((cell) => (cell && cell[1]) || " ").join("")
  );
  const top = frame.findIndex((l) => l.includes("Hashrate (TH/s)"));
  const inner = frame.slice(top + 1, top + dash.chart.height - 1);
  const brailleRows = inner.filter((l) => /[⠁-⣿]/.test(l)).length;

  if (brailleRows < inner.length - 2) {
    fail(
      `stale canvas was not resized (plot covers ${brailleRows} of ${inner.length} rows) — ` +
        `the chart would be drawn in a corner with blank space below`
    );
  } else {
    ok("stale canvas size is recomputed before drawing");
  }
  dash.screen.destroy();
}

// --- 4. gpu table adapts instead of clipping ------------------------------
function checkAdaptiveColumns() {
  for (const cols of [80, 100, 120, 150]) {
    const dash = makeDashboard(cols);
    dash.begin();
    dash.setGpu([
      {
        index: 0,
        name: "NVIDIA GeForce RTX 3060 Ti",
        hashrateTh: 64.6,
        powerW: 223,
        tempC: 73,
        fanPercent: 80,
        coreClockMhz: 1890,
        memClockMhz: 9251,
      },
    ]);
    dash.refresh();

    const widths = dash.gpuTable.options.columnWidth || [];
    const needed = widths.reduce((a, b) => a + b, 0) + widths.length;
    const available = dash.gpuTable.width - 4;
    if (needed > available) {
      fail(`gpu table needs ${needed} cols but only ${available} fit at width ${cols}`);
    } else {
      ok(`gpu table fits at ${cols} cols (${widths.length} columns, ${needed}/${available})`);
    }
    dash.screen.destroy();
  }
}

const dash = makeDashboard();
checkOverlap(dash);
checkCharts(dash);
checkRender(dash);
dash.screen.destroy();
checkChartFillsBox();
checkCanvasRecovery();
checkAdaptiveColumns();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall layout checks passed");
