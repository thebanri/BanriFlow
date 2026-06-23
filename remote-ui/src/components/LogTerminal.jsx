import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare } from 'lucide-react';

export default function LogTerminal({ logs }) {
  const [height, setHeight] = useState(192); // Default tailwind h-48 = 192px
  const isDragging = useRef(false);
  const logEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      // Calculate height upwards from the bottom of the window
      // Assumes bottom spacing is about 24px (bottom-6)
      const newHeight = window.innerHeight - e.clientY - 24;
      if (newHeight > 100 && newHeight < window.innerHeight - 100) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto'; // Re-enable text selection
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
    <div 
      className="glass rounded-xl border border-slate-700/50 flex flex-col relative bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden transition-[height] duration-75"
      style={{ height: `${height}px` }}
    >
      {/* Resizer Handle (Top Edge) */}
      <div 
        className="w-full h-3 absolute top-0 left-0 cursor-ns-resize z-50 hover:bg-cyan-500/30 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent text selection while dragging
          isDragging.current = true;
          document.body.style.cursor = 'ns-resize';
          document.body.style.userSelect = 'none'; // Disable text selection while dragging
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
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 bg-black/60 custom-scrollbar">
        {logs.map((log) => {
          let textClass = 'text-slate-300';
          if (log.text.includes('Warning') || log.text.includes('WARN')) textClass = 'text-yellow-400';
          if (log.text.includes('Error') || log.text.includes('ERROR')) textClass = 'text-red-400';
          
          return (
            <div key={log.id} className="flex gap-3 leading-relaxed hover:bg-white/5 p-0.5 rounded">
              <span className="text-cyan-500/70 shrink-0 select-none">[{log.time}]</span>
              <span className={`${textClass} break-all`}>{log.text}</span>
            </div>
          );
        })}
        {logs.length === 0 && <span className="text-slate-600 italic">Hiçbir olay kaydedilmedi...</span>}
        <div ref={logEndRef} /> {/* Auto-scroll target */}
      </div>
    </div>
  );
}
