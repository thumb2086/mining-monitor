# mining-monitor — 挖礦監控 TUI（中文說明）

[![npm version](https://img.shields.io/npm/v/mining-monitor.svg)](https://www.npmjs.com/package/mining-monitor)
[![npm downloads](https://img.shields.io/npm/dm/mining-monitor.svg)](https://www.npmjs.com/package/mining-monitor)
[![license](https://img.shields.io/npm/l/mining-monitor.svg)](LICENSE)
[![node](https://img.shields.io/node/v/mining-monitor.svg)](https://nodejs.org)

[English →](README.md)

給 GPU 礦機用的終端機儀表板 —— 算力、難度、出塊、shares、unMineable 收益，全部在一張畫面裡，每幾秒刷新。

為使用 **SRBMiner-MULTI**（PearlPow／Etchash）或 **XMRig**（RandomX），並透過
[unMineable](https://unmineable.com) 結算的礦機設計。

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

## 面板說明

| 面板 | 內容 |
|---|---|
| **GPUs** | 每張卡的算力、功耗、溫度、風扇、核心／顯存頻率（讀 `nvidia-smi`） |
| **Miner** | 演算法、share 難度、接受／拒絕 shares、平均出 share 時間、1m/15m/1h 算力、礦池延遲、連線時間 |
| **Hashrate 曲線** | 滾動算力，Y 軸自動縮放（小幅變動也看得出來） |
| **Difficulty 曲線** | Pearl 網路難度（單位：百萬） |
| **Payout** | unMineable 餘額、24h/7d 收益、出金進度（30 DOGE = 100%） |
| **Events** | 新 share、新區塊、工人上線、連線狀態變化 |

## 環境需求

- **Node.js 18+**
- **NVIDIA 顯卡 + `nvidia-smi` 在 PATH 裡**（GPU 面板要用；沒有也不影響其他面板）
- 礦工有開**本地 API**（Miner 面板要用，非必要）
- 終端要有能顯示框線與點字（braille）的字型 —— Windows Terminal、iTerm2、GNOME Terminal 都可以

## 安裝

```bash
npm install -g mining-monitor     # 安裝全域指令
npx mining-monitor                # 或免安裝直接跑
```

從原始碼：

```bash
git clone https://github.com/thumb2086/mining-monitor.git
cd mining-monitor
npm install
npm start
```

Windows 也可以直接雙擊 **`run.bat`**（第一次會自動安裝相依套件）。

## 使用方式

```bash
mining-monitor                 # 真實數據，5 秒刷新一次
mining-monitor --demo          # 模擬數據（沒礦機、沒顯卡也能看畫面）
mining-monitor --interval 2    # 改成 2 秒刷新
mining-monitor --coin DOGE --threshold 30
mining-monitor --srbminer-port 60130 --xmrig-port 60070
```

| 參數 | 預設 | 說明 |
|---|---|---|
| `--demo` | 關 | 模擬數據，不讀 GPU／礦工／API |
| `--interval <秒>` | `5` | 刷新間隔 |
| `--coin <代號>` | `DOGE` | 收益面板顯示的幣種 |
| `--threshold <n>` | `30` | 出金門檻，用來算進度百分比 |
| `--srbminer-port <p>` | `60130` | SRBMiner 本地 API 埠 |
| `--xmrig-port <p>` | `60070` | XMRig HTTP API 埠 |
| `--api-key <upk_...>` | — | unMineable API key（覆蓋已存的） |
| `--api-secret <usk_...>` | — | unMineable API secret |
| `--save-keys` | 關 | 把上面兩把金鑰存到 `~/.mining-monitor.json` |
| `--dump` | 關 | 印出一張完整畫面（純文字）後結束 |
| `--dump-cols <n>` | `120` | `--dump` 的寬度 |
| `--dump-rows <n>` | `42` | `--dump` 的高度 |
| `-h`, `--help` | — | 顯示全部參數 |

子指令：

```bash
mining-monitor init        # 互動嚮導，設定 unMineable API 金鑰
mining-monitor check-pool  # TCP 測試各區域礦池端點
```

按 **`q`** 或 **`Ctrl+C`** 離開。

### `--dump`：不用終端也能檢查版面

`--dump` 會用模擬數據畫一張畫面後以純文字輸出並結束，不需要互動式終端 ——
適合管線、CI，或單純想確認「版面有沒有歪、折線圖有沒有畫出來」：

```bash
mining-monitor --demo --dump --dump-cols 100 --dump-rows 42
```

## 礦工設定（讓 Miner 面板有數據）

啟動礦工時要開啟本地 API：

```bash
# SRBMiner-MULTI（以 PearlPow 為例）
SRBMiner-MULTI.exe --algorithm-gpu pearl --disable-cpu ^
  --pool stratum+tcp://pearlpow-asia.unmineable.com:3333 ^
  --wallet 你的別名.工人名 ^
  --api-enable --api-port 60130

# XMRig
xmrig.exe --http-port 60070 ...
```

沒有本地礦工 API 時 TUI 照樣能跑 —— 顯卡、網路、收益面板都是活的，
只有 Miner 面板會顯示 `miner API unreachable`。

## unMineable API 金鑰設定（收益面板用）

收益面板需要 unMineable 的 API 金鑰（unmineable.com → 帳號 → API）。
**五種方式，優先序由高到低**：

| # | 位置 | 用法 |
|---|---|---|
| 1 | 指令參數 | `--api-key upk_... --api-secret usk_...`（加 `--save-keys` 可存檔） |
| 2 | 環境變數 | `UNMINEABLE_API_KEY` / `UNMINEABLE_API_SECRET` |
| 3 | `./config.json` | `{ "unmineable": { "apiKey": "upk_...", "apiSecret": "usk_..." } }` |
| 4 | `~/.mining-monitor.json` | 同上格式，由 `mining-monitor init` 寫入 |
| 5 | `%USERPROFILE%\.thumb-secrets\unmineable.env` | 舊式相容，`KEY=value` 一行一個 |

格式範例見 `config.example.json`。沒設金鑰也能跑，只是 Payout 面板會顯示 `-`。

## ⚠️ 礦池端點會因「你的網路」而失效

unMineable 是同一個主機名後面掛**分區端點**，預設是歐洲。**部分網路（校園、ISP、VPN）到某些區域會直接不通** ——
TCP 連線 timeout，礦工卡在重連、儀表板看起來「在跑」，實際上**完全沒收益**。

`check-pool` 會從你實際所在的位置測試每個區域：

```
$ mining-monitor check-pool
unMineable PearlPow endpoint check (TCP port 3333)

default  pearlpow.unmineable.com       165.227.236.217  DEAD (timeout)
eu       pearlpow-eu.unmineable.com    165.227.236.217  DEAD (timeout)
us       pearlpow-us.unmineable.com    138.197.88.7     OK    237 ms
asia     pearlpow-asia.unmineable.com  165.22.100.136   OK     72 ms

Fastest: pearlpow-asia.unmineable.com:3333 (72 ms, asia)
```

之後把礦工指令的 `--pool` 改成那個端點即可：

```bash
--pool stratum+tcp://pearlpow-asia.unmineable.com:3333
```

礦池不是用 3333 的話，加 `--port <埠號>`。

## 疑難排解

| 症狀 | 原因 / 處理 |
|---|---|
| Miner 面板顯示 `miner API unreachable` | 礦工沒開 `--api-enable`／`--http-port`；或剛重連 —— 程式會保留上次數值 30 秒並標 `stale` |
| **儀表板說在跑，但 unMineable 顯示工人離線** | 先跑 `mining-monitor check-pool`，換到可連的區域，九成是這個 |
| 折線圖看起來空的／平的 | 至少要 2 個取樣點（`--interval 5` 就是 10 秒後）。有線但是平的，代表數值真的沒變 |
| GPU 面板空白 | `nvidia-smi` 不在 PATH，或沒有 NVIDIA 顯卡 |
| 顯存溫度顯示 `N/A` | RTX 30 系列 GDDR6 的顯存溫度不透過 `nvidia-smi` 提供（驅動限制） |
| 框線／點字顯示成亂碼 | 換成 UTF-8 終端（Windows Terminal，不要用舊版主控台），字型要有框線字元 |
| Payout 面板一直是 `-` | 沒設金鑰，或 unMineable API 拒絕了金鑰 |

## 資料來源

| 面板 | 來源 | 認證 |
|---|---|---|
| GPUs | `nvidia-smi` | 不需要 |
| 難度／shares／算力／每卡算力 | SRBMiner 本地 API（`GET /`）或 XMRig（`/2/summary`） | 不需要 |
| Pearl 區塊高度／網路難度 | `blockbook.pearlresearch.ai/api/v2/status` | 不需要 |
| 餘額／收益 | unMineable API（HMAC-SHA256 簽章） | API 金鑰 |

## 開發

```bash
npm start          # 真實數據
npm run demo       # 模擬數據
npm run dump       # 印一張畫面（不需要 TTY）
npm run check      # 版面／折線圖回歸測試
```

`npm run check` 會檢查：面板之間沒有重疊、兩張圖的 Y 軸刻度有效且真的畫出線、
繪圖區填滿整個框且時間軸貼齊底部、畫布尺寸過期會重算、
GPU 表在窄視窗會自動少欄而不是被截斷。`npm publish` 前會自動執行。

## 注意事項

- **每卡算力**：礦工 API 有提供每張卡的算力（`gpu1`、`gpu2`…）就優先使用；
  讀不到時才把總算力平均分給 `nvidia-smi` 看到的顯卡。
- **GDDR6 顯存溫度**：RTX 30 系列無法從 `nvidia-smi` 讀取，顯示的是估算值，僅供參考。
- **跨平台**：GPU 面板需要 NVIDIA + `nvidia-smi`；礦工、礦池、網路面板在
  Node 18+ 的 Windows／Linux／macOS 都能跑。

## 後續規劃

- [ ] Session 記錄匯出 CSV
- [ ] 斷線／算力暴跌的 Webhook 告警（Discord / Telegram）
- [ ] 更多幣種的難度歷史圖
- [ ] 自動偵測端點切換（偵測到 DEAD 自動改 pool URL 重啟礦工）

## 授權

MIT
