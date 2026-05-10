/**
 * F1 Insight Go · App.jsx
 *
 * 對應 PRD 七大資料焦點 — 全部寫在這一個檔案：
 *   1. 賽事概覽 KPI（results + laps + weather）
 *   2. 車手圈速比較（laps，可多選車手）
 *   3. 輪胎策略 Stint（stints join results）
 *   4. 天氣與賽道溫度（weather）
 *   5. VER 最快圈遙測（telemetry_VER）
 *   6. 賽事事件時序（race_control）
 *   7. 起跑→完賽位置變化 + 2024 賽程（results, schedule_2024）
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ComposedChart, Area, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  Flag, Loader2, Trophy, Timer, Cloud, Gauge, Wrench,
  AlertTriangle, Calendar, MapPin, TrendingUp, TrendingDown, Minus,
  Lightbulb, Zap, ShieldAlert, Play, Pause, RotateCcw, Activity,
  Users, X, User, Hash, Target, Globe2,
} from 'lucide-react';
import { loadCSV } from '@/lib/loadCSV';
import {
  parseTimeToSeconds, formatLapTime, TEAM_COLORS, COMPOUND_COLORS,
} from '@/lib/utils';

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1E1E2A',
    border: '1px solid #38383F',
    borderRadius: 8,
  },
  labelStyle: { color: '#FFD600' },
};

const DEFAULT_DRIVERS = ['VER', 'NOR', 'LEC', 'HAM'];

const FLAG_BADGE = {
  GREEN: 'bg-green-600/20 text-green-400 border-green-600/40',
  YELLOW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  RED: 'bg-red-600/20 text-red-400 border-red-600/40',
  BLUE: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
  CHEQUERED: 'bg-zinc-200/20 text-zinc-100 border-zinc-300/40',
  CLEAR: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
};

export default function App() {
  const [laps, setLaps] = useState([]);
  const [results, setResults] = useState([]);
  const [weather, setWeather] = useState([]);
  const [stints, setStints] = useState([]);
  const [raceControl, setRaceControl] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDrivers, setSelectedDrivers] = useState(DEFAULT_DRIVERS);

  // 賽道動畫狀態
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [highlightDriver, setHighlightDriver] = useState('VER');

  // 車隊 Modal
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    Promise.all([
      loadCSV('laps.csv'),
      loadCSV('results.csv'),
      loadCSV('weather.csv'),
      loadCSV('stints.csv'),
      loadCSV('race_control.csv'),
      loadCSV('telemetry_VER.csv'),
      loadCSV('schedule_2024.csv'),
      loadCSV('locations.csv'),
    ]).then(([lapsData, resultsData, weatherData, stintsData, rcData, telData, schedData, locData]) => {
      const cleanLaps = lapsData
        .filter((l) => l.IsAccurate === true)
        .map((l) => ({
          ...l,
          LapTimeSec: parseTimeToSeconds(l.LapTime),
          LapNumber: Number(l.LapNumber),
          Position: Number(l.Position),
        }))
        .filter((l) => l.LapTimeSec != null);

      setLaps(cleanLaps);
      setResults(resultsData);
      setWeather(
        weatherData.map((w) => ({
          ...w,
          minute: Math.floor((parseTimeToSeconds(w.Time) ?? 0) / 60),
        }))
      );
      setStints(stintsData);
      setRaceControl(rcData);
      setTelemetry(telData);
      setSchedule(schedData);
      setLocations(locData);
      setLoading(false);
    });
  }, []);

  // 動畫 tick：playing 為 true 時依 speed 推進 frameIdx
  const animationFrames = useMemo(() => {
    if (!locations.length) return [];
    const byT = new Map();
    locations.forEach((l) => {
      const t = Number(l.t);
      if (!byT.has(t)) byT.set(t, []);
      byT.get(t).push({ driver: l.driver, x: Number(l.x), y: Number(l.y) });
    });
    return [...byT.entries()].sort((a, b) => a[0] - b[0]).map(([t, drivers]) => ({ t, drivers }));
  }, [locations]);

  useEffect(() => {
    if (!playing || animationFrames.length === 0) return;
    const id = setInterval(() => {
      setFrameIdx((i) => {
        const next = i + 1;
        return next >= animationFrames.length ? 0 : next;
      });
    }, 1000 / (30 * speed));
    return () => clearInterval(id);
  }, [playing, speed, animationFrames.length]);

  // ──────────────────────────────────────────────
  // 衍生資料
  // ──────────────────────────────────────────────

  const allDrivers = useMemo(() => {
    return [...new Set(laps.map((l) => l.Driver))].filter(Boolean).sort();
  }, [laps]);

  const driverTeam = useMemo(() => {
    const m = {};
    results.forEach((r) => { if (r.Abbreviation) m[r.Abbreviation] = r.TeamName; });
    return m;
  }, [results]);

  const fastestLap = useMemo(() => {
    if (!laps.length) return null;
    return laps.reduce((min, l) => (l.LapTimeSec < (min?.LapTimeSec ?? Infinity) ? l : min), null);
  }, [laps]);

  const winner = useMemo(() => results.find((r) => Number(r.Position) === 1), [results]);

  const totalRaceLaps = useMemo(() => {
    if (!laps.length) return 0;
    return Math.max(...laps.map((l) => l.LapNumber));
  }, [laps]);

  const avgAirTemp = useMemo(() => {
    if (!weather.length) return null;
    return weather.reduce((s, w) => s + (Number(w.AirTemp) || 0), 0) / weather.length;
  }, [weather]);

  const avgTrackTemp = useMemo(() => {
    if (!weather.length) return null;
    return weather.reduce((s, w) => s + (Number(w.TrackTemp) || 0), 0) / weather.length;
  }, [weather]);

  // 圈速比較圖：每圈 -> { lap, VER: 81.3, NOR: 81.5, ... }
  const lapChart = useMemo(() => {
    if (!laps.length) return [];
    const rows = [];
    for (let i = 1; i <= totalRaceLaps; i++) {
      const row = { lap: i };
      selectedDrivers.forEach((d) => {
        const lap = laps.find((l) => l.LapNumber === i && l.Driver === d);
        if (lap) row[d] = Number(lap.LapTimeSec.toFixed(3));
      });
      rows.push(row);
    }
    return rows;
  }, [laps, selectedDrivers, totalRaceLaps]);

  // 輪胎策略：以車手為 row、每段 stint 為色塊
  const stintRows = useMemo(() => {
    if (!stints.length || !results.length) return [];
    const merged = stints.map((s) => {
      const r = results.find((rr) => Number(rr.DriverNumber) === Number(s.driver_number));
      return {
        driver: r?.Abbreviation || `#${s.driver_number}`,
        team: r?.TeamName,
        finishPos: Number(r?.Position) || 99,
        lapStart: Number(s.lap_start),
        lapEnd: Number(s.lap_end),
        compound: s.compound,
        stintNumber: Number(s.stint_number),
        laps: Number(s.lap_end) - Number(s.lap_start) + 1,
      };
    });
    // 依完賽名次排序
    const byDriver = {};
    merged.forEach((m) => {
      if (!byDriver[m.driver]) byDriver[m.driver] = { driver: m.driver, team: m.team, finishPos: m.finishPos, stints: [] };
      byDriver[m.driver].stints.push(m);
    });
    return Object.values(byDriver)
      .map((d) => ({ ...d, stints: d.stints.sort((a, b) => a.stintNumber - b.stintNumber) }))
      .sort((a, b) => a.finishPos - b.finishPos);
  }, [stints, results]);

  // 天氣折線資料（每分鐘 1 點，避免太密）
  const weatherChart = useMemo(() => {
    if (!weather.length) return [];
    return weather.map((w) => ({
      minute: w.minute,
      air: Number(w.AirTemp),
      track: Number(w.TrackTemp),
      wind: Number(w.WindSpeed),
      humidity: Number(w.Humidity),
    }));
  }, [weather]);

  // 遙測：依 Distance 重採樣（取每 5m 一筆，避免渲染卡）
  const telemetryChart = useMemo(() => {
    if (!telemetry.length) return [];
    const step = 5; // 每 5 公尺一筆
    const out = [];
    let nextThreshold = 0;
    telemetry.forEach((t) => {
      const dist = Number(t.Distance);
      if (dist >= nextThreshold) {
        out.push({
          distance: Math.round(dist),
          speed: Number(t.Speed),
          throttle: Number(t.Throttle),
          brake: t.Brake === true ? 100 : 0,
          rpm: Number(t.RPM),
          gear: Number(t.nGear),
        });
        nextThreshold += step;
      }
    });
    return out;
  }, [telemetry]);

  // 關鍵事件（給圈速圖做 ReferenceLine + 智慧洞察列表）
  const keyMoments = useMemo(() => {
    if (!raceControl.length) return [];
    const moments = [];
    raceControl.forEach((rc) => {
      const lap = Number(rc.lap_number);
      if (!lap) return;
      const msg = String(rc.message || '');
      const upper = msg.toUpperCase();
      let type = null;
      let label = '';
      let color = '#9ca3af';

      if (upper.includes('SAFETY CAR DEPLOYED') || upper.includes('SAFETY CAR IN THIS LAP')) {
        type = 'sc'; label = 'Safety Car'; color = '#FFD600';
      } else if (upper.includes('VIRTUAL SAFETY CAR')) {
        type = 'vsc'; label = 'VSC'; color = '#FFD600';
      } else if (rc.flag === 'RED') {
        type = 'red'; label = '紅旗'; color = '#E10600';
      } else if (rc.flag === 'YELLOW') {
        type = 'yellow'; label = '黃旗'; color = '#FFD600';
      } else if (upper.includes('TIME PENALTY')) {
        type = 'penalty'; label = '罰時'; color = '#FF8000';
      } else if (upper.includes('COLLISION') || upper.includes('INCIDENT INVOLVING')) {
        type = 'incident'; label = '事故'; color = '#E10600';
      } else if (rc.flag === 'CHEQUERED') {
        type = 'chequered'; label = '方格旗'; color = '#FFFFFF';
      }
      if (!type) return;

      // 嘗試從訊息抽出涉事車手代碼（如 "(RIC)" / "(HUL)"）
      const drivers = [...msg.matchAll(/\(([A-Z]{3})\)/g)].map((m) => m[1]);
      moments.push({ lap, type, label, color, message: msg, drivers, time: rc.date });
    });
    return moments;
  }, [raceControl]);

  // 取代「最重大事件」用於圈速圖標記（合併同圈、避免太密）
  const lapMarkers = useMemo(() => {
    const byLap = new Map();
    keyMoments.forEach((m) => {
      // 罰時與調查訊息不疊加，挑事故與旗號為主
      if (!['sc', 'vsc', 'red', 'yellow', 'incident', 'chequered'].includes(m.type)) return;
      if (!byLap.has(m.lap)) byLap.set(m.lap, m);
    });
    return [...byLap.values()];
  }, [keyMoments]);

  // 各胎種平均圈速
  const compoundPace = useMemo(() => {
    if (!laps.length) return [];
    const buckets = {};
    laps.forEach((l) => {
      const c = l.Compound;
      if (!c) return;
      if (!buckets[c]) buckets[c] = { sum: 0, n: 0 };
      buckets[c].sum += l.LapTimeSec;
      buckets[c].n += 1;
    });
    return Object.entries(buckets)
      .map(([compound, { sum, n }]) => ({
        compound,
        avg: Number((sum / n).toFixed(3)),
        samples: n,
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [laps]);

  // 進站時機：每段 stint 的 lap_end 即進站圈（最後一段除外）
  const pitStops = useMemo(() => {
    if (!stints.length || !results.length) return [];
    const out = [];
    const byDriver = {};
    stints.forEach((s) => {
      const num = Number(s.driver_number);
      if (!byDriver[num]) byDriver[num] = [];
      byDriver[num].push(s);
    });
    Object.entries(byDriver).forEach(([num, list]) => {
      list.sort((a, b) => Number(a.stint_number) - Number(b.stint_number));
      const r = results.find((rr) => Number(rr.DriverNumber) === Number(num));
      const driver = r?.Abbreviation || `#${num}`;
      const team = r?.TeamName;
      list.slice(0, -1).forEach((s) => {
        out.push({
          driver,
          team,
          lap: Number(s.lap_end),
          fromCompound: s.compound,
          toCompound: list[list.findIndex((x) => x === s) + 1]?.compound,
        });
      });
    });
    return out.sort((a, b) => a.lap - b.lap);
  }, [stints, results]);

  // 賽道輪廓（用 telemetry_VER 的 X,Y 點串成 polyline；與 locations 同座標系）
  const trackPath = useMemo(() => {
    if (!telemetry.length) return '';
    return telemetry
      .map((t, i) => {
        const x = Number(t.X);
        const y = Number(t.Y);
        if (isNaN(x) || isNaN(y)) return '';
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [telemetry]);

  // 賽道單圈長度（telemetry 全程的歐氏距離總和）
  const trackLength = useMemo(() => {
    if (telemetry.length < 2) return 1;
    let total = 0;
    for (let i = 1; i < telemetry.length; i++) {
      const dx = Number(telemetry[i].X) - Number(telemetry[i - 1].X);
      const dy = Number(telemetry[i].Y) - Number(telemetry[i - 1].Y);
      if (!isNaN(dx) && !isNaN(dy)) total += Math.hypot(dx, dy);
    }
    return total || 1;
  }, [telemetry]);

  // 每車手每幀的累計行駛距離（一次預算、之後 O(1) 查表）
  const driverDistances = useMemo(() => {
    if (!animationFrames.length) return {};
    const byDriver = {};
    animationFrames.forEach((frame, i) => {
      frame.drivers.forEach((d) => {
        if (!byDriver[d.driver]) byDriver[d.driver] = [];
        byDriver[d.driver][i] = { x: d.x, y: d.y };
      });
    });
    const cumulative = {};
    Object.entries(byDriver).forEach(([driver, positions]) => {
      const arr = new Float32Array(positions.length);
      let total = 0;
      for (let i = 1; i < positions.length; i++) {
        const p = positions[i];
        const prev = positions[i - 1];
        if (p && prev) total += Math.hypot(p.x - prev.x, p.y - prev.y);
        arr[i] = total;
      }
      cumulative[driver] = arr;
    });
    return cumulative;
  }, [animationFrames]);

  // 當前幀的即時排名（依累計距離降序）
  const ranking = useMemo(() => {
    const frame = animationFrames[frameIdx];
    if (!frame) return [];
    const ranked = frame.drivers
      .map((d) => {
        const dist = driverDistances[d.driver]?.[frameIdx] ?? 0;
        return {
          driver: d.driver,
          team: driverTeam[d.driver],
          dist,
          lap: Math.floor(dist / trackLength) + 1,
        };
      })
      .sort((a, b) => b.dist - a.dist);
    const leaderDist = ranked[0]?.dist ?? 0;
    return ranked.map((r, i) => ({
      ...r,
      position: i + 1,
      gap: leaderDist - r.dist,
    }));
  }, [animationFrames, frameIdx, driverDistances, trackLength, driverTeam]);

  const leaderLap = ranking[0]?.lap ?? 1;

  // 賽道座標範圍 — 用於 SVG viewBox
  const trackBounds = useMemo(() => {
    if (!telemetry.length) return { x: -1500, y: -6000, w: 13000, h: 22000 };
    const xs = telemetry.map((t) => Number(t.X)).filter((n) => !isNaN(n));
    const ys = telemetry.map((t) => Number(t.Y)).filter((n) => !isNaN(n));
    const pad = 800;
    const xmin = Math.min(...xs) - pad;
    const ymin = Math.min(...ys) - pad;
    const xmax = Math.max(...xs) + pad;
    const ymax = Math.max(...ys) + pad;
    return { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin };
  }, [telemetry]);

  // 車隊整合（results + laps + stints → 10 個車隊卡）
  const teamSummary = useMemo(() => {
    if (!results.length) return [];
    const grouped = {};
    results.forEach((r) => {
      const teamName = r.TeamName;
      if (!teamName) return;
      if (!grouped[teamName]) {
        grouped[teamName] = {
          team: teamName,
          teamColor: r.TeamColor ? `#${r.TeamColor}` : (TEAM_COLORS[teamName] || '#666'),
          teamId: r.TeamId,
          drivers: [],
          points: 0,
          bestPos: 99,
        };
      }
      const driverLaps = laps.filter((l) => l.Driver === r.Abbreviation);
      const fastestLap = driverLaps.length
        ? driverLaps.reduce((m, l) => (l.LapTimeSec < (m?.LapTimeSec ?? Infinity) ? l : m), null)
        : null;
      const avgLap = driverLaps.length
        ? driverLaps.reduce((s, l) => s + l.LapTimeSec, 0) / driverLaps.length
        : null;
      const driverStints = stints.filter((s) => Number(s.driver_number) === Number(r.DriverNumber));
      const compounds = [...new Set(driverStints.map((s) => s.compound).filter(Boolean))];
      const lapsLed = driverLaps.filter((l) => l.Position === 1).length;
      const pos = Number(r.Position) || 99;

      grouped[teamName].drivers.push({
        abbreviation: r.Abbreviation,
        number: Number(r.DriverNumber),
        firstName: r.FirstName,
        lastName: r.LastName,
        fullName: r.FullName,
        country: r.CountryCode,
        headshot: r.HeadshotUrl && r.HeadshotUrl !== 'None' ? r.HeadshotUrl : null,
        position: pos,
        classified: r.ClassifiedPosition,
        grid: Number(r.GridPosition) || 0,
        points: Number(r.Points) || 0,
        time: r.Time,
        status: r.Status,
        lapsCompleted: Number(r.Laps) || 0,
        fastestLap: fastestLap?.LapTimeSec,
        fastestLapNumber: fastestLap?.LapNumber,
        avgLap,
        pitStops: Math.max(0, driverStints.length - 1),
        compounds,
        lapsLed,
      });
      grouped[teamName].points += Number(r.Points) || 0;
      grouped[teamName].bestPos = Math.min(grouped[teamName].bestPos, pos);
    });

    return Object.values(grouped)
      .map((t) => ({ ...t, drivers: t.drivers.sort((a, b) => a.position - b.position) }))
      .sort((a, b) => b.points - a.points || a.bestPos - b.bestPos);
  }, [results, laps, stints]);

  // 排名變化（Grid → Finish）
  const positionChange = useMemo(() => {
    return results
      .map((r) => ({
        driver: r.Abbreviation,
        team: r.TeamName,
        grid: Number(r.GridPosition) || 0,
        finish: Number(r.Position) || 0,
        delta: (Number(r.GridPosition) || 0) - (Number(r.Position) || 0),
        points: Number(r.Points) || 0,
      }))
      .sort((a, b) => a.finish - b.finish);
  }, [results]);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-f1-black">
        <Loader2 className="w-8 h-8 animate-spin text-f1-red" />
        <span className="ml-3 text-foreground">載入 Monza 2024 賽事資料…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-f1-black text-foreground">
      {/* Header */}
      <header className="border-b border-f1-red/30 bg-gradient-to-r from-f1-black via-f1-ink to-f1-black">
        <div className="container py-6 flex items-center gap-4">
          <Flag className="w-8 h-8 text-f1-red" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">F1 Insight Go</h1>
            <p className="text-sm text-muted-foreground">
              義大利大獎賽 · Monza 2024 · 賽後深度數據儀表板
            </p>
          </div>
          <Badge variant="destructive" className="ml-auto">RACE REVIEW</Badge>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* KPI 區 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Trophy className="w-4 h-4 text-f1-gold" />}
            label="冠軍車手"
            value={winner ? winner.Abbreviation : '—'}
            sub={winner?.TeamName}
            accent="text-f1-gold"
          />
          <KpiCard
            icon={<Timer className="w-4 h-4 text-f1-red" />}
            label="最快圈"
            value={fastestLap ? formatLapTime(fastestLap.LapTimeSec) : '—'}
            sub={fastestLap ? `${fastestLap.Driver} · 第 ${fastestLap.LapNumber} 圈` : ''}
            accent="text-f1-red"
          />
          <KpiCard
            icon={<Flag className="w-4 h-4 text-foreground" />}
            label="總圈數 / 樣本數"
            value={`${totalRaceLaps}`}
            sub={`已過濾準確圈 ${laps.length} 筆`}
          />
          <KpiCard
            icon={<Cloud className="w-4 h-4 text-blue-400" />}
            label="平均氣溫 / 賽道溫"
            value={`${avgAirTemp?.toFixed(1)}° / ${avgTrackTemp?.toFixed(1)}°`}
            sub="賽事期間平均"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="bg-f1-ink border border-f1-charcoal flex-wrap h-auto">
            <TabsTrigger value="performance"><Gauge className="w-4 h-4 mr-1" />車手表現</TabsTrigger>
            <TabsTrigger value="track"><Activity className="w-4 h-4 mr-1" />賽道動畫</TabsTrigger>
            <TabsTrigger value="insight"><Lightbulb className="w-4 h-4 mr-1" />智慧洞察</TabsTrigger>
            <TabsTrigger value="strategy"><Wrench className="w-4 h-4 mr-1" />輪胎策略</TabsTrigger>
            <TabsTrigger value="weather"><Cloud className="w-4 h-4 mr-1" />天氣</TabsTrigger>
            <TabsTrigger value="telemetry"><TrendingUp className="w-4 h-4 mr-1" />遙測</TabsTrigger>
            <TabsTrigger value="events"><AlertTriangle className="w-4 h-4 mr-1" />賽事事件</TabsTrigger>
            <TabsTrigger value="teams"><Users className="w-4 h-4 mr-1" />車隊</TabsTrigger>
            <TabsTrigger value="standings"><Trophy className="w-4 h-4 mr-1" />名次與賽程</TabsTrigger>
          </TabsList>

          {/* 車手表現 */}
          <TabsContent value="performance" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>圈速比較</CardTitle>
                    <CardDescription>選擇車手對比每圈圈速（已過濾 IsAccurate）</CardDescription>
                  </div>
                  <DriverPicker
                    all={allDrivers}
                    selected={selectedDrivers}
                    onChange={setSelectedDrivers}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={lapChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis dataKey="lap" stroke="#9ca3af" label={{ value: '圈數', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                    <YAxis stroke="#9ca3af" domain={['dataMin - 0.5', 'dataMax + 0.5']} label={{ value: '圈速（秒）', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}s`} />
                    <Legend />
                    {selectedDrivers.map((d) => (
                      <Line
                        key={d}
                        type="monotone"
                        dataKey={d}
                        stroke={TEAM_COLORS[driverTeam[d]] || '#FFFFFF'}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                    {lapMarkers.map((m, i) => (
                      <ReferenceLine
                        key={i}
                        x={m.lap}
                        stroke={m.color}
                        strokeDasharray="3 3"
                        strokeOpacity={0.6}
                        label={{ value: m.label, position: 'top', fill: m.color, fontSize: 10 }}
                      />
                    ))}
                    {animationFrames.length > 0 && leaderLap > 0 && leaderLap <= totalRaceLaps && (
                      <ReferenceLine
                        x={leaderLap}
                        stroke="#FFD600"
                        strokeWidth={2}
                        label={{ value: `▶ ${leaderLap}`, position: 'insideTopRight', fill: '#FFD600', fontSize: 11, fontWeight: 'bold' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {lapMarkers.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-f1-gold" />
                      虛線＝race_control 事件
                    </span>
                  )}
                  {animationFrames.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-f1-gold" />
                      金色實線＝賽道動畫當下圈數（在「賽道動畫」分頁可拖動）
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 各車手平均圈速 + 最快圈 */}
            <Card>
              <CardHeader>
                <CardTitle>車手平均圈速 Top 10</CardTitle>
                <CardDescription>所有準確圈的平均（越低越快）</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={driverAvgLapData(laps, driverTeam)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis dataKey="driver" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" domain={['dataMin - 0.3', 'dataMax + 0.3']} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}s`} />
                    <Bar dataKey="avg" fill="#E10600">
                      {driverAvgLapData(laps, driverTeam).map((row, i) => (
                        <Cell key={i} fill={TEAM_COLORS[row.team] || '#E10600'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 賽道動畫 */}
          <TabsContent value="track" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-f1-red" />Monza 即時 GPS 回放
                    </CardTitle>
                    <CardDescription>
                      共 {animationFrames.length} 幀 · 20 位車手 · 賽道輪廓來自 VER 最快圈遙測
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setPlaying((p) => !p)}
                      className="bg-f1-red hover:bg-f1-red/80"
                    >
                      {playing ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                      {playing ? '暫停' : '播放'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setFrameIdx(0); setPlaying(false); }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />重置
                    </Button>
                    <div className="flex items-center gap-1 text-xs">
                      {[1, 2, 4, 8].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={`px-2 py-1 rounded font-mono ${
                            speed === s
                              ? 'bg-f1-red text-white'
                              : 'bg-f1-ink border border-f1-charcoal text-muted-foreground hover:border-f1-red/50'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 進度條 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono w-16">
                    Frame {frameIdx} / {animationFrames.length}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, animationFrames.length - 1)}
                    value={frameIdx}
                    onChange={(e) => setFrameIdx(Number(e.target.value))}
                    className="flex-1 accent-f1-red"
                  />
                  <span className="text-xs text-muted-foreground font-mono w-20 text-right">
                    t = {animationFrames[frameIdx]?.t ?? '—'}
                  </span>
                </div>

                {/* 主畫布 + 即時排名 */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
                <div className="bg-f1-black border border-f1-charcoal rounded-md overflow-hidden relative">
                  {/* 左上 HUD：當前圈數 */}
                  <div className="absolute top-2 left-2 z-10 bg-f1-ink/90 border border-f1-charcoal rounded-md px-3 py-1.5 backdrop-blur-sm">
                    <div className="text-[10px] text-muted-foreground">領先車手 LAP</div>
                    <div className="font-mono text-2xl font-bold text-f1-gold leading-none">
                      {leaderLap} <span className="text-xs text-muted-foreground">/ {totalRaceLaps}</span>
                    </div>
                  </div>
                  <svg
                    viewBox={`${trackBounds.x} ${trackBounds.y} ${trackBounds.w} ${trackBounds.h}`}
                    className="w-full h-auto"
                    style={{ aspectRatio: `${trackBounds.w} / ${trackBounds.h}`, maxHeight: 600 }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* y 軸翻轉，讓賽道方向符合常見呈現 */}
                    <g transform={`translate(0 ${trackBounds.y * 2 + trackBounds.h}) scale(1 -1)`}>
                      {/* 賽道輪廓 */}
                      <path
                        d={trackPath}
                        fill="none"
                        stroke="#38383F"
                        strokeWidth={120}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <path
                        d={trackPath}
                        fill="none"
                        stroke="#15151E"
                        strokeWidth={80}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* 中線 */}
                      <path
                        d={trackPath}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={4}
                        strokeDasharray="40 40"
                        opacity={0.3}
                      />

                      {/* 車手點 */}
                      {animationFrames[frameIdx]?.drivers.map((d) => {
                        const team = driverTeam[d.driver];
                        const color = TEAM_COLORS[team] || '#FFFFFF';
                        const isHighlight = d.driver === highlightDriver;
                        return (
                          <g key={d.driver}>
                            <circle
                              cx={d.x}
                              cy={d.y}
                              r={isHighlight ? 220 : 160}
                              fill={color}
                              stroke={isHighlight ? '#FFD600' : '#000'}
                              strokeWidth={isHighlight ? 50 : 20}
                            />
                            {/* 車手代碼（用 transform 反翻轉文字以保正立） */}
                            <g transform={`translate(${d.x} ${d.y}) scale(1 -1) translate(${-d.x} ${-d.y})`}>
                              <text
                                x={d.x}
                                y={d.y - 350}
                                textAnchor="middle"
                                fontSize={isHighlight ? 280 : 200}
                                fontWeight="bold"
                                fill={isHighlight ? '#FFD600' : '#FFFFFF'}
                                stroke="#000"
                                strokeWidth={isHighlight ? 30 : 20}
                                paintOrder="stroke"
                              >
                                {d.driver}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>

                {/* 即時排名 overlay */}
                <div className="bg-f1-ink border border-f1-charcoal rounded-md p-3 max-h-[600px] overflow-y-auto">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 sticky top-0 bg-f1-ink pb-1">
                    <Trophy className="w-3 h-3 text-f1-gold" />即時排名
                  </div>
                  <ol className="space-y-1">
                    {ranking.map((r) => {
                      const color = TEAM_COLORS[r.team] || '#666';
                      const isHighlight = r.driver === highlightDriver;
                      return (
                        <li
                          key={r.driver}
                          onClick={() => setHighlightDriver(r.driver)}
                          className={`flex items-center gap-2 text-xs px-2 py-1 rounded cursor-pointer transition ${
                            isHighlight ? 'bg-f1-gold/10 border border-f1-gold/40' : 'hover:bg-f1-charcoal/40'
                          }`}
                        >
                          <span className="font-mono w-5 text-right text-muted-foreground">{r.position}</span>
                          <span className="w-1 h-4 rounded-sm" style={{ background: color }} />
                          <span className="font-mono font-bold w-9">{r.driver}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                            {r.position === 1 ? 'LEADER' : `+${(r.gap / trackLength).toFixed(2)}L`}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                </div>

                {/* 車手 chips（點擊高亮） */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-f1-gold" />
                    點擊車手代碼 → 高亮顯示（金色描邊）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set((animationFrames[0]?.drivers || []).map((d) => d.driver))].sort().map((d) => {
                      const active = d === highlightDriver;
                      const team = driverTeam[d];
                      const color = TEAM_COLORS[team] || '#fff';
                      return (
                        <button
                          key={d}
                          onClick={() => setHighlightDriver(d)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono border transition flex items-center gap-1.5 ${
                            active
                              ? 'bg-f1-gold/10 border-f1-gold text-f1-gold'
                              : 'bg-f1-ink border-f1-charcoal text-muted-foreground hover:border-f1-red/50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 智慧洞察 */}
          <TabsContent value="insight" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-f1-red" />關鍵事件解讀
                  </CardTitle>
                  <CardDescription>從 race_control 自動偵測的事故、旗號、罰時</CardDescription>
                </CardHeader>
                <CardContent>
                  {keyMoments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">本場無特別事件</p>
                  ) : (
                    <ul className="space-y-2">
                      {keyMoments.map((m, i) => (
                        <li key={i} className="border-l-2 pl-3 py-1" style={{ borderColor: m.color }}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">第 {m.lap} 圈</span>
                            <Badge variant="outline" className="text-[10px]" style={{ borderColor: m.color, color: m.color }}>
                              {m.label}
                            </Badge>
                            {m.drivers.length > 0 && (
                              <span className="font-mono text-[10px]">{m.drivers.join(' · ')}</span>
                            )}
                          </div>
                          <p className="text-sm mt-0.5">{m.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tacticalReading(m)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-f1-gold" />胎種效能比較
                  </CardTitle>
                  <CardDescription>各胎種所有準確圈的平均（秒，越低越快）</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={compoundPace} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                      <XAxis type="number" stroke="#9ca3af" domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                      <YAxis type="category" dataKey="compound" stroke="#9ca3af" width={80} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}s`} />
                      <Bar dataKey="avg">
                        {compoundPace.map((row, i) => (
                          <Cell key={i} fill={COMPOUND_COLORS[row.compound] || '#666'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    {compoundPace.length > 0 && (
                      <p>
                        <Lightbulb className="w-3 h-3 inline text-f1-gold mr-1" />
                        最快胎種：<span className="text-f1-gold font-bold">{compoundPace[0].compound}</span>
                        （{compoundPace[0].avg}s 平均、{compoundPace[0].samples} 樣本）
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>進站時機分布</CardTitle>
                <CardDescription>各車手換胎圈分布；落點越集中代表車隊策略越趨同</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis
                      type="number"
                      dataKey="lap"
                      domain={[1, totalRaceLaps]}
                      stroke="#9ca3af"
                      label={{ value: '進站圈', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="driver"
                      stroke="#9ca3af"
                      width={50}
                      allowDuplicatedCategory={false}
                    />
                    <ZAxis range={[80, 80]} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v, name, p) => {
                        if (name === 'lap') return [`第 ${v} 圈`, '進站'];
                        return [v, name];
                      }}
                      labelFormatter={() => ''}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const p = payload[0].payload;
                        return (
                          <div style={TOOLTIP_STYLE.contentStyle} className="px-3 py-2 text-xs">
                            <div className="font-bold" style={{ color: '#FFD600' }}>{p.driver} · 第 {p.lap} 圈</div>
                            <div className="text-muted-foreground">{p.fromCompound} → {p.toCompound}</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={pitStops}>
                      {pitStops.map((p, i) => (
                        <Cell key={i} fill={COMPOUND_COLORS[p.toCompound] || '#666'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  色點代表進站後換上的胎種；共 {pitStops.length} 次進站
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 輪胎策略 */}
          <TabsContent value="strategy" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>輪胎策略 — 各車手 Stint</CardTitle>
                <CardDescription>顏色：紅=軟胎、黃=中性、白=硬胎、綠=雨胎</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                    {Object.entries(COMPOUND_COLORS).map(([k, c]) => (
                      <span key={k} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm border border-f1-charcoal" style={{ background: c }} />
                        {k}
                      </span>
                    ))}
                  </div>
                  {stintRows.map((row) => (
                    <StintRow key={row.driver} row={row} totalLaps={totalRaceLaps} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 天氣 */}
          <TabsContent value="weather" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>氣溫 vs 賽道溫度</CardTitle>
                <CardDescription>逐分鐘變化 — 賽道溫度高代表輪胎更易過熱</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={weatherChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis dataKey="minute" stroke="#9ca3af" label={{ value: '經過分鐘', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                    <YAxis stroke="#9ca3af" label={{ value: '°C', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}°C`} />
                    <Legend />
                    <Line type="monotone" name="賽道溫度" dataKey="track" stroke="#E10600" strokeWidth={2} dot={false} />
                    <Line type="monotone" name="氣溫" dataKey="air" stroke="#27F4D2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>風速與濕度</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={weatherChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis dataKey="minute" stroke="#9ca3af" />
                    <YAxis yAxisId="left" stroke="#9ca3af" />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <Bar yAxisId="left" name="風速 (m/s)" dataKey="wind" fill="#FFD600" />
                    <Line yAxisId="right" name="濕度 (%)" type="monotone" dataKey="humidity" stroke="#3671C6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 遙測 */}
          <TabsContent value="telemetry" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>VER 最快圈 — 速度曲線</CardTitle>
                <CardDescription>沿賽道距離（公尺）的速度變化，谷底即彎角</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={telemetryChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis dataKey="distance" stroke="#9ca3af" label={{ value: '距離 (m)', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                    <YAxis stroke="#9ca3af" label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v} km/h`} labelFormatter={(l) => `距離 ${l} m`} />
                    <Line type="monotone" name="速度" dataKey="speed" stroke="#3671C6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>油門 vs 煞車</CardTitle>
                <CardDescription>油門 0–100%；煞車為 on/off（顯示為 0 或 100）</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={telemetryChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38383F" />
                    <XAxis dataKey="distance" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <Area type="monotone" name="油門 %" dataKey="throttle" stroke="#27F4D2" fill="#27F4D233" />
                    <Area type="monotone" name="煞車" dataKey="brake" stroke="#E10600" fill="#E1060044" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 賽事事件 */}
          <TabsContent value="events" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>賽事事件時序</CardTitle>
                <CardDescription>旗號、罰則、藍旗等所有 race control 訊息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-f1-charcoal text-muted-foreground text-xs">
                        <th className="text-left py-2 pr-3">時間</th>
                        <th className="text-left py-2 pr-3">圈</th>
                        <th className="text-left py-2 pr-3">類型</th>
                        <th className="text-left py-2 pr-3">範圍</th>
                        <th className="text-left py-2">訊息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raceControl.slice(0, 60).map((rc, i) => (
                        <tr key={i} className="border-b border-f1-charcoal/40 hover:bg-f1-ink/60">
                          <td className="py-2 pr-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {String(rc.date || '').slice(11, 19)}
                          </td>
                          <td className="py-2 pr-3 text-xs">{rc.lap_number || '—'}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className={FLAG_BADGE[rc.flag] || 'border-f1-charcoal text-muted-foreground'}>
                              {rc.flag || rc.category}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs">{rc.scope || '—'}</td>
                          <td className="py-2 text-xs">{rc.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  顯示前 60 筆 · 共 {raceControl.length} 筆事件
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 車隊 */}
          <TabsContent value="teams" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-f1-red" />車隊賽事概覽
                </CardTitle>
                <CardDescription>
                  本場積分由高至低排序 · 點擊任一車隊查看完整詳情
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {teamSummary.map((t) => (
                    <TeamCard key={t.team} team={t} onClick={() => setSelectedTeam(t)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 名次與賽程 */}
          <TabsContent value="standings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>起跑 → 完賽位置變化</CardTitle>
                <CardDescription>正值＝名次提升；負值＝名次下滑</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-f1-charcoal text-muted-foreground text-xs">
                        <th className="text-left py-2 pr-3">完賽</th>
                        <th className="text-left py-2 pr-3">車手</th>
                        <th className="text-left py-2 pr-3">車隊</th>
                        <th className="text-right py-2 pr-3">起跑</th>
                        <th className="text-right py-2 pr-3">變化</th>
                        <th className="text-right py-2">積分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionChange.map((r) => (
                        <tr key={r.driver} className="border-b border-f1-charcoal/40 hover:bg-f1-ink/60">
                          <td className="py-2 pr-3 font-bold">{r.finish || '—'}</td>
                          <td className="py-2 pr-3 font-mono">
                            <span className="inline-block w-1 h-4 mr-2 align-middle rounded-sm" style={{ background: TEAM_COLORS[r.team] || '#666' }} />
                            {r.driver}
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{r.team}</td>
                          <td className="py-2 pr-3 text-right">{r.grid || '—'}</td>
                          <td className="py-2 pr-3 text-right">
                            <PositionDelta delta={r.delta} />
                          </td>
                          <td className="py-2 text-right font-mono">{r.points || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2024 賽季賽程</CardTitle>
                <CardDescription>所有正賽分站（已過濾測試與練習日）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schedule
                    .filter((s) => s.EventFormat !== 'testing' && s.RoundNumber > 0)
                    .map((s) => (
                      <div key={s.RoundNumber} className="border border-f1-charcoal rounded-md p-3 hover:border-f1-red/50 transition">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" /> Round {s.RoundNumber}
                          <span className="ml-auto">{String(s.EventDate || '').slice(0, 10)}</span>
                        </div>
                        <div className="font-bold mt-1">{s.EventName}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" /> {s.Location}, {s.Country}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-f1-charcoal/30 mt-12 py-6 text-center text-xs text-muted-foreground">
        F1 Insight Go · Monza 2024 Race Review · 2026/05/10
      </footer>

      {selectedTeam && (
        <TeamDetailModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// 子元件（小到不值得拆檔，但拉出來讓主流程乾淨）
// ──────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl md:text-4xl font-bold ${accent || ''}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function DriverPicker({ all, selected, onChange }) {
  const toggle = (d) => {
    if (selected.includes(d)) onChange(selected.filter((x) => x !== d));
    else onChange([...selected, d]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 max-w-xl">
      {all.map((d) => {
        const active = selected.includes(d);
        return (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={`px-2.5 py-1 rounded-md text-xs font-mono border transition ${
              active
                ? 'bg-f1-red border-f1-red text-white'
                : 'bg-f1-ink border-f1-charcoal text-muted-foreground hover:border-f1-red/50'
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function StintRow({ row, totalLaps }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-4 text-right">{row.finishPos < 99 ? row.finishPos : '—'}</span>
        <span className="font-mono text-sm">{row.driver}</span>
      </div>
      <div className="flex-1 flex h-6 rounded overflow-hidden border border-f1-charcoal/50">
        {row.stints.map((s, i) => {
          const widthPct = (s.laps / totalLaps) * 100;
          return (
            <div
              key={i}
              title={`${s.compound} · 第 ${s.lapStart}–${s.lapEnd} 圈（${s.laps} 圈）`}
              style={{
                width: `${widthPct}%`,
                background: COMPOUND_COLORS[s.compound] || '#666',
                color: s.compound === 'HARD' ? '#000' : '#fff',
              }}
              className="text-[10px] font-bold flex items-center justify-center border-r border-f1-black/40 last:border-r-0"
            >
              {widthPct > 8 ? s.laps : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DriverAvatar({ driver, size = 64 }) {
  const [errored, setErrored] = useState(false);
  const initials = `${driver.firstName?.[0] || ''}${driver.lastName?.[0] || ''}`.toUpperCase();
  if (driver.headshot && !errored) {
    return (
      <img
        src={driver.headshot}
        alt={driver.fullName}
        onError={() => setErrored(true)}
        className="rounded-full bg-f1-charcoal object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-f1-charcoal flex items-center justify-center font-bold text-foreground/80"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || <User className="w-1/2 h-1/2" />}
    </div>
  );
}

function TeamCard({ team, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-f1-ink border border-f1-charcoal hover:border-f1-red/60 rounded-lg overflow-hidden transition group"
    >
      <div className="h-1.5" style={{ background: team.teamColor }} />
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">本場積分</div>
            <div className="font-bold text-2xl" style={{ color: team.teamColor }}>
              {team.points}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">最佳完賽</div>
            <div className="font-mono font-bold text-lg">P{team.bestPos < 99 ? team.bestPos : '—'}</div>
          </div>
        </div>
        <div>
          <div className="font-bold text-sm truncate">{team.team}</div>
        </div>
        <div className="flex items-center gap-2">
          {team.drivers.map((d) => (
            <div key={d.abbreviation} className="flex-1 flex items-center gap-2 min-w-0">
              <DriverAvatar driver={d} size={40} />
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold truncate">{d.abbreviation}</div>
                <div className="text-[10px] text-muted-foreground">
                  P{d.position < 99 ? d.position : '—'} · {d.points}pt
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground group-hover:text-f1-red transition">
          點擊查看詳情 →
        </div>
      </div>
    </button>
  );
}

function TeamDetailModal({ team, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-f1-ink border-2 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ borderColor: team.teamColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-f1-charcoal bg-f1-ink">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1.5 h-12 rounded-sm" style={{ background: team.teamColor }} />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold truncate" style={{ color: team.teamColor }}>{team.team}</h2>
              <div className="text-xs text-muted-foreground">
                本場 {team.points} 分 · 最佳完賽 P{team.bestPos < 99 ? team.bestPos : '—'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-f1-charcoal rounded-md text-muted-foreground hover:text-foreground transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drivers */}
        <div className="p-4 space-y-4">
          {team.drivers.map((d) => (
            <div key={d.abbreviation} className="border border-f1-charcoal rounded-lg p-4 bg-f1-black/30">
              <div className="flex items-start gap-4 flex-wrap">
                <DriverAvatar driver={d} size={96} />
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-bold">{d.fullName}</h3>
                    <Badge variant="outline" className="text-[10px]">#{d.number}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Globe2 className="w-3 h-3" />{d.country} · <span className="font-mono">{d.abbreviation}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={
                        d.status === 'Finished'
                          ? 'border-emerald-500/40 text-emerald-400'
                          : d.status === 'Lapped'
                          ? 'border-yellow-500/40 text-yellow-400'
                          : 'border-red-500/40 text-red-400'
                      }
                    >
                      {d.status}
                    </Badge>
                    {d.lapsLed > 0 && (
                      <Badge variant="outline" className="border-f1-gold/40 text-f1-gold">
                        領先 {d.lapsLed} 圈
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 flex-1 min-w-[260px]">
                  <Stat label="完賽" value={d.position < 99 ? `P${d.position}` : '—'} accent="text-f1-red" />
                  <Stat label="起跑" value={d.grid ? `P${d.grid}` : '—'} />
                  <Stat label="積分" value={d.points} accent="text-f1-gold" />
                </div>
              </div>

              {/* Detail metrics */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Metric icon={<Timer className="w-3 h-3" />} label="最快圈"
                  value={d.fastestLap ? formatLapTime(d.fastestLap) : '—'}
                  sub={d.fastestLapNumber ? `第 ${d.fastestLapNumber} 圈` : ''} />
                <Metric icon={<Gauge className="w-3 h-3" />} label="平均圈速"
                  value={d.avgLap ? formatLapTime(d.avgLap) : '—'} />
                <Metric icon={<Wrench className="w-3 h-3" />} label="進站次數"
                  value={d.pitStops} sub={d.compounds.join(' / ')} />
                <Metric icon={<Hash className="w-3 h-3" />} label="完成圈"
                  value={d.lapsCompleted} sub={d.time ? `+${String(d.time).slice(7, 19)}` : ''} />
              </div>

              {/* Position delta visual */}
              {d.grid > 0 && d.position < 99 && (
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">起跑</span>
                  <span className="font-mono font-bold">P{d.grid}</span>
                  <div className="flex-1 h-px bg-f1-charcoal relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-f1-red" style={{ width: '50%' }} />
                  </div>
                  <PositionDelta delta={d.grid - d.position} />
                  <div className="flex-1 h-px bg-f1-charcoal" />
                  <span className="text-muted-foreground">完賽</span>
                  <span className="font-mono font-bold" style={{ color: team.teamColor }}>P{d.position}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-f1-ink/60 border border-f1-charcoal rounded-md px-3 py-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold font-mono ${accent || ''}`}>{value}</div>
    </div>
  );
}

function Metric({ icon, label, value, sub }) {
  return (
    <div className="bg-f1-black/40 border border-f1-charcoal/60 rounded-md p-2">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="font-mono font-bold text-base">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}

function PositionDelta({ delta }) {
  if (delta > 0) return <span className="text-green-400 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" />+{delta}</span>;
  if (delta < 0) return <span className="text-red-400 inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" />{delta}</span>;
  return <span className="text-muted-foreground inline-flex items-center gap-1"><Minus className="w-3 h-3" />0</span>;
}

// ──────────────────────────────────────────────
// 純函式輔助
// ──────────────────────────────────────────────

function tacticalReading(m) {
  switch (m.type) {
    case 'sc':
      return '→ Safety Car 部署：圈速降低、車隊常趁此低成本進站，留意名次洗牌。';
    case 'vsc':
      return '→ Virtual Safety Car：所有車降至參考速度，進站損失較小。';
    case 'red':
      return '→ 紅旗：比賽暫停，可免費換胎，策略全面重置。';
    case 'yellow':
      return '→ 黃旗：該區段禁止超車，注意排名維持。';
    case 'incident':
      return '→ 事故發生，可能引發黃旗或 SC，留意後續罰則調查。';
    case 'penalty':
      return '→ 罰時宣判：被罰車手實際完賽時間將被加上秒數，影響最終名次。';
    case 'chequered':
      return '→ 比賽結束。';
    default:
      return '';
  }
}

function driverAvgLapData(laps, driverTeam) {
  const grouped = {};
  laps.forEach((l) => {
    if (!grouped[l.Driver]) grouped[l.Driver] = { sum: 0, n: 0 };
    grouped[l.Driver].sum += l.LapTimeSec;
    grouped[l.Driver].n += 1;
  });
  return Object.entries(grouped)
    .map(([driver, { sum, n }]) => ({
      driver,
      team: driverTeam[driver],
      avg: Number((sum / n).toFixed(3)),
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 10);
}
