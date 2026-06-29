import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { 
  BarChart2, Cpu, Zap, Activity, ShieldAlert, 
  Layers, HardDrive, DollarSign, RefreshCw, ArrowUpRight, 
  ArrowDownLeft, Network, AlertTriangle, Clock, TrendingUp
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, 
  LabelList, PolarAngleAxis, PolarGrid, Radar, RadarChart, 
  Pie, Cell, ResponsiveContainer, RadialBar, RadialBarChart
} from 'recharts';

import { PieChart } from '../components/charts/pie-chart';
import { PieSlice } from '../components/charts/pie-slice';
import { PieCenter } from '../components/charts/pie-center';

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

// Initial helper to seed empty chart history
const generateInitialHistory = (points) => {
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(Date.now() - (points - i) * 2000).toLocaleTimeString('tr-TR', { hour12: false });
    return { time, value: 0 };
  });
};

const generateInitialNetworkHistory = (points) => {
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(Date.now() - (points - i) * 2000).toLocaleTimeString('tr-TR', { hour12: false });
    return { time, rx: 0, tx: 0 };
  });
};

export default function Stats() {
  // --- Local Card-level Time Range States ---
  const [awsTimeRange, setAwsTimeRange] = useState('weekly'); 
  const [aiTimeRange, setAiTimeRange] = useState('weekly');   
  const [tfTimeRange, setTfTimeRange] = useState('weekly');   
  const [elecTimeRange, setElecTimeRange] = useState('weekly'); 
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // --- Real-time Systems Data State ---
  const [cpuHistory, setCpuHistory] = useState(() => generateInitialHistory(15));
  const [ramHistory, setRamHistory] = useState(() => generateInitialHistory(15));
  const [networkHistory, setNetworkHistory] = useState(() => generateInitialNetworkHistory(15));
  const [hasError, setHasError] = useState(false);
  
  // Current values derived from state
  const currentCpu = cpuHistory[cpuHistory.length - 1]?.value || 0;
  const currentRam = ramHistory[ramHistory.length - 1]?.value || 0;
  const currentRx = networkHistory[networkHistory.length - 1]?.rx || 0;
  const currentTx = networkHistory[networkHistory.length - 1]?.tx || 0;

  // Live Cluster Data & Log Counts from Go API
  const [clusterTopology, setClusterTopology] = useState({ pods: [], services: [] });
  const [liveMetrics, setLiveMetrics] = useState(null);
  
  const liveMetricsRef = useRef(null);
  useEffect(() => {
    liveMetricsRef.current = liveMetrics;
  }, [liveMetrics]);

  // Network logs state
  const [bottleneckLogs, setBottleneckLogs] = useState([
    { id: 1, time: 'Init', type: 'Sistem Başlatıldı', desc: 'Canlı donanım ve ağ dinleyicileri aktif.', severity: 'warning' },
  ]);

  // --- Fetch Topology from Backend ---
  useEffect(() => {
    const fetchTopology = () => {
      const url = `http://${window.location.hostname}:3005/api/topology`;
      axios.get(url)
        .then(res => {
          if (res.data && res.data.nodes) {
            const pods = res.data.nodes.filter(n => n.group === 'pod');
            const services = res.data.nodes.filter(n => n.group === 'service');
            setClusterTopology({ pods, services });
          }
        })
        .catch(err => console.warn("Topology API not reachable. Using fallback values.", err));
    };

    fetchTopology();
    const interval = setInterval(fetchTopology, 8000);
    return () => clearInterval(interval);
  }, []);

  // --- Fetch Live Host OS Metrics & Chart Data from Go Backend ---
  useEffect(() => {
    const fetchSystemMetrics = () => {
      const url = `http://${window.location.hostname}:3005/api/system/metrics`;
      axios.get(url)
        .then(res => {
          if (res.data) {
            setLiveMetrics(res.data);
            setHasError(false);
          }
        })
        .catch(err => {
          setLiveMetrics(null); 
          setHasError(true);
        });
    };

    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Bottleneck detection
  const isBottleneck = useMemo(() => {
    return (currentRx + currentTx) > 130 || currentCpu > 85;
  }, [currentRx, currentTx, currentCpu]);

  // --- Real-time Simulator & Live Updater Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      const timeNow = new Date().toLocaleTimeString('tr-TR', { hour12: false });
      const currentLive = liveMetricsRef.current;

      if (currentLive) {
        // USE REAL LIVE DATA from Raspberry Pi / Host Machine
        setCpuHistory(prev => {
          const base = prev.length === 0 ? generateInitialHistory(15) : prev;
          return [...base.slice(1), { time: timeNow, value: Math.round(currentLive.cpuPercent) }];
        });
        setRamHistory(prev => {
          const base = prev.length === 0 ? generateInitialHistory(15) : prev;
          return [...base.slice(1), { time: timeNow, value: Math.round(currentLive.memPercent) }];
        });
        
        const rxMbps = Math.round(currentLive.netRxMBps * 8 * 10) / 10;
        const txMbps = Math.round(currentLive.netTxMBps * 8 * 10) / 10;
        setNetworkHistory(prev => {
          const base = prev.length === 0 ? generateInitialNetworkHistory(15) : prev;
          return [...base.slice(1), { time: timeNow, rx: rxMbps, tx: txMbps }];
        });

        if (rxMbps + txMbps > 120) {
          setBottleneckLogs(old => {
            const exists = old.some(log => log.time === timeNow);
            if (exists) return old;
            const newLog = {
              id: Date.now(),
              time: timeNow,
              type: 'Yüksek Ağ Yoğunluğu',
              desc: `Canlı trafik ${rxMbps + txMbps} Mbps sınırına ulaştı (Rx: ${rxMbps} / Tx: ${txMbps})`,
              severity: 'warning'
            };
            return [newLog, ...old.slice(0, 4)];
          });
        }
      } else {
        if (hasError) {
          setCpuHistory([]);
          setRamHistory([]);
          setNetworkHistory([]);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [clusterTopology.pods, hasError]);

  // --- Dynamic presence detection for AWS & Terraform ---
  const hasAws = useMemo(() => {
    const hasAwsPod = clusterTopology.pods.some(p => 
      (p.name && p.name.toLowerCase().includes('aws')) || 
      (p.name && p.name.toLowerCase().includes('eks')) ||
      (p.namespace && p.namespace.toLowerCase().includes('aws'))
    );
    const hasAwsService = clusterTopology.services.some(s => 
      (s.name && s.name.toLowerCase().includes('aws')) || 
      (s.name && s.name.toLowerCase().includes('eks'))
    );
    return hasAwsPod || hasAwsService;
  }, [clusterTopology]);

  const hasTerraform = useMemo(() => {
    const hasTfPod = clusterTopology.pods.some(p => 
      (p.name && p.name.toLowerCase().includes('terraform')) || 
      (p.name && p.name.toLowerCase().includes('tf-')) ||
      (p.namespace && p.namespace.toLowerCase().includes('terraform'))
    );
    return hasTfPod;
  }, [clusterTopology]);

  // --- Chart Configs ---
  const cpuConfig = {
    value: {
      label: "CPU Kullanımı (%)",
      color: "#06b6d4", 
    }
  };

  const ramConfig = {
    value: {
      label: "RAM Kullanımı (%)",
      color: "#8b5cf6", 
    }
  };

  const networkConfig = {
    rx: {
      label: "Gelen (Rx)",
      color: "#3b82f6", 
    },
    tx: {
      label: "Giden (Tx)",
      color: "#ec4899", 
    }
  };

  const electricityConfig = {
    kwh: {
      label: "Tüketim (kWh)",
      color: "#f59e0b", 
    }
  };

  const aiConfig = {
    value: { label: "Token" },
    openai: { label: "OpenAI", color: "#10b981" },
    gemini: { label: "Gemini", color: "#6366f1" },
    claude: { label: "Claude", color: "#f97316" },
    groq: { label: "Groq API", color: "#ef4444" }
  };

  const awsConfig = {
    cost: {
      label: "Maliyet ($)",
      color: "#4f46e5", 
    }
  };

  const tfConfig = {
    cost: {
      label: "Terraform ($)",
      color: "#d946ef", 
    }
  };

  const electricityWeeklyData = useMemo(() => {
    const raw = liveMetrics?.electricityWeekly || [];
    return raw.map((item, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dayStr = String(date.getDate()).padStart(2, '0');
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      return {
        ...item,
        name: `${dayStr}.${monthStr}`
      };
    });
  }, [liveMetrics]);

  const electricityMonthlyData = useMemo(() => {
    return liveMetrics?.electricityMonthly || [];
  }, [liveMetrics]);

  const aiData = useMemo(() => {
    const raw = liveMetrics?.aiWeekly || [];
    return raw.map(d => {
      let color = "#ffffff";
      const name = d.name ? d.name.toLowerCase() : "";
      if (name.includes("openai")) color = aiConfig.openai.color;
      else if (name.includes("gemini")) color = aiConfig.gemini.color;
      else if (name.includes("claude")) color = aiConfig.claude.color;
      else if (name.includes("groq")) color = aiConfig.groq.color;
      return { ...d, fill: color };
    });
  }, [liveMetrics]);

  const activeAiData = useMemo(() => {
    const filtered = aiData.filter(d => d.value > 0);
    return filtered.length > 0 ? filtered : aiData;
  }, [aiData]);

  const pieData = useMemo(() => {
    return activeAiData.map(d => ({
      label: d.name,
      value: d.value,
      color: d.fill,
      fill: d.fill,
      cost: d.cost
    }));
  }, [activeAiData]);

  const awsWeeklyData = useMemo(() => {
    return liveMetrics?.awsWeekly || [];
  }, [liveMetrics]);

  const awsMonthlyData = useMemo(() => {
    return liveMetrics?.awsMonthly || [];
  }, [liveMetrics]);

  const tfWeeklyData = useMemo(() => {
    return liveMetrics?.tfWeekly || [];
  }, [liveMetrics]);

  const tfMonthlyData = useMemo(() => {
    return liveMetrics?.tfMonthly || [];
  }, [liveMetrics]);

  // Helper formatting function for tokens (displays K or M dynamically)
  const formatTokens = (val) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(2)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return `${val}`;
  };

  const activePodCount = liveMetrics?.podCount || clusterTopology.pods.length || 0;
  const activeServiceCount = liveMetrics?.svcCount || clusterTopology.services.length || 0;
  const activeEventCount = liveMetrics?.eventCount || 0;

  // Compute total costs helper
  const getSum = (arr, key) => arr.reduce((acc, curr) => acc + (curr[key] || 0), 0);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-950 text-slate-100 pb-24 relative">
      {/* Header section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900/75 pb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart2 size={32} className="text-cyan-400" />
            Altyapı Kaynak ve FinOps İzleme
          </h1>
          <p className="text-slate-400 mt-2 text-sm flex items-center gap-2">
            <Activity size={16} className="text-emerald-500 animate-pulse" />
            Yerel sunucu donanım kullanımı ve Kubernetes küme kaynak istatistikleri.
          </p>
        </div>

        {/* Live indicator badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
          hasError 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {hasError ? (
            <>
              <AlertTriangle size={14} className="text-rose-400 animate-pulse" />
              <span>VERİ ÇEKİLEMEDİ</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>CANLI CİHAZ BAĞLANTISI AKTİF</span>
            </>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* ========================================================
            CARD 1: CPU USAGE (CANLI/HOST VERİLERİ)
           ======================================================== */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                <Cpu size={20} className="text-cyan-400" />
                İşlemci (CPU) Yükü
              </CardTitle>
              <CardDescription>
                Cihazın anlık CPU kullanım yüzdesi
              </CardDescription>
            </div>
            {!hasError && (
              <span className="text-2xl font-mono font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-3 py-1 rounded-xl">
                {currentCpu}%
              </span>
            )}
            {hasError && (
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-1 rounded-xl flex items-center gap-1">
                <AlertTriangle size={12} />
                Veri çekilemedi
              </span>
            )}
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
              <Clock size={14} className="text-cyan-500 animate-pulse" /> Veriler 2 saniyede bir güncelleniyor
            </div>
            <div className="font-semibold text-slate-200">
              {liveMetrics ? `Cihaz: Raspberry Pi Server` : `Ortalama CPU: 42.5%`}
            </div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 2: RAM USAGE (CANLI/HOST VERİLERİ)
           ======================================================== */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                <Cpu size={20} className="text-purple-400" />
                Bellek (RAM) Tüketimi
              </CardTitle>
              <CardDescription>
                Cihazın anlık RAM kullanım yüzdesi ve durumu
              </CardDescription>
            </div>
            {!hasError && (
              <span className="text-2xl font-mono font-bold text-purple-400 bg-purple-500/5 border border-purple-500/10 px-3 py-1 rounded-xl">
                {currentRam}%
              </span>
            )}
            {hasError && (
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-1 rounded-xl flex items-center gap-1">
                <AlertTriangle size={12} />
                Veri çekilemedi
              </span>
            )}
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
              <HardDrive size={14} className="text-purple-400" /> 
              Sistem Kapasitesi: {liveMetrics ? `${liveMetrics.memTotal.toFixed(1)} GB` : `64 GB`}
            </div>
            <div className="font-semibold text-slate-200">
              Aktif Tüketim: {liveMetrics ? `${liveMetrics.memUsed.toFixed(1)} GB` : `${(64 * currentRam / 100).toFixed(1)} GB`}
            </div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 3: NETWORK I/O (CANLI/HOST TRAFİĞİ)
           ======================================================== */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row justify-between items-start pb-2">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                <Network size={20} className="text-blue-400" />
                Ağ (Network) Giriş/Çıkış Hızları & Darboğaz Uyarıları
              </CardTitle>
              <CardDescription>
                Cihaz arayüzlerindeki veri transfer oranları (Rx: Gelen, Tx: Giden)
              </CardDescription>
            </div>
            {hasError ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30">
                VERİ ÇEKİLEMEDİ
              </span>
            ) : (
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                isBottleneck 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isBottleneck ? 'AĞ YOĞUNLUĞU UYARISI' : 'AĞ BAĞLANTISI NORMAL'}
              </span>
            )}
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
                {hasError ? (
                  <div className="text-rose-400 text-center py-12">Veri çekilemedi</div>
                ) : (
                  bottleneckLogs.map((log) => (
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
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========================================================
            CARD 4: ELECTRICITY CONSUMPTION (WITH INDEPENDENT TOGGLE)
           ======================================================== */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  Sunucu Elektrik Tüketimi
                </CardTitle>
                <CardDescription>
                  Donanım elektrik yükü ve tahmini sarfiyatı (kWh)
                </CardDescription>
              </div>
              
              {/* Local Selector */}
              {!hasError && (
                <div className="flex gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <button 
                    onClick={() => setElecTimeRange('weekly')} 
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${elecTimeRange === 'weekly' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400'}`}
                  >
                    Haftalık
                  </button>
                  <button 
                    onClick={() => setElecTimeRange('monthly')} 
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${elecTimeRange === 'monthly' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400'}`}
                  >
                    Aylık
                  </button>
                </div>
              )}
              {hasError && (
                <span className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-1 rounded-xl flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Veri çekilemedi
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasError ? (
              <div className="h-56 flex items-center justify-center text-rose-400 font-medium">
                Veri çekilemedi
              </div>
            ) : (
              <ChartContainer config={electricityConfig} className="h-56">
                <AreaChart
                  accessibilityLayer
                  data={elecTimeRange === 'monthly' ? electricityMonthlyData : electricityWeeklyData}
                  margin={{
                    left: 20,
                    right: 20,
                    top: 10
                  }}
                >
                  <CartesianGrid vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    padding={{ left: 16, right: 16 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    dataKey="kwh"
                    type="natural"
                    fill="var(--color-kwh)"
                    fillOpacity={0.4}
                    stroke="var(--color-kwh)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-xs text-slate-400">
            <div className="flex w-full items-start gap-2">
              <div className="grid gap-1.5 w-full">
                <div className="flex items-center gap-2 leading-none font-medium text-slate-200">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Aktif Küme Pod Sayısı: <b>{activePodCount}</b> (Tüketim ağırlığı dinamiktir)</span>
                </div>
                <div className="text-slate-500 flex items-center gap-2 leading-none">
                  Tahmini Maliyet: <span className="text-emerald-400 font-bold font-mono">${getSum(elecTimeRange === 'monthly' ? electricityMonthlyData : electricityWeeklyData, 'cost').toFixed(4)}</span>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 5: AI TOKEN USAGE (WITH INDEPENDENT TOGGLE)
           ======================================================== */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers size={20} className="text-indigo-400" />
                  Yapay Zeka Token Harcamaları
                </CardTitle>
                <CardDescription>
                  Çözücü (Solver) modülü yapay zeka sağlayıcısı kullanım oranları
                </CardDescription>
              </div>
              {hasError && (
                <span className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-1 rounded-xl flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Veri çekilemedi
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-around items-center gap-6 pb-2">
            
            {/* Custom Pie Chart */}
            {hasError ? (
              <div className="h-48 flex items-center justify-center text-rose-400 font-medium w-full">
                Veri çekilemedi
              </div>
            ) : (
              <>
                <div className="h-[200px] w-[200px] relative flex justify-center items-center">
                  <PieChart
                    data={pieData}
                    hoveredIndex={hoveredIndex}
                    innerRadius={55}
                    onHoverChange={setHoveredIndex}
                    size={180}
                  >
                    {pieData.map((_, i) => <PieSlice index={i} key={i} />)}
                    <PieCenter defaultLabel="Total">
                      {({ value, label }) => (
                        <>
                          <span className="text-xl font-mono font-bold text-slate-200">
                            {formatTokens(value)}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                            {label}
                          </span>
                        </>
                      )}
                    </PieCenter>
                  </PieChart>
                </div>

                <Legend
                  hoveredIndex={hoveredIndex}
                  items={pieData}
                  onHoverChange={setHoveredIndex}
                >
                  <LegendItemComponent>
                    <LegendMarker />
                    <LegendLabel />
                  </LegendItemComponent>
                </Legend>
              </>
            )}

          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-xs text-slate-400">
            <div className="flex w-full items-start gap-2">
              <div className="grid gap-1.5 w-full">
                <div className="flex items-center gap-2 leading-none font-medium text-slate-200">
                  <span>Yapay Zeka Müdahale Sayısı: <b>{activeEventCount}</b></span>
                </div>
                <div className="text-slate-500 flex items-center gap-2 leading-none">
                  Toplam Yapay Zeka Gideri: <span className="text-emerald-500 font-bold font-mono">${getSum(activeAiData, 'cost').toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* ========================================================
            CARD 6: AWS PROJECTION COST (ONLY RENDER IF DETECTED)
           ======================================================== */}
        {hasAws && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={20} className="text-indigo-400" />
                    AWS EKS Projeksiyon Giderleri
                  </CardTitle>
                  <CardDescription>
                    Mevcut yerel k3s küme yüklerinizin AWS altyapısındaki tahmini karşılığı ($)
                  </CardDescription>
                </div>

                {/* Local Selector */}
                {!hasError && (
                  <div className="flex gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <button 
                      onClick={() => setAwsTimeRange('weekly')} 
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${awsTimeRange === 'weekly' ? 'bg-indigo-50/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400'}`}
                    >
                      Haftalık
                    </button>
                    <button 
                      onClick={() => setAwsTimeRange('monthly')} 
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${awsTimeRange === 'monthly' ? 'bg-indigo-50/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400'}`}
                    >
                      Aylık
                    </button>
                  </div>
                )}
                {hasError && (
                  <span className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-1 rounded-xl flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Veri çekilemedi
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={awsConfig} className="h-56">
                <BarChart
                  accessibilityLayer
                  data={awsTimeRange === 'monthly' ? awsMonthlyData : awsWeeklyData}
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
              <span>Projeksiyon Pod / Servis: <b>{activePodCount} / {activeServiceCount}</b></span>
              <span className="font-semibold text-slate-200">Toplam Bulut Eşdeğeri: <span className="text-emerald-400 font-bold font-mono">${getSum(awsTimeRange === 'monthly' ? awsMonthlyData : awsWeeklyData, 'cost').toFixed(2)}</span></span>
            </CardFooter>
          </Card>
        )}

        {/* ========================================================
            CARD 7: TERRAFORM WORKSPACE ESTIMATES (ONLY RENDER IF DETECTED)
           ======================================================== */}
        {hasTerraform && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers size={20} className="text-fuchsia-400" />
                    Terraform Workspace Dağılımı
                  </CardTitle>
                  <CardDescription>
                    Namespace dağılımlarına göre ayrıştırılmış bütçe projeksiyonu ($)
                  </CardDescription>
                </div>

                {/* Local Selector */}
                {!hasError && (
                  <div className="flex gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <button 
                      onClick={() => setTfTimeRange('weekly')} 
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${tfTimeRange === 'weekly' ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' : 'text-slate-400'}`}
                    >
                      Haftalık
                    </button>
                    <button 
                      onClick={() => setTfTimeRange('monthly')} 
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${tfTimeRange === 'monthly' ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' : 'text-slate-400'}`}
                    >
                      Aylık
                    </button>
                  </div>
                )}
                {hasError && (
                  <span className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-1 rounded-xl flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Veri çekilemedi
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-0">
              <ChartContainer
                config={tfConfig}
                className="mx-auto aspect-square max-h-[220px]"
              >
                <RadarChart data={tfTimeRange === 'monthly' ? tfMonthlyData : tfWeeklyData}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <PolarAngleAxis dataKey="workspace" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarGrid stroke="#334155" />
                  <Radar
                    name="Planlanan Altyapı Bütçesi"
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
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Kümedeki aktif namespace'ler baz alınmıştır.
              </div>
              <div className="text-slate-500 font-mono text-[10px] text-center w-full">
                Dev: ${getSum(tfTimeRange === 'monthly' ? tfMonthlyData : tfWeeklyData, 'cost') > 0 ? (tfTimeRange === 'monthly' ? tfMonthlyData[0].cost : tfWeeklyData[0].cost) : 0} | Staging: ${getSum(tfTimeRange === 'monthly' ? tfMonthlyData : tfWeeklyData, 'cost') > 0 ? (tfTimeRange === 'monthly' ? tfMonthlyData[1].cost : tfWeeklyData[1].cost) : 0} | Prod: ${getSum(tfTimeRange === 'monthly' ? tfMonthlyData : tfWeeklyData, 'cost') > 0 ? (tfTimeRange === 'monthly' ? tfMonthlyData[2].cost : tfWeeklyData[2].cost) : 0}
              </div>
            </CardFooter>
          </Card>
        )}

      </div>
    </div>
  );
}

// --- Custom clean Legend subcomponents ---
const LegendContext = React.createContext(null);

function Legend({ hoveredIndex, items, onHoverChange, children }) {
  return (
    <div className="flex-1 flex flex-col gap-2.5 w-full">
      {items.map((item, index) => {
        const isHovered = hoveredIndex === index;
        const otherHovered = hoveredIndex !== null && hoveredIndex !== index;
        return (
          <div 
            key={index} 
            onMouseEnter={() => onHoverChange(index)}
            onMouseLeave={() => onHoverChange(null)}
            className={cn(
              "p-3 bg-slate-950/70 border border-slate-900/60 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer",
              isHovered && "scale-[1.02] border-indigo-500/50 shadow-lg shadow-indigo-500/5",
              otherHovered && "opacity-40"
            )}
          >
            <LegendContext.Provider value={{ item, isHovered }}>
              {children}
            </LegendContext.Provider>
          </div>
        );
      })}
    </div>
  );
}

function LegendItemComponent({ children }) {
  return (
    <div className="flex items-center justify-between w-full">
      {children}
    </div>
  );
}

function LegendMarker() {
  const ctx = React.useContext(LegendContext);
  if (!ctx) return null;
  return (
    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ctx.item.color || ctx.item.fill }} />
  );
}

function LegendLabel() {
  const ctx = React.useContext(LegendContext);
  if (!ctx) return null;
  
  const formatTokens = (val) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(2)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return `${val}`;
  };

  return (
    <div className="flex justify-between items-center w-full pl-3">
      <span className="text-xs font-semibold text-slate-300">{ctx.item.label}</span>
      <div className="text-right">
        <span className="text-xs font-mono font-bold block text-slate-200">{formatTokens(ctx.item.value)} Token</span>
        <span className="text-[9px] font-mono text-slate-500">Maliyet: <span className="text-emerald-500 font-bold">${ctx.item.cost.toFixed(2)}</span></span>
      </div>
    </div>
  );
}
