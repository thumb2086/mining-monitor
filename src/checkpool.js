"use strict";

/**
 * Pool endpoint health check.
 *
 * unMineable runs regional stratum endpoints. The default hostname
 * (pearlpow.unmineable.com → pearlpow-eu) is not reachable from every
 * network (some campus/ISP routes drop it). This command TCP-tests each
 * known regional endpoint and recommends the fastest reachable one.
 *
 * Usage: mining-monitor check-pool [--port 3333]
 */

const dns = require("dns");
const net = require("net");

const REGIONS = {
  default: "pearlpow.unmineable.com",
  eu: "pearlpow-eu.unmineable.com",
  us: "pearlpow-us.unmineable.com",
  asia: "pearlpow-asia.unmineable.com",
};

function resolveName(name) {
  return new Promise((resolve) => {
    dns.lookup(name, { all: true }, (e, a) =>
      resolve(e ? null : [...new Set(a.map((x) => x.address))])
    );
  });
}

function tryConnect(host, port, timeout = 6000) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout });
    const t0 = Date.now();
    s.on("connect", () => {
      s.destroy();
      resolve({ ok: true, ms: Date.now() - t0, address: s.remoteAddress });
    });
    s.on("timeout", () => {
      s.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    s.on("error", (e) => resolve({ ok: false, error: e.code }));
  });
}

async function checkPool({ port = 3333 } = {}) {
  console.log("unMineable PearlPow endpoint check (TCP port " + port + ")\n");
  const results = [];
  for (const [region, host] of Object.entries(REGIONS)) {
    const ips = await resolveName(host);
    if (!ips) {
      console.log(region.padEnd(8), host.padEnd(36), "DNS: not found");
      continue;
    }
    for (const ip of ips) {
      const r = await tryConnect(ip, port);
      const status = r.ok ? "OK  " + String(r.ms).padStart(5) + " ms" : "DEAD (" + r.error + ")";
      console.log(region.padEnd(8), host.padEnd(36), ip.padEnd(16), status);
      if (r.ok) results.push({ region, host, ip, ms: r.ms });
    }
  }

  console.log("");
  if (results.length === 0) {
    console.log("No reachable endpoint on port " + port + ".");
    console.log("Try port 443, or check your network / firewall.");
    process.exitCode = 1;
    return;
  }
  results.sort((a, b) => a.ms - b.ms);
  const best = results[0];
  console.log(
    "Fastest: " + best.host + ":" + port + " (" + best.ms + " ms, " + best.region + ")"
  );
  console.log("\nUse it in your miner command:");
  console.log(
    "  --pool stratum+tcp://" + best.host + ":" + port
  );
}

module.exports = { checkPool };