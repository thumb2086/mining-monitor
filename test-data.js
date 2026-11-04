"use strict";
// Quick data-module smoke test (no TUI).
const { queryGpus } = require("./src/gpu.js");
const { querySrbmizerStats, queryXmrigStats } = require("./src/miner.js");
const { loadCredentials, getCoinStats, getWorkers, getPearlStatus } = require("./src/pool.js");

(async () => {
  console.log("== GPUs (nvidia-smi) ==");
  const gpus = await queryGpus();
  console.log(JSON.stringify(gpus, null, 2));

  console.log("\n== SRBMiner local API (60130) ==");
  const srb = await querySrbmizerStats({ port: 60130 });
  console.log(srb ? JSON.stringify({ source: srb.source, algo: srb.algorithm, hs: srb.hashrateHs, a: srb.accepted, r: srb.rejected, diff: srb.difficulty }, null, 2) : "not reachable");

  console.log("\n== XMRig local API (60070) ==");
  const xmr = await queryXmrigStats({ port: 60070 });
  console.log(xmr ? JSON.stringify({ source: xmr.source, hs: xmr.hashrateHs, a: xmr.accepted, r: xmr.rejected }, null, 2) : "not reachable");

  console.log("\n== Credentials ==");
  const creds = loadCredentials();
  console.log(creds ? `loaded (key ...${creds.apiKey.slice(-6)})` : "not found");

  if (creds) {
    console.log("\n== DOGE stats ==");
    const stats = await getCoinStats(creds, "DOGE");
    console.log(stats ? JSON.stringify({ balance: stats.balance, r24h: stats.rewarded.past_24h, r7d: stats.rewarded.past_7d, paid: stats.paid }, null, 2) : "no data");

    console.log("\n== Workers ==");
    const workers = await getWorkers(creds);
    console.log(workers ? JSON.stringify(workers.workers.map(w => ({ name: w.name, algo: w.algorithm, online: w.online, hashrate: w.hashrate })), null, 2) : "no data");
  }

  console.log("\n== Pearl blockbook ==");
  const pearl = await getPearlStatus();
  console.log(pearl ? JSON.stringify(pearl, null, 2) : "no data");
})();