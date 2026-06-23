import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, CircleDashed, TerminalSquare, AlertTriangle } from 'lucide-react';

export default function SolveModal({ isOpen, onClose, ns, pod, errorMsg }) {
  const [streamLogs, setStreamLogs] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting, running, done, error
  const endRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStreamLogs([]);
      setStatus('connecting');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      return;
    }

    setStatus('running');
    const encodedNs = encodeURIComponent(ns);
    const encodedPod = encodeURIComponent(pod);
    const encodedErr = encodeURIComponent(errorMsg);
    
    const url = `http://${window.location.hostname}:3005/api/solve/stream?ns=${encodedNs}&pod=${encodedPod}&err=${encodedErr}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    source.onmessage = (e) => {
      setStreamLogs(prev => [...prev, e.data]);
      if (e.data.includes('Süreç tamamlandı') || e.data.includes('Sürec tamamlandi')) {
        setStatus('done');
        source.close();
      }
    };

    source.onerror = () => {
      setStatus('error');
      setStreamLogs(prev => [...prev, '❌ Bağlantı koptu veya sunucu hatası.']);
      source.close();
    };

    return () => {
      source.close();
    };
  }, [isOpen, ns, pod, errorMsg]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLogs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/30 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'running' ? 'bg-amber-500/20 text-amber-400' : status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {status === 'running' && <CircleDashed className="animate-spin" size={20} />}
              {status === 'done' && <CheckCircle size={20} />}
              {status === 'error' && <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">AI Auto-Fix İşlemi</h3>
              <p className="text-xs text-slate-400">Pod: {pod}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Terminal Area */}
        <div className="p-6 h-96 bg-black flex flex-col font-mono text-sm overflow-hidden">
          <div className="flex items-center gap-2 text-emerald-500 mb-4 pb-2 border-b border-slate-800">
            <TerminalSquare size={16} />
            <span>KubeSight AI Çözüm Terminali</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {streamLogs.map((log, i) => (
              <div key={i} className="text-slate-300 leading-relaxed break-all">
                {log.startsWith('✅') && <span className="text-emerald-400">{log}</span>}
                {log.startsWith('❌') && <span className="text-red-400">{log}</span>}
                {log.startsWith('⚠️') && <span className="text-amber-400">{log}</span>}
                {log.startsWith('⚙️') && <span className="text-cyan-400 font-semibold">{log}</span>}
                {!log.match(/^[✅❌⚠️⚙️]/) && log}
              </div>
            ))}
            {status === 'running' && (
              <div className="text-slate-500 animate-pulse">_</div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
