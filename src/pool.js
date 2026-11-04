"use strict";

/**
 * Pool / network data clients.
 *
 * - unMineable API (HMAC-SHA256 signed): worker hashrate, balances, events.
 * - Pearl blockbook API (public): block height, network difficulty, last block.
 */

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const UNMINEABLE_HOST = "api.unmineable.dev";
const HOME_CONFIG = path.join(os.homedir(), ".mining-monitor.json");

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

function loadEnvFile(file) {
  const out = {};
  try {
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
  return out;
}

function readJsonCreds(file) {
  try {
    const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    const u = cfg.unmineable || {};
    if (u.apiKey && u.apiSecret) {
      return { apiKey: u.apiKey, apiSecret: u.apiSecret, source: file };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Credential lookup order:
 *   1. explicit overrides (--api-key / --api-secret)
 *   2. process.env UNMINEABLE_API_KEY / UNMINEABLE_API_SECRET
 *   3. ./config.json   { "unmineable": { "apiKey": "...", "apiSecret": "..." } }
 *   4. ~/.mining-monitor.json (same shape)
 *   5. %USERPROFILE%\.thumb-secrets\unmineable.env (this machine's usual spot)
 */
function loadCredentials(overrides = {}) {
  if (overrides.apiKey && overrides.apiSecret) {
    return { apiKey: overrides.apiKey, apiSecret: overrides.apiSecret, source: "cli" };
  }

  const env = process.env;
  if (env.UNMINEABLE_API_KEY && env.UNMINEABLE_API_SECRET) {
    return {
      apiKey: env.UNMINEABLE_API_KEY,
      apiSecret: env.UNMINEABLE_API_SECRET,
      source: "env",
    };
  }

  const files = [path.resolve(process.cwd(), "config.json"), HOME_CONFIG];
  for (const f of files) {
    const creds = readJsonCreds(f);
    if (creds) return creds;
  }

  if (os.homedir()) {
    const thumbEnv = path.join(os.homedir(), ".thumb-secrets", "unmineable.env");
    const vars = loadEnvFile(thumbEnv);
    if (vars.UNMINEABLE_API_KEY && vars.UNMINEABLE_API_SECRET) {
      return {
        apiKey: vars.UNMINEABLE_API_KEY,
        apiSecret: vars.UNMINEABLE_API_SECRET,
        source: thumbEnv,
      };
    }
  }

  return null;
}

/** Persist credentials to ~/.mining-monitor.json (mode 0600 where supported). */
function saveCredentials({ apiKey, apiSecret }) {
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(HOME_CONFIG, "utf8"));
  } catch {
    /* new file */
  }
  cfg.unmineable = { apiKey, apiSecret };
  fs.writeFileSync(HOME_CONFIG, JSON.stringify(cfg, null, 2), { encoding: "utf8", mode: 0o600 });
  return HOME_CONFIG;
}

// ---------------------------------------------------------------------------
// unMineable signed API
// ---------------------------------------------------------------------------

function signRequest({ apiKey, apiSecret }, method, reqPath, rawQuery, bodyStr) {
  const ts = Date.now().toString();
  const bodyHash = crypto.createHash("sha256").update(bodyStr || "").digest("hex");
  const payload = [method.toUpperCase(), reqPath, rawQuery || "", ts, bodyHash].join("\n");
  const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");
  return {
    "x-user-api-key": apiKey,
    "x-user-api-timestamp": ts,
    "x-user-api-signature": signature,
    "Content-Type": "application/json",
  };
}

async function unmineableFetch(creds, method, reqPath, query = "", body = "") {
  if (!creds) return null;
  const url = `https://${UNMINEABLE_HOST}${reqPath}${query ? `?${query}` : ""}`;
  const headers = signRequest(creds, method, reqPath, query, body);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Worker list (hashrate, online state). */
async function getWorkers(creds, query = "page=1") {
  const json = await unmineableFetch(creds, "GET", "/v1/workers", query);
  return json && json.success ? json.data : null;
}

/** Balance + rewards for a coin (default DOGE). */
async function getCoinStats(creds, coin = "DOGE") {
  const json = await unmineableFetch(creds, "GET", `/v1/assets/${coin}/stats`);
  return json && json.success ? json.data : null;
}

/** Recent dashboard events (rewards, worker online/offline). */
async function getEvents(creds, page = 1) {
  const json = await unmineableFetch(creds, "GET", "/v1/dashboard/events", `page=${page}`);
  return json && json.success ? json.data : null;
}

// ---------------------------------------------------------------------------
// Pearl blockbook (public, no auth)
// ---------------------------------------------------------------------------

async function getPearlStatus() {
  try {
    const res = await fetch("https://blockbook.pearlresearch.ai/api/v2/status", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const b = json.backend || {};
    const bk = json.blockbook || {};
    return {
      blockHeight: b.blocks ?? null,
      difficulty: b.difficulty != null ? parseFloat(b.difficulty) : null,
      lastBlockTime: bk.lastBlockTime ?? null,
      inSync: bk.inSync ?? null,
    };
  } catch {
    return null;
  }
}

module.exports = {
  HOME_CONFIG,
  loadCredentials,
  saveCredentials,
  unmineableFetch,
  getWorkers,
  getCoinStats,
  getEvents,
  getPearlStatus,
};