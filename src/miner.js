"use strict";

/**
 * Local miner API clients.
 *
 * SRBMiner-MULTI (--api-enable --api-port 60130):
 *   - GET /        → JSON stats  (this is what we use)
 *   - GET /stats   → HTML GUI
 *   Response shape (verified against SRBMiner-MULTI 3.8.0):
 *   {
 *     rig_name, miner_version, mining_time, total_gpu_workers,
 *     gpu_devices: [ { id, device: "gpu1", vendor, model, ... } ],
 *     algorithms: [ {
 *       name, pool: { pool, wallet, difficulty, latency, uptime, ... },
 *       shares: { total, accepted, rejected, avg_find_time },
 *       hashrate: { "1min", "15min", "1hr", "6hr", gpu: { gpu1: <H/s>, total } },
 *       gpu_accepted_shares: { gpu1: n }, gpu_rejected_shares: { gpu1: n },
 *       gpu_compute_errors: { gpu1: n },
 *     } ]
 *   }
 *
 * XMRig (--http-port 60070): /2/summary, /1/summary
 */

const http = require("http");

function httpGetJson({ host, port, path }, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const req = http.get(
      { host, port, path, timeout: timeoutMs },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * SRBMiner-MULTI stats. Returns a normalized object or null if unreachable.
 */
async function querySrbmizerStats({ host = "127.0.0.1", port = 60130 } = {}) {
  // The SRBMiner API is occasionally slow while the GPU is busy — one retry.
  let json = await httpGetJson({ host, port, path: "/" });
  if (!json) {
    await new Promise((r) => setTimeout(r, 700));
    json = await httpGetJson({ host, port, path: "/" });
  }
  if (!json || !Array.isArray(json.algorithms)) return null;

  const algo = json.algorithms[0] || {};
  const hashrate = algo.hashrate || {};
  const shares = algo.shares || {};
  const pool = algo.pool || {};

  // Per-GPU hashrate map: { gpu1: bytes/s, ... } (exclude "total")
  const perGpu = {};
  const gpuMap = hashrate.gpu || {};
  for (const [key, val] of Object.entries(gpuMap)) {
    if (key === "total") continue;
    if (typeof val === "number") perGpu[key] = val;
  }

  return {
    source: "srbminer",
    rigName: json.rig_name || null,
    version: json.miner_version || null,
    miningTimeSec: json.mining_time ?? null,
    algorithm: algo.name || null,
    poolUrl: pool.pool || null,
    wallet: pool.wallet || null,
    // Share difficulty set by the pool (the "Diff" shown in the miner log)
    difficulty: pool.difficulty ?? null,
    latency: pool.latency ?? null,
    poolUptimeSec: pool.uptime ?? null,
    sharesTotal: shares.total ?? null,
    accepted: shares.accepted ?? null,
    rejected: shares.rejected ?? null,
    avgFindTime: shares.avg_find_time ?? null,
    hashrate1m: hashrate["1min"] ?? null,
    hashrate15m: hashrate["15min"] ?? null,
    hashrate1h: hashrate["1hr"] ?? null,
    hashrate6h: hashrate["6hr"] ?? null,
    perGpuHashrateHs: perGpu, // { gpu1: H/s }
    gpuAccepted: algo.gpu_accepted_shares || {},
    gpuRejected: algo.gpu_rejected_shares || {},
    gpuDevices: json.gpu_devices || [],
    raw: json,
  };
}

/**
 * XMRig HTTP API stats. Returns a normalized object or null if unreachable.
 */
async function queryXmrigStats({ host = "127.0.0.1", port = 60070 } = {}) {
  const json =
    (await httpGetJson({ host, port, path: "/2/summary" })) ||
    (await httpGetJson({ host, port, path: "/1/summary" }));
  if (!json) return null;

  const results = json.results || {};
  return {
    source: "xmrig",
    algorithm: json.algo || null,
    hashrate1m: Array.isArray(results.hashrate) ? results.hashrate[1] ?? results.hashrate[0] ?? null : null,
    accepted: results.shares_good ?? results.accepted ?? null,
    rejected:
      results.shares_total != null && results.shares_good != null
        ? results.shares_total - results.shares_good
        : results.shares_bad ?? null,
    difficulty: json.diff_current ?? null,
    uptimeSec: json.uptime ?? null,
    perGpuHashrateHs: {},
    raw: json,
  };
}

module.exports = { querySrbmizerStats, queryXmrigStats, httpGetJson };