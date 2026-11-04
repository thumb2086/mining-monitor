# mining-monitor

[![npm version](https://img.shields.io/npm/v/mining-monitor.svg)](https://www.npmjs.com/package/mining-monitor)
[![npm downloads](https://img.shields.io/npm/dm/mining-monitor.svg)](https://www.npmjs.com/package/mining-monitor)
[![license](https://img.shields.io/npm/l/mining-monitor.svg)](LICENSE)
[![node](https://img.shields.io/node/v/mining-monitor.svg)](https://nodejs.org)

[中文說明（繁體）→](README.zh-TW.md)

Terminal dashboard (TUI) for GPU mining rigs. Shows:

- **GPU panel** — per-GPU hashrate, power, temperature, fan, clocks (via `nvidia-smi`)
- **Network panel** — Pearl (PRL) block height, network difficulty, new blocks seen this session
- **Hashrate chart** — rolling hashrate series (TH/s)
- **Pool panel** — unMineable balance, 24h/7d rewards, payout-threshold progress
- **Event log** — new shares, new blocks, worker online/offline

Built for rigs mining **PearlPow / Etchash / RandomX** with **SRBMiner-MULTI** or **XMRig**, optionally reporting through [unMineable](https://unmineable.com).

```
┌────────────────────────┬────────────────────────┐
│ GPUs                   │ Miner (SRBMiner/XMRig) │
├────────────────────────┴────────────────────────┤
│ Hashrate (TH/s)                                 │
├─────────────────────────────────────────────────┤
│ Difficulty (M)                                  │
├──────────────────────────┬──────────────────────┤
│ Events                   │ Payout / Pearl       │
└──────────────────────────┴──────────────────────┘
```

## Install

```bash
npm install -g mining-monitor
# or run without installing:
npx mining-monitor
```

> Windows note: `nvidia-smi` must be on `PATH` (ships with NVIDIA drivers).

## Usage

```bash
mining-monitor                 # real data, 5s refresh
mining-monitor --demo          # simulated data (try it without a rig)
mining-monitor --interval 2    # 2s refresh
mining-monitor --coin DOGE --threshold 30
mining-monitor --srbminer-port 60130 --xmrig-port 60070

mining-monitor init            # set up unMineable API credentials (wizard)
mining-monitor check-pool      # test regional pool endpoints, pick the fastest

mining-monitor --dump          # print one full frame as plain text, then exit
npm run check                  # layout + chart regression test (no TTY needed)
```

Press `q` to quit.

`--dump` renders a single frame with simulated data and exits. It needs no
interactive terminal, so it is the quickest way to verify the layout still
looks right (in a terminal, a pipe, or CI). `npm run check` asserts that no two
panels overlap, that both charts keep a valid y-scale, that a line is actually
drawn, and that the GPU table drops optional columns instead of clipping on
narrow terminals.

### Pool endpoints can die from your network

unMineable runs regional stratum endpoints behind one hostname
(`pearlpow.unmineable.com` → `pearlpow-eu` by default). Some networks
(campus, ISP, VPN) **cannot reach some regions** — the connection just
times out and your rig silently stops earning while the miner looks
"running".

`mining-monitor check-pool` TCP-tests every region and tells you which
one is reachable from where you are:

```
$ mining-monitor check-pool
default  pearlpow.unmineable.com     165.227.236.217  DEAD (timeout)
eu       pearlpow-eu.unmineable.com  165.227.236.217  DEAD (timeout)
us       pearlpow-us.unmineable.com  138.197.88.7     OK    237 ms
asia     pearlpow-asia.unmineable.com 165.22.100.136  OK     72 ms

Fastest: pearlpow-asia.unmineable.com:3333 (72 ms, asia)

Use it in your miner command:
  --pool stratum+tcp://pearlpow-asia.unmineable.com:3333
```

Then point your miner at the working endpoint, e.g.:

```bash
SRBMiner-MULTI.exe --algorithm-gpu pearl --disable-cpu \
  --pool stratum+tcp://pearlpow-asia.unmineable.com:3333 \
  --wallet yourAlias.workerName --api-enable --api-port 60130
```

### Miners

Start your miner with its local API enabled so the dashboard can read it:

```bash
# SRBMiner-MULTI
SRBMiner-MULTI.exe --api-enable --api-port 60130 ...

# XMRig
xmrig.exe --http-port 60070 ...
```

Without a local miner API the dashboard still works — GPU, network, and pool panels remain live.

### unMineable (optional)

The pool panel needs unMineable API credentials. Provide them via **any** of:

1. Environment variables:
   ```bash
   UNMINEABLE_API_KEY=upk_...
   UNMINEABLE_API_SECRET=usk_...
   ```
2. `config.json` in the working directory:
   ```json
   { "unmineable": { "apiKey": "upk_...", "apiSecret": "usk_..." } }
   ```
3. `~/.mining-monitor.json` with the same shape.

Without credentials the pool panel just shows `-`.

## Data sources

| Panel | Source | Auth |
|---|---|---|
| GPUs | `nvidia-smi` | none |
| Miner shares / hashrate | SRBMiner `/stats` or XMRig `/2/summary` on localhost | none |
| Pearl block height / difficulty | `blockbook.pearlresearch.ai/api/v2/status` | none |
| Balance / rewards | unMineable API (HMAC-SHA256 signed) | API key |

## Notes

- **GDDR6 memory temperature**: RTX 30-series cards don't expose a memory junction temperature through `nvidia-smi`. The dashboard shows an estimate (core + ~12°C) — treat it as a hint, not a sensor reading.
- **Hashrate split**: when the miner API is unavailable, the rig total is split across GPUs using a fixed ratio (`--demo` shows the same behaviour). Real per-GPU attribution needs the miner API.
- **Windows / Linux / macOS**: the GPU panel requires NVIDIA + `nvidia-smi`. Pool and network panels work anywhere with Node 18+.

## Roadmap

- [ ] Per-GPU hashrate from SRBMiner API when available
- [ ] CSV session log export
- [ ] Webhook alerts (Discord / Telegram) on offline / hashrate drop
- [ ] Difficulty history chart for any coin (not just PRL)
- [ ] ethOS / HiveOS agent mode

## License

MIT
