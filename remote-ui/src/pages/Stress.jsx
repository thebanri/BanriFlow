import React from 'react';
import { Flame } from 'lucide-react';

export default function Stress() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent flex items-center gap-3">
          <Flame size={32} className="text-orange-400" />
          Load Injection & Stress Testing
        </h1>
        <p className="text-slate-400 mt-2">Inject CPU or Memory stress tests into your pods and let AI analyze the scaling behavior.</p>
      </div>

      <div className="p-6 border border-slate-700/50 bg-slate-900/50 rounded-2xl max-w-4xl glass">
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 bg-orange-500/10 border border-orange-500/30 rounded-xl flex flex-col items-center justify-center text-center">
            <h3 className="text-orange-400 font-bold text-lg mb-2">CPU Stress</h3>
            <p className="text-sm text-slate-400 mb-6">Simulate high CPU load to test HPA (Horizontal Pod Autoscaler) rules.</p>
            <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg font-bold text-white shadow-lg hover:shadow-orange-500/25 transition-all">
              Launch CPU Stress
            </button>
          </div>
          
          <div className="p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl flex flex-col items-center justify-center text-center">
            <h3 className="text-purple-400 font-bold text-lg mb-2">Memory Leak</h3>
            <p className="text-sm text-slate-400 mb-6">Simulate memory leaks to test OOMKilled events and AI recovery.</p>
            <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-lg font-bold text-white shadow-lg hover:shadow-purple-500/25 transition-all">
              Launch Memory Stress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
