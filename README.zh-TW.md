# mining-monitor — 挖礦監控 TUI（中文說明）

給 GPU 礦機用的終端機儀表板。即時顯示：

- **算力（TH/s）** — 每張顯卡的即時算力、滾動折線圖
- **挖礦難度** — 礦池 share 難度（SRBMiner）+ Pearl 網路難度
- **發塊累計** — Pearl 區塊高度、本次 session 新增區塊數
- **礦工狀態** — 接受/拒絕 shares、平均出 share 時間、延遲、連線時間
- **顯卡狀態** — 溫度、功耗、風扇、核心/顯存頻率（讀 `nvidia-smi`）
- **收益** — unMineable DOGE 餘額、24h/7d 收益、出金進度（30 DOGE = 100%）

為使用 **SRBMiner-MULTI**（PearlPow／Etchash）或 **XMRig**（RandomX）並透過
[unMineable](https://unmineable.com) 結算的礦機設計。

```
┌────────────────────────┬────────────────────────┐
│ GPUs                   │ Miner（礦工 API）      │
│ 每卡 TH/s、溫度、功耗  │ 難度、shares、算力均值 │
├────────────────────────┴────────────────────────┤
│ Hashrate（TH/s）折線圖                          │
├─────────────────────────────────────────────────┤
│ Difficulty（M）折線圖                           │
├──────────────────────────┬──────────────────────┤
│ Events（事件紀錄）       │ 收益 / Pearl 網路    │
└──────────────────────────┴──────────────────────┘
```

---

## 安裝

```bash
npm install -g mining-monitor
# 或免安裝直接跑：
npx mining-monitor
```

> **Windows 注意**：`nvidia-smi` 必須在 PATH 裡（安裝 NVIDIA 驅動時會自帶）。

---

## 使用方式

```bash
mining-monitor                 # 真實數據，5 秒刷新一次
mining-monitor --demo          # 模擬數據（沒礦機也能先玩畫面）
mining-monitor --interval 2    # 改 2 秒刷新
mining-monitor --coin DOGE --threshold 30
mining-monitor --srbminer-port 60130 --xmrig-port 60070

mining-monitor init            # 設定 unMineable API 金鑰（互動嚮導）
mining-monitor check-pool      # 測試各區域礦池端點，挑最快的

mining-monitor --dump          # 印出一張完整畫面（純文字）後結束
npm run check                  # 版面／折線圖回歸測試（不需要互動終端）
```

按 `q` 離開。

`--dump` 用模擬數據畫一張畫面就結束，不需要互動終端 —— 想確認
「版面有沒有歪、折線圖有沒有畫出來」時最快。`npm run check` 會檢查：
面板之間沒有重疊、兩張圖的 Y 軸刻度有效、線真的畫出來了、
GPU 表在窄視窗會自動少欄而不是被截斷。

### 礦工設定（讓 TUI 能讀到數據）

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

沒有本地礦工 API 時 TUI 照樣能跑——顯卡、網路、收益面板都是活的，
只有 Miner 面板會顯示 `miner API unreachable`。

---

## ⚠️ 礦池端點會因「你的網路」而失效（重要）

unMineable 是同一個主機名後面掛**分區端點**：

```
pearlpow.unmineable.com → pearlpow-eu.unmineable.com（預設：歐洲）
```

**部分網路（校園網路、ISP、VPN）到某些區域會直接不通** —— TCP 連線
timeout、礦工卡在重連、儀表板看「礦工在跑」但實際上**完全沒收益**。
（這正是本專案誕生的原因：宿舍網路到歐洲端點的路由死掉，礦工白跑好幾小時。）

**解法：跑一次 `check-pool`，把礦工指到能用的端點。**

```
$ mining-monitor check-pool
unMineable PearlPow endpoint check (TCP port 3333)

default  pearlpow.unmineable.com       165.227.236.217  DEAD (timeout)
default  pearlpow.unmineable.com       46.101.86.22     DEAD (timeout)
eu       pearlpow-eu.unmineable.com    165.227.236.217  DEAD (timeout)
eu       pearlpow-eu.unmineable.com    46.101.86.22     DEAD (timeout)
us       pearlpow-us.unmineable.com    138.197.88.7     OK    237 ms
asia     pearlpow-asia.unmineable.com  165.22.100.136   OK     72 ms

Fastest: pearlpow-asia.unmineable.com:3333 (72 ms, asia)

Use it in your miner command:
  --pool stratum+tcp://pearlpow-asia.unmineable.com:3333
```

之後把礦工指令的 `--pool` 改成那個端點即可。

---

## unMineable API 金鑰設定（收益面板用）

收益面板需要 unMineable 的 API 金鑰。**五種方式，挑一種即可**（優先序由高到低）：

1. **指令參數**
   ```bash
   mining-monitor --api-key upk_xxxx --api-secret usk_xxxx
   # 想存起來就加：
   mining-monitor --api-key upk_xxxx --api-secret usk_xxxx --save-keys
   ```
2. **互動嚮導**（推薦）
   ```bash
   mining-monitor init
   ```
   會存到 `~/.mining-monitor.json`，並立刻驗證金鑰是否有效。
3. **環境變數**
   ```bash
   set UNMINEABLE_API_KEY=upk_xxxx
   set UNMINEABLE_API_SECRET=usk_xxxx
   ```
4. **`config.json`**（放執行目錄，格式見 `config.example.json`）
   ```json
   { "unmineable": { "apiKey": "upk_...", "apiSecret": "usk_..." } }
   ```
5. **`~/.mining-monitor.json`**（同 4 的格式）

另外，程式也會自動讀取 `%USERPROFILE%\.thumb-secrets\unmineable.env`（若存在）。

> 沒設金鑰也能跑，只是 Payout 面板會顯示 `-`。

---

## 資料來源一覽

| 面板 | 來源 | 認證 |
|------|------|------|
| GPUs（溫度/功耗/風扇/頻率） | `nvidia-smi` | 不需要 |
| Miner（難度/shares/算力/每卡算力） | SRBMiner `GET /`（JSON）或 XMRig `/2/summary` | 不需要 |
| Pearl 區塊高度 / 網路難度 | `blockbook.pearlresearch.ai/api/v2/status` | 不需要 |
| 餘額 / 收益 | unMineable API（HMAC-SHA256 簽章） | API 金鑰 |
| Hashrate 曲線 | 本地紀錄（礦工 API 取值） | 不需要 |

---

## 疑難排解

| 症狀 | 原因 / 處理 |
|------|-------------|
| Miner 面板顯示 `miner API unreachable` | 礦工沒開 `--api-enable`；或剛重連、API 暫時掉欄位——程式會保留上一次數值並標 `stale`，30 秒內正常 |
| **儀表板說在跑、但 unMineable 一直離線** | **先跑 `mining-monitor check-pool`**，八成是端點路由掛了，換區域即可 |
| 顯卡溫度欄位顯示 `-` | 礦工開了 `--gpu-sensors-disable` 只影響礦工自己的輸出；TUI 的溫度來自 `nvidia-smi`，不受影響 |
| `memory temp` 顯示 N/A | RTX 30 系列 GDDR6 不透過 `nvidia-smi` 提供顯存溫度（驅動限制），TUI 用核心 +12°C 估算 |
| 找不到 `nvidia-smi` | 安裝/更新 NVIDIA 驅動，確認 PATH |
| Pearl 面板空白 | 檢查 `blockbook.pearlresearch.ai` 是否可連（校園網路有時擋） |

---

## 注意事項

- **GDDR6 顯存溫度**：RTX 30 系列無法從 `nvidia-smi` 讀顯存溫度，顯示的是估算值，僅供參考。
- **每卡算力分割**：SRBMiner API 直接提供每張卡的算力（`gpu1`、`gpu2`…）會優先使用；讀不到時才用平均值估算。
- **跨平台**：GPU 面板需要 NVIDIA + `nvidia-smi`；礦池與網路面板在 Node 18+ 的任何平台都能跑。

---

## 後續規劃

- [ ] Session 記錄匯出 CSV
- [ ] 斷線 / 算力暴跌的 Webhook 告警（Discord / Telegram）
- [ ] 更多幣種的難度歷史圖
- [ ] 自動偵測端點切換（偵測到 DEAD 自動改 pool URL 重啟礦工）

## 授權

MIT
