# F1 Workshop Project — React Edition

> 本檔給 AI 工具讀取，告訴它這個專案要怎麼寫。
> 學員打 prompt 時不需要重複交代這些規則 — AI 會自動套用。

## Tech Stack

- **Vite 5** + **React 18**（function component + hooks，**不要用 class component**）
- **JavaScript**（不是 TypeScript — 不要在 import 加型別、不要用 `interface`/`type` 語法）
- **Tailwind CSS 3**（utility class 風格，**不要寫 `.css` 檔內的自訂規則**，全部寫在 className）
- **shadcn/ui**（已預裝在 `src/components/ui/`：`card`、`badge`、`button`、`tabs`、`select`）
- **Recharts**（圖表庫，**不要用 Chart.js / D3 / Plotly**）
- **Papa Parse**（CSV 讀取，**不要用 fetch + 自己寫 parser**）
- **lucide-react**（圖示，**不要用 react-icons / heroicons**）

## Architecture

```
template/
├── public/
│   └── data/                  # 7 張 CSV，用 fetch('/data/xxx.csv') 讀取
├── src/
│   ├── main.jsx               # 入口（不要動）
│   ├── App.jsx                # ★ 學員主要編輯這個檔案
│   ├── index.css              # Tailwind + shadcn 變數（不要動）
│   ├── lib/
│   │   ├── utils.js           # cn()、TEAM_COLORS、parseTimeToSeconds()
│   │   └── loadCSV.js         # loadCSV(filename) helper
│   └── components/ui/         # shadcn 元件（不要動）
└── index.html
```

**單檔規則**：所有業務邏輯、狀態、UI 都寫在 `App.jsx` 一個檔案裡，不要為了「乾淨」拆成多個 component。學員需要看到一份完整的、可讀的 code。

## Critical Rules（資料處理三件事）

### 1. 圈速分析必先過濾 IsAccurate

```javascript
// ✅ 正確
const clean = laps.filter((l) => l.IsAccurate === true);

// ❌ 錯誤 — 會包含進站圈、出站圈、SC 圈，統計嚴重偏差
const all = laps;
```

### 2. LapTime 是 timedelta 字串，要轉成秒數

`laps.csv` 的 `LapTime` 欄位是字串如 `"0 days 00:01:21.456000"`，**不能直接做數學運算**。

```javascript
import { parseTimeToSeconds } from '@/lib/utils';

// ✅ 正確
const lapTimeSec = parseTimeToSeconds(row.LapTime);

// ❌ 錯誤
const lapTimeSec = parseFloat(row.LapTime);  // NaN
```

### 3. stints 要 join results 才有車手三字代碼

`stints.csv` 只有 `driver_number`（如 `1`、`4`），沒有 `VER` / `NOR`。

```javascript
const stintsWithDriver = stints.map((s) => {
  const r = results.find((r) => r.DriverNumber === s.driver_number);
  return { ...s, Driver: r?.Abbreviation };
});
```

## Coding Conventions

### 命名

| 類型 | 風格 | 範例 |
|------|------|------|
| 元件 | PascalCase | `LapTimeChart` |
| 函式 / 變數 | camelCase | `loadLaps`、`accurateLaps` |
| 常數 | UPPER_SNAKE_CASE | `TEAM_COLORS` |
| 檔名 | kebab-case 或 PascalCase | `App.jsx`、`lap-time-chart.jsx` |

### import 路徑

用 `@/` 取代相對路徑（已在 `vite.config.js` 設好）：

```javascript
// ✅ 正確
import { Card } from '@/components/ui/card';
import { loadCSV } from '@/lib/loadCSV';

// ❌ 錯誤
import { Card } from '../components/ui/card';
```

### CSV 讀取（標準寫法）

