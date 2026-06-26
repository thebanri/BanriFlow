import React from 'react';
import { PlusSquare, Sparkles } from 'lucide-react';

export default function Create() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-3">
          <PlusSquare size={32} className="text-emerald-400" />
          AI Resource Generator
        </h1>
        <p className="text-slate-400 mt-2">Describe what you want to deploy, and AI will generate and apply the Kubernetes YAML.</p>
      </div>

      <div className="p-6 border border-slate-700/50 bg-slate-900/50 rounded-2xl max-w-4xl glass">
        <div className="flex flex-col space-y-4">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" /> What do you want to build?
          </label>
          <textarea 
            className="w-full h-40 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none text-lg" 
            placeholder="e.g. Create a highly available Nginx deployment with 3 replicas, connected to a LoadBalancer service."
          ></textarea>
          
          <div className="flex justify-end pt-4">
            <button className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all">
              Generate & Deploy with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
