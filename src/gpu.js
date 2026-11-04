"use strict";

const { execFile } = require("child_process");

const NVIDIA_QUERY = [
  "index",
  "name",
  "temperature.gpu",
  "power.draw",
  "power.limit",
  "clocks.gr",
  "clocks.mem",
  "fan.speed",
  "utilization.gpu",
  "memory.used",
  "memory.total",
].join(",");

/**
 * Query nvidia-smi for all GPUs.
 * Resolves to an array of GPU objects. On failure resolves to [].
 */
function queryGpus(timeoutMs = 5000) {
  return new Promise((resolve) => {
    execFile(
      "nvidia-smi",
      [`--query-gpu=${NVIDIA_QUERY}`, "--format=csv,noheader,nounits"],
      { timeout: timeoutMs, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        const gpus = [];
        for (const line of stdout.trim().split(/\r?\n/)) {
          const parts = line.split(",").map((s) => s.trim());
          if (parts.length < 11) continue;
          const num = (v) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
          };
          gpus.push({
            index: parseInt(parts[0], 10),
            name: parts[1],
            tempC: num(parts[2]),
            powerW: num(parts[3]),
            powerLimitW: num(parts[4]),
            coreClockMhz: num(parts[5]),
            memClockMhz: num(parts[6]),
            fanPercent: num(parts[7]),
            utilization: num(parts[8]),
            memUsedMiB: num(parts[9]),
            memTotalMiB: num(parts[10]),
            // GDDR6 cards (RTX 30 series) do not expose a memory junction
            // temperature through nvidia-smi; callers can estimate it.
            memTempC: null,
          });
        }
        resolve(gpus);
      }
    );
  });
}

/** Rough estimate for GDDR6 memory temperature when the sensor is absent. */
function estimateMemTemp(gpu) {
  if (gpu.memTempC !== null) return gpu.memTempC;
  return gpu.tempC > 0 ? gpu.tempC + 12 : 0;
}

module.exports = { queryGpus, estimateMemTemp };