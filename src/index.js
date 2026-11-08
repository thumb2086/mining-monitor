"use strict";

const readline = require("readline");
const { checkPool } = require("./checkpool.js");
const { queryGpus } = require("./gpu.js");
const { querySrbmizerStats, queryXmrigStats } = require("./miner.js");
const {
  loadCredentials,
  saveCredentials,
  getWorkers,
  getCoinStats,
  getEvents,
  getAssets,
  getPearlStatus,
} = require("./pool.js");
const { Dashboard } = require("./ui.js");

function parseArgs(argv) {
  const args = {
    command: "run",
    demo: false,
    interval: 5000,
    coin: "DOGE",
    threshold: 30,
    srbminerPort: 60130,
    xmrigPort: 60070,
    apiKey: undefined,
    apiSecret: undefined,
    saveKeys: false,
    dump: false,
    dumpCols: 120,
    dumpRows: 42,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "init") args.command = "init";
    else if (a === "check-pool") args.command = "check-pool";
    else if (a === "--demo") args.demo = true;
    else if (a === "--interval") args.interval = (parseInt(argv[++i], 10) || 5) * 1000;
    else if (a === "--coin") args.coin = argv[++i] || args.coin;
    else if (a === "--threshold") args.threshold = parseFloat(argv[++i]) || args.threshold;
    else if (a === "--srbminer-port") args.srbminerPort = parseInt(argv[++i], 10) || args.srbminerPort;
    else if (a === "--xmrig-port") args.xmrigPort = parseInt(argv[++i], 10) || args.xmrigPort;
    else if (a === "--port") args.poolPort = parseInt(argv[++i], 10) || 3333;
    else if (a === "--api-key") args.apiKey = argv[++i];
    else if (a === "--api-secret") args.apiSecret = argv[++i];
    else if (a === "--save-keys") args.saveKeys = true;
    else if (a === "--dump") args.dump = true;
    else if (a === "--dump-cols") args.dumpCols = parseInt(argv[++i], 10) || args.dumpCols;
    else if (a === "--dump-rows") args.dumpRows = parseInt(argv[++i], 10) || args.dumpRows;
    else if (a === "--help" || a === "-h") args.help = true;
    else positional.push(a);
  }
  if (positional.length > 0 && positional[0] === "init") args.command = "init";
  return args;
}

function printHelp() {
  console.log(`mining-monitor — terminal dashboard for GPU mining rigs

Usage:
  mining-monitor [options]          run the dashboard
  mining-monitor init               set up unMineable API credentials
  mining-monitor check-pool         test regional pool endpoints, pick fastest

Options:
  --demo                run with simulated data (no GPU / API needed)
  --interval <sec>      refresh interval, default 5
  --coin <SYMBOL>       payout coin for balance panel, default DOGE
  --threshold <n>       payout threshold for progress %, default 30
  --srbminer-port <p>   SRBMiner local API port, default 60130
  --xmrig-port <p>      XMRig HTTP API port, default 60070
  --api-key <upk_...>   unMineable API key (or set UNMINEABLE_API_KEY)
  --api-secret <usk_...> unMineable API secret (or set UNMINEABLE_API_SECRET)
  --save-keys           save --api-key/--api-secret to ${require("./pool.js").HOME_CONFIG}
  --dump                print one full frame as plain text and exit (layout check)
  --dump-cols <n>       width used by --dump, default 120
  --dump-rows <n>       height used by --dump, default 42
  -h, --help            this help

Credential lookup order:
  --api-key/--api-secret  >  env vars  >  ./config.json  >
  ~/.mining-monitor.json  >  %USERPROFILE%\\.thumb-secrets\\unmineable.env

Keys:  q  quit
`);
}

// ---------------------------------------------------------------------------
// init wizard
// ---------------------------------------------------------------------------

/**
 * Buffered line asker. Plain rl.question() loses lines when input is piped
 * (several lines may arrive in one chunk before the next question is asked).
 */
