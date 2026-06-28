import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
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

  // --- Real-time Systems Data State ---
  const [cpuHistory, setCpuHistory] = useState(() => generateInitialHistory(15));
  const [ramHistory, setRamHistory] = useState(() => generateInitialHistory(15));
  const [networkHistory, setNetworkHistory] = useState(() => generateInitialNetworkHistory(15));
  
  // Current values derived from state
  const currentCpu = cpuHistory[cpuHistory.length - 1]?.value || 0;
  const currentRam = ramHistory[ramHistory.length - 1]?.value || 0;
  const currentRx = networkHistory[networkHistory.length - 1]?.rx || 0;
  const currentTx = networkHistory[networkHistory.length - 1]?.tx || 0;

  // Live Cluster Data & Log Counts from Go API
  const [clusterTopology, setClusterTopology] = useState({ pods: [], services: [] });
  const [eventCount, setEventCount] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState(null);
  
  const liveMetricsRef = useRef(null);
  useEffect(() => {
    liveMetricsRef.current = liveMetrics;
  }, [liveMetrics]);

  // Network logs state
  const [bottleneckLogs, setBottleneckLogs] = useState([
    { id: 1, time: 'Init', type: 'Sistem Başlatıldı', desc: 'Canlı donanım ve ağ dinleyicileri aktif.', severity: 'warning' },
  ]);

  // --- Fetch Topology & Logs from Backend ---
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

    const fetchLogs = () => {
      const url = `http://${window.location.hostname}:3005/api/logs/history`;
      axios.get(url)
        .then(res => {
          if (res.data && Array.isArray(res.data)) {
            setEventCount(res.data.length);
          }
        })
        .catch(err => console.warn("Log history API not reachable. Using fallback values.", err));
    };

    fetchTopology();
    fetchLogs();
    const interval = setInterval(() => {
      fetchTopology();
      fetchLogs();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // --- Fetch Live Host OS Metrics (CPU/RAM/Net) from Go Backend ---
  useEffect(() => {
    const fetchSystemMetrics = () => {
      const url = `http://${window.location.hostname}:3005/api/system/metrics`;
      axios.get(url)
        .then(res => {
          if (res.data) {
            setLiveMetrics(res.data);
          }
        })
        .catch(err => {
          setLiveMetrics(null); 
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
        setCpuHistory(prev => [...prev.slice(1), { time: timeNow, value: Math.round(currentLive.cpuPercent) }]);
        setRamHistory(prev => [...prev.slice(1), { time: timeNow, value: Math.round(currentLive.memPercent) }]);
        
        const rxMbps = Math.round(currentLive.netRxMBps * 8 * 10) / 10;
        const txMbps = Math.round(currentLive.netTxMBps * 8 * 10) / 10;
        setNetworkHistory(prev => [...prev.slice(1), { time: timeNow, rx: rxMbps, tx: txMbps }]);

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
        // FALLBACK TO SIMULATOR (If Go Server / API is offline during local dev)
        const hasErrorPod = clusterTopology.pods.some(p => p.status === 'error');
        const podCount = clusterTopology.pods.length || 5;

        setCpuHistory(prev => {
          const lastVal = prev[prev.length - 1]?.value || 30;
          const baseline = Math.min(20 + podCount * 4 + (hasErrorPod ? 25 : 0), 90);
          const drift = Math.floor(Math.random() * 11) - 5; 
          let newVal = Math.min(Math.max(baseline + drift, 10), 98);
          return [...prev.slice(1), { time: timeNow, value: newVal }];
        });

        setRamHistory(prev => {
          const lastVal = prev[prev.length - 1]?.value || 55;
          const baseline = Math.min(35 + podCount * 4, 85);
          const drift = Math.floor(Math.random() * 5) - 2;
          let newVal = Math.min(Math.max(baseline + drift, 30), 95);
          return [...prev.slice(1), { time: timeNow, value: newVal }];
        });

        setNetworkHistory(prev => {
          const lastRx = prev[prev.length - 1]?.rx || 30;
          const lastTx = prev[prev.length - 1]?.tx || 25;
          
          const isBurst = Math.random() > 0.90;
          const rxDrift = isBurst ? Math.floor(Math.random() * 40) + 30 : Math.floor(Math.random() * 10) - 5;
          const txDrift = isBurst ? Math.floor(Math.random() * 30) + 20 : Math.floor(Math.random() * 8) - 4;

          let newRx = Math.min(Math.max(lastRx + rxDrift, 15), 140);
          let newTx = Math.min(Math.max(lastTx + txDrift, 10), 100);

          if (newRx + newTx > 130) {
            setBottleneckLogs(old => {
              const exists = old.some(log => log.time === timeNow);
              if (exists) return old;
              const newLog = {
                id: Date.now(),
                time: timeNow,
                type: 'Ağ Tıkanıklığı (Simüle)',
                desc: `Trafik ${newRx + newTx} Mbps seviyesine ulaştı (Rx: ${newRx} / Tx: ${newTx})`,
                severity: 'warning'
              };
              return [newLog, ...old.slice(0, 4)];
            });
          }

          return [...prev.slice(1), { time: timeNow, rx: newRx, tx: newTx }];
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [clusterTopology.pods]);

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

  // --- Dynamic calculations based on live pod & event counts ---
  const activePodCount = clusterTopology.pods.length || 4;
  const activeServiceCount = clusterTopology.services.length || 3;
  const activeEventCount = eventCount || 8;

  // 1. Electricity Usage Data (real Raspberry Pi scale: ~5W average per Pi, so ~0.12 kWh per day per node)
  const electricityWeeklyData = useMemo(() => {
    const nodeCount = Math.max(1, Math.ceil(activePodCount / 8));
    const cpuFactor = 0.8 + (currentCpu / 100) * 0.4; 
    const dailyBase = 0.12 * nodeCount * cpuFactor; 

    return [
      { name: 'Pzt', kwh: parseFloat((dailyBase * 0.95).toFixed(3)), cost: parseFloat((dailyBase * 0.95 * 0.15).toFixed(4)) },
      { name: 'Sal', kwh: parseFloat((dailyBase * 1.05).toFixed(3)), cost: parseFloat((dailyBase * 1.05 * 0.15).toFixed(4)) },
      { name: 'Çar', kwh: parseFloat((dailyBase * 1.10).toFixed(3)), cost: parseFloat((dailyBase * 1.10 * 0.15).toFixed(4)) },
      { name: 'Per', kwh: parseFloat((dailyBase * 1.00).toFixed(3)), cost: parseFloat((dailyBase * 1.00 * 0.15).toFixed(4)) },
      { name: 'Cum', kwh: parseFloat((dailyBase * 1.20).toFixed(3)), cost: parseFloat((dailyBase * 1.20 * 0.15).toFixed(4)) },
      { name: 'Cmt', kwh: parseFloat((dailyBase * 0.85).toFixed(3)), cost: parseFloat((dailyBase * 0.85 * 0.15).toFixed(4)) },
      { name: 'Paz', kwh: parseFloat((dailyBase * 0.80).toFixed(3)), cost: parseFloat((dailyBase * 0.80 * 0.15).toFixed(4)) },
    ];
  }, [activePodCount, currentCpu]);

  const electricityMonthlyData = useMemo(() => {
    const nodeCount = Math.max(1, Math.ceil(activePodCount / 8));
    const monthlyBase = 3.6 * nodeCount; 

    return [
      { name: 'Oca', kwh: parseFloat((monthlyBase * 0.96).toFixed(2)), cost: parseFloat((monthlyBase * 0.96 * 0.15).toFixed(3)) },
      { name: 'Şub', kwh: parseFloat((monthlyBase * 0.92).toFixed(2)), cost: parseFloat((monthlyBase * 0.92 * 0.15).toFixed(3)) },
      { name: 'Mar', kwh: parseFloat((monthlyBase * 1.02).toFixed(2)), cost: parseFloat((monthlyBase * 1.02 * 0.15).toFixed(3)) },
      { name: 'Nis', kwh: parseFloat((monthlyBase * 0.98).toFixed(2)), cost: parseFloat((monthlyBase * 0.98 * 0.15).toFixed(3)) },
      { name: 'May', kwh: parseFloat((monthlyBase * 1.05).toFixed(2)), cost: parseFloat((monthlyBase * 1.05 * 0.15).toFixed(3)) },
      { name: 'Haz', kwh: parseFloat((monthlyBase * 1.12).toFixed(2)), cost: parseFloat((monthlyBase * 1.12 * 0.15).toFixed(3)) },
    ];
  }, [activePodCount]);

  // 2. AI Token Usage (scales with error log events processed by Solver)
  // For a single solver run, it uses ~10k-20k tokens. So we scale as Thousands/Millions.
  const tokenFactor = 0.5 + (activeEventCount * 0.15); 

  const aiWeeklyData = useMemo(() => {
    return [
      { name: 'OpenAI', value: parseFloat((0.085 * tokenFactor).toFixed(3)), cost: 0.085 * tokenFactor * 5.0, fill: aiConfig.openai.color },
      { name: 'Gemini', value: parseFloat((0.240 * tokenFactor).toFixed(3)), cost: 0.240 * tokenFactor * 0.15, fill: aiConfig.gemini.color },
      { name: 'Claude', value: parseFloat((0.035 * tokenFactor).toFixed(3)), cost: 0.035 * tokenFactor * 15.0, fill: aiConfig.claude.color },
      { name: 'Groq', value: parseFloat((0.450 * tokenFactor).toFixed(3)), cost: 0.450 * tokenFactor * 0.10, fill: aiConfig.groq.color }
    ];
  }, [tokenFactor]);

  const aiMonthlyData = useMemo(() => {
    return [
      { name: 'OpenAI', value: parseFloat((0.360 * tokenFactor).toFixed(3)), cost: 0.360 * tokenFactor * 5.0, fill: aiConfig.openai.color },
      { name: 'Gemini', value: parseFloat((0.980 * tokenFactor).toFixed(3)), cost: 0.980 * tokenFactor * 0.15, fill: aiConfig.gemini.color },
      { name: 'Claude', value: parseFloat((0.140 * tokenFactor).toFixed(3)), cost: 0.140 * tokenFactor * 15.0, fill: aiConfig.claude.color },
      { name: 'Groq', value: parseFloat((1.850 * tokenFactor).toFixed(3)), cost: 1.850 * tokenFactor * 0.10, fill: aiConfig.groq.color }
    ];
  }, [tokenFactor]);

  // Helper formatting function for tokens (displays K or M dynamically)
  const formatTokens = (val) => {
    if (val >= 1.0) {
      return `${val.toFixed(2)}M`;
    }
    return `${(val * 1000).toFixed(0)}K`;
  };

  // 3. AWS Cost Projection (What this K8s cluster would cost on AWS EKS)
  const awsWeeklyData = useMemo(() => {
    const nodeCount = Math.ceil(activePodCount / 4) || 1;
    return [
      { name: 'EC2 Node', cost: nodeCount * 32.50 },
      { name: 'EKS Control', cost: 23.50 }, 
      { name: 'RDS Instance', cost: activeServiceCount * 14.20 },
      { name: 'S3 Storage', cost: 8.50 },
      { name: 'Network I/O', cost: activePodCount * 3.40 },
    ];
  }, [activePodCount, activeServiceCount]);

  const awsMonthlyData = useMemo(() => {
    const nodeCount = Math.ceil(activePodCount / 4) || 1;
    return [
      { name: 'EC2 Node', cost: nodeCount * 130.00 },
      { name: 'EKS Control', cost: 74.00 },
      { name: 'RDS Instance', cost: activeServiceCount * 56.80 },
      { name: 'S3 Storage', cost: 34.00 },
      { name: 'Network I/O', cost: activePodCount * 13.60 },
    ];
  }, [activePodCount, activeServiceCount]);

  // 4. Terraform Workspace Budget Allocation (split based on K8s namespaces)
  const tfWeeklyData = useMemo(() => {
    const pods = clusterTopology.pods;
    const devPods = pods.filter(p => p.namespace === 'default' || p.namespace === 'dev').length || 2;
    const stagingPods = pods.filter(p => p.namespace === 'staging').length || 1;
    const systemPods = pods.filter(p => p.namespace && p.namespace.includes('system')).length || 2;
    const total = devPods + stagingPods + systemPods;
    const multiplier = 80 / (total || 1);

    return [
      { workspace: 'Geliştirme (Dev)', cost: Math.round(devPods * multiplier) },
      { workspace: 'Sahneleme (Staging)', cost: Math.round(stagingPods * multiplier * 1.4) },
      { workspace: 'Sistem (Prod)', cost: Math.round(systemPods * multiplier * 2.8) }
    ];
  }, [clusterTopology.pods]);

  const tfMonthlyData = useMemo(() => {
    const pods = clusterTopology.pods;
    const devPods = pods.filter(p => p.namespace === 'default' || p.namespace === 'dev').length || 2;
    const stagingPods = pods.filter(p => p.namespace === 'staging').length || 1;
    const systemPods = pods.filter(p => p.namespace && p.namespace.includes('system')).length || 2;
    const total = devPods + stagingPods + systemPods;
    const multiplier = 320 / (total || 1);

    return [
      { workspace: 'Geliştirme (Dev)', cost: Math.round(devPods * multiplier) },
      { workspace: 'Sahneleme (Staging)', cost: Math.round(stagingPods * multiplier * 1.4) },
      { workspace: 'Sistem (Prod)', cost: Math.round(systemPods * multiplier * 2.8) }
    ];
  }, [clusterTopology.pods]);

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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{liveMetrics ? "CANLI CİHAZ BAĞLANTISI AKTİF" : "SİMÜLASYON VERİ AKIŞI"}</span>
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
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
              isBottleneck 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isBottleneck ? 'AĞ YOĞUNLUĞU UYARISI' : 'AĞ BAĞLANTISI NORMAL'}
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
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={electricityConfig} className="h-56">
              <BarChart
                accessibilityLayer
                data={elecTimeRange === 'monthly' ? electricityMonthlyData : electricityWeeklyData}
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
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Aktif Küme Pod Sayısı: {activePodCount} (Tüketim ağırlığı dinamiktir)
            </div>
            <div className="text-slate-500">
              Tahmini Maliyet: <span className="text-emerald-400 font-bold font-mono">${getSum(elecTimeRange === 'monthly' ? electricityMonthlyData : electricityWeeklyData, 'cost').toFixed(3)}</span>
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

              {/* Local Selector */}
              <div className="flex gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                <button 
                  onClick={() => setAiTimeRange('weekly')} 
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${aiTimeRange === 'weekly' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400'}`}
                >
                  Haftalık
                </button>
                <button 
                  onClick={() => setAiTimeRange('monthly')} 
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${aiTimeRange === 'monthly' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400'}`}
                >
                  Aylık
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-around items-center gap-6 pb-2">
            
            {/* Donut Chart */}
            <div className="h-48 w-48 relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aiTimeRange === 'monthly' ? aiMonthlyData : aiWeeklyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(aiTimeRange === 'monthly' ? aiMonthlyData : aiWeeklyData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Toplam</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {formatTokens(getSum(aiTimeRange === 'monthly' ? aiMonthlyData : aiWeeklyData, 'value'))}
                </span>
              </div>
            </div>

            {/* Detail stats legend table */}
            <div className="flex-1 flex flex-col gap-2.5 w-full">
              {(aiTimeRange === 'monthly' ? aiMonthlyData : aiWeeklyData).map((prov, i) => (
                <div key={i} className="p-3 bg-slate-950/70 border border-slate-900/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prov.fill }}></div>
                    <span className="text-xs font-semibold text-slate-300">{prov.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold block text-slate-200">{formatTokens(prov.value)} Token</span>
                    <span className="text-[9px] font-mono text-slate-500">Maliyet: <span className="text-emerald-500 font-bold">${prov.cost.toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
          <CardFooter className="text-xs text-slate-400 justify-between">
            <span>Çözülen Olay Kaydı Sayısı: <b>{activeEventCount}</b></span>
            <span className="text-emerald-500 font-bold font-mono">Toplam Yapay Zeka Gideri: ${getSum(aiTimeRange === 'monthly' ? aiMonthlyData : aiWeeklyData, 'cost').toFixed(2)}</span>
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
