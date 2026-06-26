import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function Stats() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
          <BarChart2 size={32} className="text-cyan-400" />
          System Resources & FinOps
        </h1>
        <p className="text-slate-400 mt-2">Monitor cluster resource usage and AWS cost estimation.</p>
      </div>

      <div className="p-6 border border-slate-700/50 bg-slate-900/50 rounded-2xl max-w-4xl glass">
        <p className="text-sm text-slate-400 mb-6">AWS Cost estimation and historical usage will be displayed here.</p>
        <div className="flex gap-2 mb-6">
          {['1M', '3M', '6M', '1Y'].map(t => (
            <button key={t} className="px-6 py-2 rounded-lg bg-slate-800 text-sm font-bold text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">
              {t}
            </button>
          ))}
        </div>
        <div className="h-64 bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700/50 text-slate-500">
          [ Recharts LineChart Placeholder ]
        </div>
      </div>
    </div>
  );
}