function makeAsker(rl) {
  const queue = [];
  const waiters = [];
  rl.on("line", (line) => {
    const v = line.trim();
    if (waiters.length) waiters.shift()(v);
    else queue.push(v);
  });
  return (question) => {
    process.stdout.write(question);
    if (queue.length) return Promise.resolve(queue.shift());
    return new Promise((resolve) => waiters.push(resolve));
  };
}

async function runInit() {
  const rl = readline.createInterface({ input: process.stdin });
  const ask = makeAsker(rl);
  console.log("mining-monitor — unMineable credential setup");
  console.log("(create an API key at https://unmineable.com → account → API)\n");
  const apiKey = await ask("Public key (upk_...): ");
  const apiSecret = await ask("Secret (usk_...):     ");
  rl.close();

  if (!apiKey || !apiSecret) {
    console.error("Both the public key and secret are required.");
    process.exit(1);
  }
  if (!apiKey.startsWith("upk_") || !apiSecret.startsWith("usk_")) {
    console.error("That doesn't look right — keys should start with upk_ / usk_.");
    process.exit(1);
  }

  const file = saveCredentials({ apiKey, apiSecret });
  console.log(`\nSaved to ${file}`);

  // Verify immediately
  const creds = { apiKey, apiSecret };
  const { getCoinStats } = require("./pool.js");
  const stats = await getCoinStats(creds, "DOGE");
  if (stats) {
    console.log(`Verified ✓  DOGE balance: ${stats.balance}`);
  } else {
    console.log("Could not verify against the API right now (offline or keys not active yet).");
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) return printHelp();
  if (args.command === "init" && !args.demo) return runInit();
  if (args.command === "check-pool") return checkPool({ port: args.poolPort || 3333 });

  // --dump renders one full frame as plain text, so the layout can be checked
  // without an interactive terminal (pipes, CI, other tools).
  const dashOpts = { title: "mining-monitor", demo: args.demo };
  if (args.dump) {
    const { Writable, PassThrough } = require("stream");
    const out = new Writable({
      write(chunk, enc, cb) {
        cb();
      },
    });
    out.columns = args.dumpCols;
    out.rows = args.dumpRows;
    out.isTTY = true;
    dashOpts.output = out;
    dashOpts.input = new PassThrough();
  }

  const dash = new Dashboard(dashOpts);
  let dumpTicks = 0;
  dash.logLine(args.demo ? "starting in demo mode" : "starting — polling GPU / miner / pool");

  const creds = args.demo
    ? null
    : loadCredentials({ apiKey: args.apiKey, apiSecret: args.apiSecret });

  if (!args.demo) {
    const src = creds
      ? require("path").basename(String(creds.source))
      : "";
    dash.logLine(
      creds
        ? `{green-fg}unMineable credentials loaded{/} (${src})`
        : "no unMineable credentials — payout panel disabled (run: mining-monitor init)"
    );
    if (args.saveKeys && args.apiKey && args.apiSecret) {
      const f = saveCredentials({ apiKey: args.apiKey, apiSecret: args.apiSecret });
      dash.logLine(`keys saved to ${f}`);
    }
  }

  // Session tracking
  let startBlockHeight = null;
  let lastBlockHeight = null;
  let sessionBlocks = 0;
  let lastAccepted = null;
  let lastNewBlockAt = null;
  // Cache the last good miner sample — the SRBMiner API drops fields for a
  // short while right after a pool reconnect, so keep showing the last values.
  let lastMiner = null;
  let lastMinerAt = 0;
  let loggedWorkers = false;

  async function tick() {
    dash.begin();
    try {
      // --- GPUs (nvidia-smi) ----------------------------------------------
      const gpus = args.demo ? demoGpu() : await queryGpus();

      // --- Miner (local API) ------------------------------------------------
      let miner = null;
      if (args.demo) {
        const t = Date.now() / 1000;
        miner = {
          source: "demo",
          rigName: "demo-rig",
          version: "3.8.0",
          algorithm: "pearlhash",
          difficulty: 4194304,
          accepted: Math.floor(t / 45),
          rejected: 0,
          avgFindTime: 42,
          hashrate1m: (66.8 + Math.sin(t / 20) * 1.2) * 1e12,
          hashrate15m: 66.5e12,
          hashrate1h: 66.3e12,
          latency: 12,
          poolUptimeSec: t % 86400,
          perGpuHashrateHs: {},
        };
      } else {
        miner = await querySrbmizerStats({ port: args.srbminerPort });
        if (!miner) miner = await queryXmrigStats({ port: args.xmrigPort });
        if (miner) {
          lastMiner = miner;
          lastMinerAt = Date.now();
        } else if (lastMiner && Date.now() - lastMinerAt < 90000) {
          // API hiccup or post-reconnect field drop — show the last sample.
          miner = { ...lastMiner, stale: true };
        }
      }

      // --- Attribute hashrate per GPU ---------------------------------------
      let rows;
      if (miner && miner.perGpuHashrateHs && Object.keys(miner.perGpuHashrateHs).length > 0) {
        // SRBMiner reports per-GPU rates keyed "gpu1", "gpu2", ...
        // Map them to nvidia-smi GPUs in order.
        const keys = Object.keys(miner.perGpuHashrateHs).sort(
          (a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)
        );
        rows = gpus.map((g, i) => {
          const k = keys[i];
          const hs = k != null ? miner.perGpuHashrateHs[k] : null;
          return { ...g, hashrateTh: hs != null ? hs / 1e12 : null };
        });
      } else if (miner && miner.hashrate1m) {
        // Fallback: no per-GPU data — split evenly.
        const per = miner.hashrate1m / 1e12 / Math.max(gpus.length, 1);
        rows = gpus.map((g) => ({ ...g, hashrateTh: per }));
      } else {
        rows = gpus.map((g) => ({ ...g, hashrateTh: null }));
      }
      dash.setGpu(rows);

      // --- Events (unMineable dashboard events: rewards, worker status) ---
      let events = null;
      let assets = null;
      if (args.demo) {
        events = {
          events: [
            { type: "reward", timestamp: Math.floor((Date.now() - 5 * 60 * 1000) / 1000), amount: 0.04654432, coin: args.coin },
            { type: "reward", timestamp: Math.floor((Date.now() - 10 * 60 * 1000) / 1000), amount: 0.04623057, coin: args.coin },
            { type: "reward", timestamp: Math.floor((Date.now() - 15 * 60 * 1000) / 1000), amount: 0.04673190, coin: args.coin },
          ],
        };
        assets = [
          { coin: args.coin, amount: "24.2804", reward_ratio: "0.9", is_active: true },
          { coin: "LTC", amount: "0.0000", reward_ratio: "0.1", is_active: true },
        ];
      } else if (creds) {
        events = await getEvents(creds, 1);
        assets = await getAssets(creds);
      }

      // --- Stats panels -------------------------------------------------------
      if (miner) {
        dash.setMiner(miner);
        if (miner.hashrate1m) dash.pushHashrate(miner.hashrate1m / 1e12);

        // Share events
        if (miner.accepted != null && miner.accepted !== lastAccepted) {
          const delta = lastAccepted != null ? miner.accepted - lastAccepted : 0;
          if (delta > 0) {
            dash.logLine(
              `{green-fg}+${delta} share(s){/} — accepted ${miner.accepted}, rejected ${miner.rejected ?? "?"}` +
                (miner.difficulty ? `, diff ${miner.difficulty}` : "")
            );
          }
          lastAccepted = miner.accepted;
        }
      } else if (!args.demo) {
        dash.setMiner(null);
      }

      // --- Pearl network ------------------------------------------------------
      const pearl = args.demo
        ? {
            blockHeight: 137839 + Math.floor((Date.now() % 3600000) / 120000),
            difficulty: 51798493 + Math.random() * 1000,
            lastBlockTime: new Date().toISOString(),
            inSync: true,
          }
        : await getPearlStatus();

      if (pearl && pearl.blockHeight != null) {
        if (pearl.difficulty != null) dash.pushDifficulty(pearl.difficulty / 1e6);
        if (startBlockHeight == null) {
          startBlockHeight = pearl.blockHeight;
          dash.logLine(`Pearl connected — height ${pearl.blockHeight}, diff ${Number(pearl.difficulty).toExponential(3)}`);
        }
        if (lastBlockHeight != null && pearl.blockHeight > lastBlockHeight) {
          const n = pearl.blockHeight - lastBlockHeight;
          sessionBlocks += n;
          lastNewBlockAt = new Date().toLocaleTimeString();
          dash.logLine(`{yellow-fg}new Pearl block${n > 1 ? "s" : ""}: +${n}{/} → height ${pearl.blockHeight}`);
        }
        lastBlockHeight = pearl.blockHeight;
      }

      // --- unMineable pool ----------------------------------------------------
      let pool = {};
      if (args.demo) {
        pool = {
          balance: 24.28 + (Date.now() % 1000000) / 100000000,
          threshold: args.threshold,
          rewarded24h: 11.67,
          rewarded7d: 23.8,
          paid: 0,
        };
      } else if (creds) {
        const [stats, workers] = await Promise.all([
          getCoinStats(creds, args.coin),
          getWorkers(creds, "page=1"),
        ]);
        if (stats) {
          pool = {
            balance: parseFloat(stats.balance || "0"),
            threshold: args.threshold,
            rewarded24h: parseFloat(stats.rewarded?.past_24h || "0"),
            rewarded7d: parseFloat(stats.rewarded?.past_7d || "0"),
            paid: parseFloat(stats.paid || "0"),
          };
        }
        if (workers && Array.isArray(workers.workers) && !loggedWorkers) {
          const online = workers.workers.filter((w) => w.online).length;
          dash.logLine(
            online === workers.workers.length
              ? `{green-fg}workers online: ${online}/${workers.workers.length}{/}`
              : `{yellow-fg}workers online: ${online}/${workers.workers.length}{/}`
          );
          loggedWorkers = true;
        }
      }

      dash.setRight({
        pool,
        net: {
          blockHeight: pearl ? pearl.blockHeight : null,
          difficulty: pearl ? pearl.difficulty : null,
          sessionBlocks,
        },
        events,
        assets,
        coin: args.coin,
        algorithm: miner ? miner.algorithm : null,
      });
    } catch (err) {
      dash.logLine(`{red-fg}error:{/} ${err && err.message ? err.message : err}`);
      if (process.env.MINING_DEBUG) {
        console.error(err && err.stack ? err.stack : err);
      }
    }
    dash.refresh();
    if (args.dump && ++dumpTicks >= 12) {
      dumpScreen(dash);
      process.exit(0);
    }
  }

  await tick();
  if (args.dump) {
    // Fast-forward a few samples so the charts have a visible curve.
    for (let i = 0; i < 11; i++) await tick();
    return;
  }
  setInterval(tick, args.interval);
}

