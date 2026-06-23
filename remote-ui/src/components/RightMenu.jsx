import React, { useState } from 'react';
import { X, Flame, Settings, BarChart2, PlusSquare } from 'lucide-react';

export default function RightMenu({ isOpen, onClose, selectedNode }) {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className={`absolute top-0 right-0 h-full w-96 glass border-l border-slate-700/50 transform transition-transform duration-500 z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-900/50">
        <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Operations</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex gap-2 p-4 border-b border-slate-700/50 overflow-x-auto">
        <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}>
          <BarChart2 size={16} /> Stats Graphic
        </button>
        <button onClick={() => setActiveTab('stress')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'stress' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-slate-800'}`}>
          <Flame size={16} /> Stress Test
        </button>
        <button onClick={() => setActiveTab('create')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'create' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}>
          <PlusSquare size={16} /> Create
        </button>
        <button onClick={() => setActiveTab('config')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'config' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800'}`}>
          <Settings size={16} /> Config
        </button>
      </div>

      <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-200">System Resources & FinOps</h3>
            <div className="p-4 border border-slate-700/50 bg-slate-900/50 rounded-xl">
              <p className="text-sm text-slate-400 mb-4">AWS Cost estimation will be displayed here.</p>
              <div className="flex gap-2 mb-4">
                {['1M', '3M', '6M', '1Y'].map(t => (
                  <button key={t} className="flex-1 py-1 rounded bg-slate-800 text-xs font-medium text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">{t}</button>
                ))}
              </div>
              <div className="h-32 bg-slate-800/50 rounded flex items-center justify-center border border-slate-700/50 text-slate-500 text-sm">
                [ Recharts LineChart Placeholder ]
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stress' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-200">Load Injection</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Select a node from the 3D topology to inject CPU or Memory stress tests, and let AI analyze the scaling behavior.</p>
            {selectedNode ? (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <p className="text-orange-400 font-bold mb-2">Target: {selectedNode.name}</p>
                <button className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg font-bold text-white shadow-lg hover:shadow-orange-500/25 transition-shadow">
                  Launch Stress Test
                </button>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
                No target selected. Click a node in the graph.
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-200">AI Resource Generator</h3>
            <textarea 
              className="w-full h-32 bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none" 
              placeholder="e.g. Create a highly available Nginx deployment with 3 replicas and a LoadBalancer service."
            ></textarea>
            <button className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-bold text-white shadow-lg hover:shadow-emerald-500/25 transition-shadow">
              Generate YAML with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
