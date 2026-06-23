import React from 'react';
import { X, Activity, Cpu, HardDrive, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Sidebar({ node, onClose }) {
  if (!node) return null;

  const isError = node.status === 'error';

  return (
    <div className="w-96 glass rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="p-5 border-b border-slate-700/50 flex justify-between items-start bg-slate-900/50">
        <div>
          <h2 className="text-lg font-bold text-slate-100 break-all leading-tight">{node.name}</h2>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-cyan-400 inline-block mt-2 tracking-wide uppercase">
            {node.group}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 bg-slate-800/50 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="p-5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
              <Activity size={14} /> Status
            </div>
            <div className={`text-sm font-bold ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
              {isError ? 'CRITICAL' : 'HEALTHY'}
            </div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
            <div className="text-slate-400 text-xs font-medium mb-1">Restarts</div>
            <div className="text-sm font-bold text-slate-200">{node.restarts || 0}</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
              <Cpu size={14} /> CPU Req
            </div>
            <div className="text-sm font-bold text-slate-200">{node.cpu || 'N/A'}</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
              <HardDrive size={14} /> Mem Req
            </div>
            <div className="text-sm font-bold text-slate-200">{node.memory || 'N/A'}</div>
          </div>
        </div>

        {/* AI Insight Box */}
        <div className={`p-4 rounded-xl border relative overflow-hidden ${isError ? 'bg-red-500/10 border-red-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-600" style={{ opacity: isError ? 0 : 1 }}></div>
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-orange-600" style={{ opacity: isError ? 1 : 0 }}></div>
          
          <div className="flex items-center gap-2 mb-3">
            {isError ? <AlertTriangle className="text-red-400" size={18} /> : <ShieldCheck className="text-cyan-400" size={18} />}
            <h3 className={`font-bold text-sm ${isError ? 'text-red-400' : 'text-cyan-400'}`}>AI Güvenlik & Stabilite</h3>
          </div>
          
          <p className="text-sm text-slate-300 leading-relaxed">
            {isError 
              ? (node.restarts > 0 ? `Dikkat! Bu container ${node.restarts} kez yeniden başlatıldı. ${node.details} Hatanın tam nedeni için Terminal'den logları incele veya AI'a çözdür.` : `Container stabil değil veya hazır duruma (Ready) geçemedi. ${node.details}`)
              : "Kritik bir stabilite sorunu tespit edilmedi. Sistem sağlıklı çalışıyor."}
          </p>
        </div>
      </div>
    </div>
  );
}