/**
 * Print the current blessed screen buffer as plain text. blessed stores every
 * rendered cell in screen.lines as [attr, char], so we can reconstruct the
 * exact frame that would have been drawn.
 */
function dumpScreen(dash) {
  const lines = dash.screen.lines || [];
  const text = lines
    .map((row) => row.map((cell) => (cell && cell[1]) || " ").join("").replace(/\s+$/, ""))
    .join("\n");
  process.stdout.write(text + "\n");
}

function demoGpu() {
  const t = Date.now() / 1000;
  return [
    {
      index: 0,
      name: "NVIDIA GeForce RTX 3060 Ti",
      tempC: 72 + Math.sin(t / 30) * 1.5,
      powerW: 223 + Math.sin(t / 17) * 4,
      powerLimitW: 240,
      coreClockMhz: 1890,
      memClockMhz: 9251,
      fanPercent: 81,
      utilization: 100,
      memUsedMiB: 1400,
      memTotalMiB: 8192,
      memTempC: null,
    },
    {
      index: 1,
      name: "NVIDIA GeForce GTX 1660 Ti",
      tempC: 61 + Math.sin(t / 25) * 1.2,
      powerW: 55 + Math.sin(t / 13) * 2,
      powerLimitW: 120,
      coreClockMhz: 1400,
      memClockMhz: 6000,
      fanPercent: 60,
      utilization: 100,
      memUsedMiB: 900,
      memTotalMiB: 6144,
      memTempC: null,
    },
  ];
}

module.exports = { main };