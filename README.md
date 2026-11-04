# mining-monitor

[![npm version](https://img.shields.io/npm/v/mining-monitor.svg)](https://www.npmjs.com/package/mining-monitor)
[![npm downloads](https://img.shields.io/npm/dm/mining-monitor.svg)](https://www.npmjs.com/package/mining-monitor)
[![license](https://img.shields.io/npm/l/mining-monitor.svg)](LICENSE)
[![node](https://img.shields.io/node/v/mining-monitor.svg)](https://nodejs.org)

[中文說明（繁體）→](README.zh-TW.md)

Terminal dashboard for GPU mining rigs — hashrate, difficulty, blocks, shares and
unMineable payouts in one screen, refreshed every few seconds.

Built for rigs mining **PearlPow / Etchash / RandomX** with **SRBMiner-MULTI** or
**XMRig**, optionally reporting through [unMineable](https://unmineable.com).

```
┌─ GPUs ─────────────────────────────────────────┐┌─ Miner ────────────────────────────────────────┐
│#  Name            TH/s   W    Temp Fan         ││Item          Value                             │
│                                                ││                                                │
│ 0  RTX 3060 Ti     64.82  223  72C  81%        ││ Rig           SRBMiner-Multi-Rig (v3.8.0)      │
│ 1  GTX 1660 Ti     28.41  56   61C  60%        ││ Algorithm     pearlhash                        │
│                                                ││ Share diff    4194304                          │
│                                                ││ Shares A/R    27 / 1                           │
│                                                ││ Avg find time 3m 31s                           │
│                                                ││ Hashrate 1m   64.12 TH/s                       │
│                                                ││ Hashrate 15m  63.62 TH/s                       │
│                                                ││ Hashrate 1h   62.71 TH/s                       │
│                                                ││ Latency       439 ms                           │
└────────────────────────────────────────────────┘└────────────────────────────────────────────────┘
┌─ Hashrate (TH/s) ────────────────────────────────────────────────────────────────────────────────┐
│     ⡇          ⢀⣀⣀⡠⠤⠤⠤⠤⠤⠤⠤⣀⣀⣀⣀                                                           ⣀⣀⣀⠤⠤⠤⠤⠤│
│  64 ⡇   ⣀⡠⠤⠔⠒⠊⠉⠁              ⠉⠉⠉⠒⠒⠤⠤⣀                                            ⣀⡠⠤⠔⠒⠉⠉        │
│     ⡇⠤⠒⠉                              ⠉⠒⠢⢄⣀                                ⢀⣀⡠⠤⠔⠊⠉               │
│  63 ⡇                                      ⠉⠑⠒⠢⠤⢄⣀⡀                   ⣀⡠⠔⠒⠉⠁                     │
│     ⡇                                             ⠈⠉⠉⠑⠒⠒⠒⠤⠤⠤⠤⠤⠤⠤⠤⠒⠒⠒⠉⠉                           │
│  61 ⡇                                                                                            │
│     ⠓⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒│
│      14:29:33   14:29:33    14:29:33   14:29:33    14:29:33    14:29:33   14:29:33    14:29:33   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌─ Difficulty (M) ─────────────────────────────────────────────────────────────────────────────────┐
│  53 ⡇  ⣀⣀⣀⡠⠤⠤⠤⠔⠒⠒⠒⠊⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠒⠒⠒⠒⠤⠤⠤⢄⣀⣀⣀⡀                                              ⣀⣀⣀⣀⣀│
│  51 ⡇⠉⠉                                      ⠈⠉⠉⠉⠑⠒⠒⠒⠢⠤⠤⠤⣀⣀⣀⣀               ⢀⣀⣀⣀⡠⠤⠤⠤⠔⠒⠒⠒⠉⠉⠉⠉     │
│  50 ⡇                                                        ⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠁                    │
│     ⠓⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒│
│      14:29:33   14:29:33    14:29:33   14:29:33    14:29:33    14:29:33   14:29:33    14:29:33   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─ Events ───────────────────────────────────────────────┐┌─ Payout / Pearl network ──────────────┐
│[14:29:33] Pearl connected - height 138140              ││Item         Value                     │
│[14:29:33] workers online: 1/1                          ││                                       │
│[14:29:33] +1 share - accepted 27, rejected 1           ││ Balance      28.1685 DOGE 94%         │
│                                                        ││ 24h Reward   7.4530 DOGE              │
│                                                        ││ 7d Reward    28.0002 DOGE             │
│                                                        ││ Pearl Height 138140                   │
│                                                        ││ New Blocks   +0                       │
│                                                        ││ Net Diff     5.23e+7                  │
└────────────────────────────────────────────────────────┘└───────────────────────────────────────┘
```

## What it shows

| Panel | Contents |
|---|---|
| **GPUs** | per-GPU hashrate, power, temperature, fan, clocks (from `nvidia-smi`) |
| **Miner** | algorithm, share difficulty, accepted/rejected shares, avg find time, 1m/15m/1h hashrate, pool latency, uptime |
| **Hashrate chart** | rolling series, auto-scaled so small variation is visible |
| **Difficulty chart** | Pearl network difficulty (millions) |
| **Payout** | unMineable balance, 24h/7d rewards, progress to the payout threshold |
| **Events** | new shares, new blocks, workers coming online, connection changes |

## Requirements

- **Node.js 18+**
- **NVIDIA GPU + `nvidia-smi` on `PATH`** for the GPU panel (ships with the driver).
  Everything else works without it.
- A miner with its **local API enabled** for the Miner panel — optional.
- A terminal with a font that has box-drawing and braille characters
  (Windows Terminal, iTerm2, GNOME Terminal all do).

## Install

```bash
npm install -g mining-monitor     # global command
npx mining-monitor                # or run without installing
```

From source:

```bash
git clone https://github.com/thumb2086/mining-monitor.git
cd mining-monitor
npm install
npm start
```

Windows users can also double-click **`run.bat`** (it installs dependencies on
first run).

## Usage

```bash
mining-monitor                 # live data, 5s refresh
mining-monitor --demo          # simulated data — no GPU or miner needed
mining-monitor --interval 2    # refresh every 2 seconds
mining-monitor --coin DOGE --threshold 30
mining-monitor --srbminer-port 60130 --xmrig-port 60070
```

| Flag | Default | Meaning |
|---|---|---|
| `--demo` | off | simulated data, no GPU / miner / API needed |
| `--interval <sec>` | `5` | refresh interval |
| `--coin <SYMBOL>` | `DOGE` | payout coin shown in the payout panel |
| `--threshold <n>` | `30` | payout threshold, used for the progress bar |
| `--srbminer-port <p>` | `60130` | SRBMiner local API port |
| `--xmrig-port <p>` | `60070` | XMRig HTTP API port |
| `--api-key <upk_...>` | — | unMineable API key (overrides stored keys) |
| `--api-secret <usk_...>` | — | unMineable API secret |
| `--save-keys` | off | persist `--api-key` / `--api-secret` to `~/.mining-monitor.json` |
| `--dump` | off | print one full frame as plain text, then exit |
| `--dump-cols <n>` | `120` | width used by `--dump` |
| `--dump-rows <n>` | `42` | height used by `--dump` |
| `-h`, `--help` | — | full option list |

Commands:

```bash
mining-monitor init        # interactive wizard for unMineable API keys
mining-monitor check-pool  # TCP-test every regional pool endpoint
```

Press **`q`** or **`Ctrl+C`** to quit.

### `--dump`: check the layout without a terminal

`--dump` renders one frame with simulated data and exits as plain text. It needs
no interactive terminal, so it works in pipes, CI, or when you just want to check
that nothing is misaligned:

```bash
mining-monitor --demo --dump --dump-cols 100 --dump-rows 42
```

## Miners

Start the miner with its local API enabled so the dashboard can read it:

```bash
# SRBMiner-MULTI (PearlPow example)
SRBMiner-MULTI.exe --algorithm-gpu pearl --disable-cpu \
  --pool stratum+tcp://pearlpow-asia.unmineable.com:3333 \
  --wallet YOURALIAS.workerName \
  --api-enable --api-port 60130

# XMRig
xmrig.exe --http-port 60070 ...
```

Without a local miner API the dashboard still runs — the GPU, network and payout
panels stay live, and the Miner panel shows `miner API unreachable`.

## Configuration (unMineable keys)

The payout panel needs unMineable API credentials (Account → API on unmineable.com).
Highest priority first:

| # | Where | How |
|---|---|---|
| 1 | command line | `--api-key upk_... --api-secret usk_...` (+ `--save-keys` to store) |
| 2 | environment | `UNMINEABLE_API_KEY` / `UNMINEABLE_API_SECRET` |
| 3 | `./config.json` | `{ "unmineable": { "apiKey": "upk_...", "apiSecret": "usk_..." } }` |
| 4 | `~/.mining-monitor.json` | same shape, written by `mining-monitor init` |
| 5 | `%USERPROFILE%\.thumb-secrets\unmineable.env` | legacy fallback, `KEY=value` lines |

`config.example.json` in this repo shows the file format.

Without credentials the payout panel simply shows `-` — nothing else breaks.

## Pool endpoints can die from your network

unMineable runs regional stratum endpoints behind one hostname, and the default
is Europe. Some networks (campus, ISP, VPN) **cannot reach some regions** — the
TCP connection just times out. The miner keeps reconnecting, looks "running", and
earns nothing.

`check-pool` tests every region from where you actually are:

```
$ mining-monitor check-pool
unMineable PearlPow endpoint check (TCP port 3333)

default  pearlpow.unmineable.com       165.227.236.217  DEAD (timeout)
eu       pearlpow-eu.unmineable.com    165.227.236.217  DEAD (timeout)
us       pearlpow-us.unmineable.com    138.197.88.7     OK    237 ms
asia     pearlpow-asia.unmineable.com  165.22.100.136   OK     72 ms

Fastest: pearlpow-asia.unmineable.com:3333 (72 ms, asia)
```

Then point the miner at the reachable endpoint:

```bash
--pool stratum+tcp://pearlpow-asia.unmineable.com:3333
```

Use `--port 3333` with `check-pool` if your pool listens on a different port.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Miner panel says `miner API unreachable` | the miner was started without `--api-enable` / `--http-port`; or it just reconnected — the dashboard keeps the last sample for 30s and marks it `stale` |
| **Dashboard shows the rig running but unMineable reports the worker offline** | run `mining-monitor check-pool` and switch to a reachable region — this is the most common cause |
| Charts look empty / flat | they need at least 2 samples; with `--interval 5` that is 10 seconds. Flat but present means the value really is constant |
| GPU panel empty | `nvidia-smi` not on `PATH`, or no NVIDIA GPU |
| Memory temperature shows `N/A` | RTX 30-series GDDR6 junction temperature is not exposed via `nvidia-smi` |
| Boxes or braille look broken | use a UTF-8 terminal (Windows Terminal, not the legacy console) with a programming font |
| Payout panel shows `-` | no credentials configured, or the unMineable API rejected them |

## Data sources

| Panel | Source | Auth |
|---|---|---|
| GPUs | `nvidia-smi` | none |
| Shares / hashrate / per-GPU split | SRBMiner local API (`GET /`) or XMRig (`/2/summary`) | none |
| Pearl block height / difficulty | `blockbook.pearlresearch.ai/api/v2/status` | none |
| Balance / rewards | unMineable API (HMAC-SHA256 signed) | API key |

## Development

```bash
npm start          # real data
npm run demo       # simulated data
npm run dump       # one frame as text (layout check, no TTY needed)
npm run check      # layout + chart regression test
```

`npm run check` asserts that no two panels overlap, that both charts keep a valid
y-scale and actually draw, that the plot fills the box with the x-axis flush at
the bottom, that a stale canvas is recomputed, and that the GPU table drops
optional columns instead of clipping on narrow terminals. It runs automatically
before `npm publish`.

## Notes and limitations

- **Hashrate split**: when the miner API does not report per-GPU hashrate, the
  rig total is divided evenly across the GPUs shown by `nvidia-smi`.
- **GDDR6 memory temperature**: not exposed by `nvidia-smi` on RTX 30-series
  cards; the dashboard estimates it (core + ~12 °C) and labels it as an estimate.
- **Cross-platform**: the GPU panel needs NVIDIA + `nvidia-smi`; the miner, pool
  and network panels work on Windows, Linux and macOS with Node 18+.

## Roadmap

- [ ] CSV session log export
- [ ] Webhook alerts (Discord / Telegram) on offline or hashrate drop
- [ ] Difficulty history for coins other than PRL
- [ ] Auto-switch: detect a dead pool endpoint and restart the miner on a live one

## License

MIT