```javascript
import { useEffect, useState } from 'react';
import { loadCSV } from '@/lib/loadCSV';
import { parseTimeToSeconds } from '@/lib/utils';

function MyDashboard() {
  const [laps, setLaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCSV('laps.csv').then((data) => {
      const clean = data
        .filter((l) => l.IsAccurate === true)
        .map((l) => ({ ...l, LapTimeSec: parseTimeToSeconds(l.LapTime) }));
      setLaps(clean);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>載入中…</div>;
  return <div>{/* 你的 UI */}</div>;
}
```

## Visual Style（視覺要求 — 重要）

### 顏色

統一使用 `tailwind.config.js` 中的 F1 主題色：

| Token | Hex | 用途 |
|-------|-----|------|
| `f1-red` | `#E10600` | 主強調色、Header、KPI 重點 |
| `f1-black` | `#15151E` | 頁面背景 |
| `f1-ink` | `#1E1E2A` | Card 背景 |
| `f1-charcoal` | `#38383F` | 邊界、次要元素 |
| `f1-gold` | `#FFD600` | 第二強調（最快圈、亮點） |

**車隊配色**從 `@/lib/utils` 的 `TEAM_COLORS` 取，不要自己編造。

### 排版規範

- 整體用 dark theme（`<html class="dark">` 已設定）
- 所有 Card 用 `<Card>` 元件（不要用 `<div>` 配 Tailwind 模擬卡片）
- KPI 卡片必有「大數字 + 小標籤」結構：標題 14px 灰、數字 32px+ 粗體
- 圖表標題用 `<CardTitle>`，圖表本體外層用 `<ResponsiveContainer width="100%" height={400}>`
- 不要使用 emoji 取代 icon — 用 `lucide-react`（如 `<Flag />`、`<TrendingUp />`、`<Loader2 />`）

### Recharts 設定（每張圖都要這樣寫）

```jsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="lap" />
    <YAxis />
    <Tooltip
      contentStyle={{
        backgroundColor: '#1E1E2A',
        border: '1px solid #38383F',
        borderRadius: 8,
      }}
      labelStyle={{ color: '#FFD600' }}
    />
    <Legend />
    <Line type="monotone" dataKey="VER" stroke="#3671C6" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

**禁止**：手寫 `<svg>`、`<canvas>` 或 fetch 第三方圖表庫。

## Available Data

| 檔名 | 路徑 | 列數 | 一句話說明 |
|------|------|------|------------|
| `laps.csv` | `/data/laps.csv` | 1,008 | 20 車手 × 53 圈的圈速、輪胎、排名 |
| `results.csv` | `/data/results.csv` | 20 | 比賽最終結果、積分、起跑位 |
| `weather.csv` | `/data/weather.csv` | 133 | 氣溫、賽道溫度、風速風向 |
| `telemetry_VER.csv` | `/data/telemetry_VER.csv` | 632 | Verstappen 最快圈的速度／煞車／座標 |
| `stints.csv` | `/data/stints.csv` | 50 | 每位車手每組輪胎的使用區間 |
| `race_control.csv` | `/data/race_control.csv` | 61 | 旗號、罰則、藍旗等賽會訊息 |
| `schedule_2024.csv` | `/data/schedule_2024.csv` | 25 | 2024 賽季賽程 |

## Commands

```bash
npm run dev       # 啟動 dev server（http://localhost:5173）
npm run build     # 產生 production build 至 dist/
npm run preview   # 預覽 production build
```

## Deployment

部署平台：**Vercel**（助教課後操作，學員不需要自己部署）。
所有 CSV 在 `public/data/` 會被自動複製到 `dist/data/`，部署後可直接 fetch。

## Don't

- ❌ 不要新增 npm 套件（已預裝的就夠）
- ❌ 不要把 CSV 改成 JSON（保留原始格式，學員學到處理真實資料）
- ❌ 不要寫 server-side code（這是純前端專案，沒有後端）
- ❌ 不要拆成多個檔案 — 維持 `App.jsx` 一檔到底
- ❌ 不要刪除 `src/components/ui/` 下的元件
- ❌ 不要動 `src/index.css`、`src/main.jsx`、`tailwind.config.js`（除非真的必要）
