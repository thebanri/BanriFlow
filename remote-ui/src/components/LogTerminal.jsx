import React from 'react';
import { TerminalSquare } from 'lucide-react';

export default function LogTerminal({ logs }) {
  return (
    <div className="glass rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-48 max-h-[30vh]">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border-b border-slate-700/50">
        <TerminalSquare size={16} className="text-cyan-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider">LIVE EVENT LOGS</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 bg-black/40">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3">
            <span className="text-slate-500 shrink-0">{log.time}</span>
            <span className={log.text.includes('ERROR') ? 'text-red-400' : 'text-slate-300'}>{log.text}</span>
          </div>
        ))}
        {logs.length === 0 && <span className="text-slate-600 italic">No events recorded yet...</span>}
      </div>
    </div>
  );
}
