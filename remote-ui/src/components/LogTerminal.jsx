import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare, Lightbulb, Bot } from 'lucide-react';

export default function LogTerminal({ logs, onSolve }) {
  const [height, setHeight] = useState(192); // Default tailwind h-48 = 192px
  const isDragging = useRef(false);
  const logContainerRef = useRef(null);
  const logEndRef = useRef(null);

  // Auto-scroll to bottom only if user is already near the bottom
  useEffect(() => {
    if (logContainerRef.current) {
      const container = logContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      
      if (isNearBottom && logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [logs]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newHeight = window.innerHeight - e.clientY - 24;
      if (newHeight > 100 && newHeight < window.innerHeight - 100) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <div 
        className="glass rounded-xl border border-slate-700/50 flex flex-col relative bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden transition-[height] duration-75"
        style={{ height: `${height}px` }}
      >
        {/* Resizer Handle */}
        <div 
          className="w-full h-3 absolute top-0 left-0 cursor-ns-resize z-50 hover:bg-cyan-500/30 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
          }}
        />

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50 mt-2">
          <TerminalSquare size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300 tracking-wider">LIVE EVENT LOGS</span>
          <span className="ml-2 text-[10px] text-slate-500 hidden sm:inline">(Boyutlandırmak için üst kenardan sürükle)</span>
          <div className="ml-auto flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
          </div>
        </div>

        {/* Log Content */}
        <div 
          ref={logContainerRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 bg-black/60 custom-scrollbar"
        >
          {logs.map((log) => {
            const isWarning = log.text.includes('[Warning]');
            const isError = log.text.includes('[Error]');
            const isAI = log.text.includes('[AI-Ops]');

            return (
              <div key={log.id} className={`font-mono text-sm flex flex-col sm:flex-row sm:items-start gap-2 group p-1.5 rounded-lg transition-colors ${isAI ? 'bg-emerald-500/5 border border-emerald-500/20 shadow-sm my-1' : 'hover:bg-slate-800/30'}`}>
                <div className="flex flex-1 gap-3">
                  <span className="text-slate-500 select-none flex-shrink-0 mt-0.5">[{log.time}]</span>
                  <span className={`
                    flex-1 break-all
                    ${isWarning ? 'text-yellow-400' : ''}
                    ${isError ? 'text-red-400 font-bold' : ''}
                    ${isAI ? 'text-emerald-400/90 leading-relaxed' : 'text-slate-300'}
                  `}>
                    {isAI ? <Bot size={14} className="inline mr-1.5 mb-0.5 text-emerald-500" /> : null}
                    {log.text}
                  </span>
                </div>

                {isAI && (
                  <button 
                    onClick={() => {
                      const match = log.text.match(/\(([^/]+)\/([^)]+)\): (.*)/);
                      if (match && onSolve) {
                        onSolve(match[1], match[2], match[3]);
                      }
                    }}
                    className="self-end sm:self-start flex-shrink-0 opacity-80 hover:opacity-100 transition-all bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-bold border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
                  >
                    <Lightbulb size={14} /> ÇÖZÜMÜ UYGULA
                  </button>
                )}
              </div>
            );
          })}
          {logs.length === 0 && <span className="text-slate-600 italic">Hiçbir olay kaydedilmedi...</span>}
          <div ref={logEndRef} />
        </div>
      </div>
    </>
  );
}
