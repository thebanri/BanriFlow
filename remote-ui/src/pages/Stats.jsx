import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, Cpu, Zap, Activity, ShieldAlert, 
  Layers, HardDrive, DollarSign, RefreshCw, ArrowUpRight, 
  ArrowDownLeft, Network, AlertTriangle, Clock, TrendingUp
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, 
  LabelList, PolarAngleAxis, PolarGrid, Radar, RadarChart, 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../components/ui/chart';

// Initial random helper generators
const generateInitialHistory = (points, min, max) => {
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(Date.now() - (points - i) * 2000).toLocaleTimeString('tr-TR', { hour12: false });
    const value = Math.floor(Math.random() * (max - min + 1) + min);
    return { time, value };
  });
};

const generateInitialNetworkHistory = (points) => {
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(Date.now() - (points - i) * 2000).toLocaleTimeString('tr-TR', { hour12: false });
    const rx = Math.floor(Math.random() * 50 + 20); // 20-70 Mbps
    const tx = Math.floor(Math.random() * 40 + 15); // 15-55 Mbps
    return { time, rx, tx };
  });
};

export default function Stats() {
  const [timeRange, setTimeRange] = useState('real-time'); // 'real-time' | 'weekly' | 'monthly'

  // --- Real-time Systems Data State ---
  const [cpuHistory, setCpuHistory] = useState(() => generateInitialHistory(15, 30, 65));
  const [ramHistory, setRamHistory] = useState(() => generateInitialHistory(15, 55, 75));
  const [networkHistory, setNetworkHistory] = useState(() => generateInitialNetworkHistory(15));
  
  // Current values derived from state
  const currentCpu = cpuHistory[cpuHistory.length - 1]?.value || 0;
  const currentRam = ramHistory[ramHistory.length - 1]?.value || 0;
  const currentRx = networkHistory[networkHistory.length - 1]?.rx || 0;
  const currentTx = networkHistory[networkHistory.length - 1]?.tx || 0;
  
  // Bottleneck detection
  const isBottleneck = useMemo(() => {
    return (currentRx + currentTx) > 130 || currentCpu > 85;
  }, [currentRx, currentTx, currentCpu]);

  // Network logs state
  const [bottleneckLogs, setBottleneckLogs] = useState([
    { id: 1, time: '19:12:05', type: 'Yüksek Trafik', desc: '"auth-api" servisinde ani anlık yük yükselişi', severity: 'warning' },
    { id: 2, time: '19:08:44', type: 'I/O Limiti', desc: 'Depolama alanı gp3 3,000 IOPS sınırında daralıyor', severity: 'danger' },
  ]);

  // --- Real-time Simulator Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      const timeNow = new Date().toLocaleTimeString('tr-TR', { hour12: false });
      
      // Update CPU
      setCpuHistory(prev => {
        const lastVal = prev[prev.length - 1].value;
        const drift = Math.floor(Math.random() * 17) - 8; // -8% to +8%
        const spike = Math.random() > 0.94 ? Math.floor(Math.random() * 20) + 15 : 0;
        let newVal = Math.min(Math.max(lastVal + drift + spike, 15), 98);
        return [...prev.slice(1), { time: timeNow, value: newVal }];
      });

      // Update RAM
      setRamHistory(prev => {
        const lastVal = prev[prev.length - 1].value;
        const drift = Math.floor(Math.random() * 5) - 2;
        let newVal = Math.min(Math.max(lastVal + drift, 45), 92);
        return [...prev.slice(1), { time: timeNow, value: newVal }];
      });

      // Update Network I/O
      setNetworkHistory(prev => {
        const lastRx = prev[prev.length - 1].rx;
        const lastTx = prev[prev.length - 1].tx;
        
        const isBurst = Math.random() > 0.90;
        const rxDrift = isBurst ? Math.floor(Math.random() * 50) + 40 : Math.floor(Math.random() * 12) - 6;
        const txDrift = isBurst ? Math.floor(Math.random() * 40) + 30 : Math.floor(Math.random() * 8) - 4;

        let newRx = Math.min(Math.max(lastRx + rxDrift, 10), 160);
        let newTx = Math.min(Math.max(lastTx + txDrift, 8), 120);

        if (newRx + newTx > 140) {
          setBottleneckLogs(old => {
            const exists = old.some(log => log.time === timeNow);
            if (exists) return old;
            const newLog = {
              id: Date.now(),
              time: timeNow,
              type: 'Ağ Tıkanıklığı',
              desc: `Anlık hız ${(newRx + newTx)} Mbps sınırına ulaştı (Rx: ${newRx} / Tx: ${newTx})`,
              severity: 'danger'
            };
            return [newLog, ...old.slice(0, 4)];
          });
        }

        return [...prev.slice(1), { time: timeNow, rx: newRx, tx: newTx }];
      });

    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // --- Chart Configs (Renk Seçimleri Taki UI Stilinde) ---
  const cpuConfig = {
    value: {
      label: "CPU Kullanımı (%)",
      color: "#06b6d4", // Cyan
    }
  };

  const ramConfig = {
    value: {
      label: "RAM Kullanımı (%)",
      color: "#8b5cf6", // Purple
    }
  };

  const networkConfig = {
    rx: {
      label: "Gelen (Rx)",
      color: "#3b82f6", // Blue
    },
    tx: {
      label: "Giden (Tx)",
      color: "#ec4899", // Pink
    }
  };

  const electricityConfig = {
    kwh: {
      label: "Tüketim (kWh)",
      color: "#f59e0b", // Amber
    }
  };

  const aiConfig = {
    openai: { label: "OpenAI", color: "#10b981" },
    gemini: { label: "Gemini", color: "#6366f1" },
    claude: { label: "Claude (Anthropic)", color: "#f97316" },
    groq: { label: "Groq API", color: "#ef4444" }
  };

  const awsConfig = {
    cost: {
      label: "Maliyet ($)",
      color: "#4f46e5", // Indigo
    }
  };

  const tfConfig = {
    cost: {
      label: "Terraform ($)",
      color: "#d946ef", // Fuchsia
    }
  };

  // --- Electricity Usage Data ---
  const electricityWeeklyData = [
    { name: 'Pzt', kwh: 340, cost: 51 },
    { name: 'Sal', kwh: 380, cost: 57 },
    { name: 'Çar', kwh: 410, cost: 61.5 },
    { name: 'Per', kwh: 395, cost: 59.2 },
    { name: 'Cum', kwh: 440, cost: 66 },
    { name: 'Cmt', kwh: 320, cost: 48 },
    { name: 'Paz', kwh: 290, cost: 43.5 },
  ];

  const electricityMonthlyData = [
    { name: 'Ocak', kwh: 1520, cost: 228 },
    { name: 'Şubat', kwh: 1480, cost: 222 },
    { name: 'Mart', kwh: 1610, cost: 241.5 },
    { name: 'Nisan', kwh: 1550, cost: 232.5 },
    { name: 'Mayıs', kwh: 1690, cost: 253.5 },
    { name: 'Haziran', kwh: 1750, cost: 262.5 },
  ];

  // --- AI Token Usage Data ---
  const aiWeeklyData = [
    { name: 'OpenAI', tokens: 6300000, value: 6.3, cost: 31.50, fill: aiConfig.openai.color },
    { name: 'Gemini', tokens: 11200000, value: 11.2, cost: 16.80, fill: aiConfig.gemini.color },
    { name: 'Claude', tokens: 2800000, value: 2.8, cost: 42.00, fill: aiConfig.claude.color },
    { name: 'Groq', tokens: 18500000, value: 18.5, cost: 7.40, fill: aiConfig.groq.color }
  ];

  const aiMonthlyData = [
    { name: 'OpenAI', tokens: 28500000, value: 28.5, cost: 142.50, fill: aiConfig.openai.color },
    { name: 'Gemini', tokens: 49000000, value: 49.0, cost: 73.50, fill: aiConfig.gemini.color },
    { name: 'Claude', tokens: 12100000, value: 12.1, cost: 181.50, fill: aiConfig.claude.color },
    { name: 'Groq', tokens: 82000000, value: 82.0, cost: 32.80, fill: aiConfig.groq.color }
  ];

  // --- AWS Cost Estimation Data ---
  const awsWeeklyData = [
    { name: 'EC2', cost: 78.50 },
    { name: 'EKS', cost: 95.00 },
    { name: 'RDS', cost: 52.30 },
    { name: 'S3', cost: 24.10 },
    { name: 'Networking', cost: 36.80 },
  ];

  const awsMonthlyData = [
    { name: 'EC2', cost: 320.00 },
    { name: 'EKS', cost: 380.00 },
    { name: 'RDS', cost: 215.00 },
    { name: 'S3', cost: 98.50 },
    { name: 'Networking', cost: 152.00 },
  ];

  // --- Terraform Costs Data ---
  const tfWeeklyData = [
    { workspace: 'Dev', cost: 62 },
    { workspace: 'Staging', cost: 95 },
    { workspace: 'Prod', cost: 280 }
  ];

  const tfMonthlyData = [
    { workspace: 'Dev', cost: 248 },
    { workspace: 'Staging', cost: 380 },
    { workspace: 'Prod', cost: 1120 }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-950 text-slate-100 pb-24 relative">
      {/* Header section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900/75 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart2 size={36} className="text-cyan-400 animate-pulse" />
            Sistem Metrikleri & FinOps Dashboard
          </h1>
          <p className="text-slate-400 mt-2 text-sm flex items-center gap-2">
            <Activity size={16} className="text-emerald-500 animate-pulse" />
            Taki UI Grafik Bileşenleri ile Güçlendirilmiş Canlı İzleme Paneli.
          </p>
        </div>

        {/* Global time range tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-900/60 border border-slate-800/80 rounded-xl glass">
          {[
            { id: 'real-time', label: 'Anlık Raporlar' },
            { id: 'weekly', label: 'Haftalık Analiz' },
            { id: 'monthly', label: 'Aylık Analiz' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeRange(opt.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                timeRange === opt.id 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* ========================================================
            CARD 1: CPU USAGE (TAKI UI AREA CHART DEFAULT STYLE)
           ======================================================== */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                <Cpu size={20} className="text-cyan-400" />
                Anlık CPU Kullanımı
              </CardTitle>
              <CardDescription>
                Son 30 saniye içindeki anlık CPU dalgalanması
              </CardDescription>
            </div>
            <span className="text-2xl font-mono font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-3 py-1 rounded-xl">
              {currentCpu}%
            </span>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cpuConfig} className="h-48">
              <AreaChart
                accessibilityLayer
                data={cpuHistory}
                margin={{ left: 12, right: 12, top: 10 }}
              >
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(-5)}
                />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} stroke="#64748b" style={{ fontSize: 10 }} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  dataKey="value"
                  type="natural"
                  fill="var(--color-value)"
                  fillOpacity={0.2}
                  stroke="var(--color-value)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-row items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-cyan-500 animate-spin" /> Veriler 2 saniyede bir güncelleniyor
            </div>
            <div className="font-semibold text-slate-200">Ortalama: 45.2%</div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 2: RAM USAGE (TAKI UI AREA CHART DEFAULT STYLE)
           ======================================================== */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                <Cpu size={20} className="text-purple-400" />
                Anlık RAM Kullanımı
              </CardTitle>
              <CardDescription>
                Küme genelindeki anlık bellek tüketim yüzdesi
              </CardDescription>
            </div>
            <span className="text-2xl font-mono font-bold text-purple-400 bg-purple-500/5 border border-purple-500/10 px-3 py-1 rounded-xl">
              {currentRam}%
            </span>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ramConfig} className="h-48">
              <AreaChart
                accessibilityLayer
                data={ramHistory}
                margin={{ left: 12, right: 12, top: 10 }}
              >
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(-5)}
                />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} stroke="#64748b" style={{ fontSize: 10 }} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  dataKey="value"
                  type="natural"
                  fill="var(--color-value)"
                  fillOpacity={0.2}
                  stroke="var(--color-value)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-row items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <HardDrive size={14} className="text-purple-400" /> Limit Kapasitesi: 64 GB
            </div>
            <div className="font-semibold text-slate-200">Aktif Tüketim: {(64 * currentRam / 100).toFixed(1)} GB</div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 3: NETWORK I/O & BOTTLECK (STACKED / MULTI AREA)
           ======================================================== */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row justify-between items-start pb-2">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                <Network size={20} className="text-blue-400" />
                Ağ (Network) Giriş/Çıkış Hızları & Darboğaz Uyarıları
              </CardTitle>
              <CardDescription>
                Küme genelindeki anlık veri transfer oranları (Rx: Gelen, Tx: Giden)
              </CardDescription>
            </div>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
              isBottleneck 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isBottleneck ? 'AĞ DARBOĞAZI ALGILANDI' : 'AĞ BAĞLANTISI STABİL'}
            </span>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Area */}
            <div className="lg:col-span-2">
              <ChartContainer config={networkConfig} className="h-56">
                <AreaChart
                  accessibilityLayer
                  data={networkHistory}
                  margin={{ left: 12, right: 12, top: 10 }}
                >
                  <CartesianGrid vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(-5)}
                  />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" style={{ fontSize: 10 }} unit=" M" />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="rx"
                    type="monotone"
                    fill="var(--color-rx)"
                    fillOpacity={0.15}
                    stroke="var(--color-rx)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="tx"
                    type="monotone"
                    fill="var(--color-tx)"
                    fillOpacity={0.15}
                    stroke="var(--color-tx)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Incident Alert Logs */}
            <div className="flex flex-col gap-3 justify-center">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" />
                Algılanan Ağ Darboğaz Olayları
              </span>
              <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 min-h-[160px] overflow-y-auto max-h-[220px] font-mono text-[11px] flex flex-col gap-3 divide-y divide-slate-900/60">
                {bottleneckLogs.map((log) => (
                  <div key={log.id} className="pt-2.5 first:pt-0 flex flex-col gap-1 justify-between">
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>[{log.time}]</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        log.severity === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.severity}
                      </span>
                    </div>
                    <span className="text-slate-200 font-bold">{log.type}</span>
                    <span className="text-slate-400 leading-relaxed">{log.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========================================================
            CARD 4: ELECTRICITY CONSUMPTION (BAR CHART LABEL STİLİ)
           ======================================================== */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  Elektrik Tüketimi
                </CardTitle>
                <CardDescription>
                  {timeRange === 'monthly' ? 'Son 6 aylık elektrik sarfiyatı (kWh)' : 'Bu haftaki günlük elektrik sarfiyatı (kWh)'}
                </CardDescription>
              </div>
              <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-850">
                Birim Fiyat: $0.15/kWh
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={electricityConfig} className="h-56">
              <BarChart
                accessibilityLayer
                data={timeRange === 'monthly' ? electricityMonthlyData : electricityWeeklyData}
                margin={{ top: 20 }}
              >
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="kwh" fill="var(--color-kwh)" radius={6}>
                  <LabelList
                    position="top"
                    offset={10}
                    className="fill-slate-300 font-mono"
                    fontSize={10}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-xs text-slate-400">
            <div className="flex gap-2 items-center leading-none font-medium text-slate-200">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Geçen döneme göre elektrik tüketimi %5.2 azaldı
            </div>
            <div className="text-slate-500">
              Tahmini Maliyet: <span className="text-emerald-400 font-bold font-mono">${timeRange === 'monthly' ? '1,428.00' : '386.20'}</span>
            </div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 5: AI TOKEN USAGE (PIE CHART STİLİ)
           ======================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers size={20} className="text-indigo-400" />
              Yapay Zeka Token Harcamaları
            </CardTitle>
            <CardDescription>
              {timeRange === 'monthly' ? 'Aylık yapay zeka kullanım hacmi kırılımı (Milyon Token)' : 'Haftalık yapay zeka kullanım hacmi kırılımı (Milyon Token)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-around items-center gap-6 pb-2">
            
            {/* Donut Chart */}
            <div className="h-48 w-48 relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeRange === 'monthly' ? aiMonthlyData : aiWeeklyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(timeRange === 'monthly' ? aiMonthlyData : aiWeeklyData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Toplam</span>
                <span className="text-base font-mono font-bold text-slate-200">
                  {timeRange === 'monthly' ? '171.6M' : '38.8M'}
                </span>
              </div>
            </div>

            {/* Detail stats legend table */}
            <div className="flex-1 flex flex-col gap-2.5 w-full">
              {(timeRange === 'monthly' ? aiMonthlyData : aiWeeklyData).map((prov, i) => (
                <div key={i} className="p-3 bg-slate-950/70 border border-slate-900/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prov.fill }}></div>
                    <span className="text-xs font-semibold text-slate-300">{prov.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold block text-slate-200">{prov.value}M Token</span>
                    <span className="text-[9px] font-mono text-slate-500">Maliyet: <span className="text-emerald-500 font-bold">${prov.cost.toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
          <CardFooter className="text-xs text-slate-400 justify-between">
            <span>En yüksek kullanım: <b>Groq API</b> (Hız öncelikli)</span>
            <span className="text-emerald-500 font-bold font-mono">Toplam: ${timeRange === 'monthly' ? '430.30' : '97.70'}</span>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 6: AWS INFRASTRUCTURE COST (BAR CHART STİLİ)
           ======================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} className="text-indigo-400" />
              AWS Altyapı FinOps Giderleri
            </CardTitle>
            <CardDescription>
              AWS servislerinin {timeRange === 'monthly' ? 'aylık' : 'haftalık'} fatura tahmin kırılımı ($)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={awsConfig} className="h-56">
              <BarChart
                accessibilityLayer
                data={timeRange === 'monthly' ? awsMonthlyData : awsWeeklyData}
                margin={{ top: 20 }}
              >
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={6}>
                  <LabelList
                    position="top"
                    offset={10}
                    className="fill-slate-300 font-mono"
                    fontSize={10}
                    formatter={(v) => `$${v.toFixed(0)}`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="justify-between text-xs text-slate-400">
            <span>En yüksek maliyet: <b>EKS (Kubernetes)</b></span>
            <span className="font-semibold text-slate-200">Toplam AWS Maliyeti: <span className="text-emerald-400 font-bold font-mono">${timeRange === 'monthly' ? '1,166.00' : '286.70'}</span></span>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 7: TERRAFORM WORKSPACE ESTIMATES (RADAR CHART STİLİ)
           ======================================================== */}
        <Card>
          <CardHeader className="items-center">
            <CardTitle className="flex items-center gap-2">
              <Layers size={20} className="text-fuchsia-400" />
              Terraform Workspace Bütçe Dağılımı
            </CardTitle>
            <CardDescription>
              Workspace bazında planlanan ve ayrılan {timeRange === 'monthly' ? 'aylık' : 'haftalık'} bütçeler ($)
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer
              config={tfConfig}
              className="mx-auto aspect-square max-h-[220px]"
            >
              <RadarChart data={timeRange === 'monthly' ? tfMonthlyData : tfWeeklyData}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <PolarAngleAxis dataKey="workspace" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarGrid stroke="#334155" />
                <Radar
                  name="Terraform Altyapı Maliyeti"
                  dataKey="cost"
                  fill="var(--color-cost)"
                  fillOpacity={0.35}
                  stroke="var(--color-cost)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fillOpacity: 1,
                  }}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 leading-none font-medium text-slate-200">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Terraform planlarında sapma oranı %4.8 olarak ölçüldü
            </div>
            <div className="text-slate-500 font-mono text-[10px] text-center w-full">
              Dev: ${timeRange === 'monthly' ? '248' : '62'} | Staging: ${timeRange === 'monthly' ? '380' : '95'} | Prod: ${timeRange === 'monthly' ? '1,120' : '280'}
            </div>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}

