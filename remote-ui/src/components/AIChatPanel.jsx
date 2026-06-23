import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Lightbulb, CheckCircle, Terminal, Loader2 } from 'lucide-react';

export default function AIChatPanel({ logs }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStream, setActiveStream] = useState(null); // { pod, output, isDone }
  const bottomRef = useRef(null);

  const aiLogsMap = new Map();
  logs.filter(l => l.text.includes('[AI-Ops]')).forEach(l => {
    aiLogsMap.set(l.text, l); 
  });
  const aiLogs = Array.from(aiLogsMap.values());

  useEffect(() => {
    if (bottomRef.current && isOpen) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, activeStream]);

  const handleSolve = async (ns, pod, err) => {
    setActiveStream({ pod, output: "Starting automated resolution...\n", isDone: false });
    
    try {
      const response = await fetch(`http://${window.location.hostname}:3005/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace: ns, pod: pod, err_msg: err })
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setActiveStream(prev => ({ ...prev, isDone: true }));
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
            if (data === '[DONE]') {
               setActiveStream(prev => ({ ...prev, isDone: true }));
               break;
            }
            setActiveStream(prev => ({ ...prev, output: prev.output + data + "\n" }));
          }
        }
      }
    } catch (error) {
      setActiveStream(prev => ({ ...prev, output: prev.output + `\n❌ Request failed: ${error.message}`, isDone: true }));
    }
  };

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[60] p-4 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/50 text-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:bg-emerald-500/30 transition-all flex items-center justify-center group"
        >
          <Bot size={28} className="group-hover:scale-110 transition-transform" />
          {aiLogs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-950">
              {aiLogs.length}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] glass border-l border-slate-700/50 shadow-2xl flex flex-col transform transition-transform duration-500 z-[60] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">AI Ops Chat</h2>
              <p className="text-xs text-emerald-400/80 font-mono tracking-wider">AUTOMATED INCIDENT RESPONSE</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-black/40">
          {aiLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
              <CheckCircle size={48} className="text-emerald-500/30" />
              <p className="text-sm font-medium">Sistemde AI Olayı Bulunmuyor</p>
            </div>
          ) : (
            aiLogs.map((log, idx) => {
              const match = log.text.match(/\(([^/]+)\/([^)]+)\): (.*)/);
              if (!match) return null;
              const ns = match[1];
              const pod = match[2];
              const err = match[3];
              const isActive = activeStream && activeStream.pod === pod;

              return (
                <div key={idx} className="flex flex-col gap-2">
                  {/* AI Message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-emerald-400" />
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-300 shadow-md">
                      <div className="font-mono text-[10px] text-cyan-400 mb-2 border-b border-slate-700/50 pb-1 inline-block">
                        {ns}/{pod}
                      </div>
                      <p className="leading-relaxed">{err}</p>
                      
                      {!isActive && (
                        <button 
                          onClick={() => handleSolve(ns, pod, err)}
                          className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors w-max"
                        >
                          <Lightbulb size={14} /> Çözümü Uygula
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Terminal Stream */}
                  {isActive && (
                    <div className="flex gap-3 justify-end ml-10">
                      <div className="bg-black border border-emerald-500/30 rounded-2xl rounded-tr-sm p-4 shadow-md text-xs font-mono text-emerald-400 w-full overflow-hidden relative">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 border-b border-slate-800 pb-2">
                          <Terminal size={14} /> <span>AI Action Terminal</span>
                          {!activeStream.isDone && <Loader2 size={12} className="animate-spin ml-auto text-emerald-500" />}
                        </div>
                        <pre className="whitespace-pre-wrap break-all leading-relaxed custom-scrollbar max-h-64 overflow-y-auto">
                          {activeStream.output}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Chat Input placeholder */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-md flex gap-2">
          <input 
            type="text" 
            placeholder="Yapay Zeka izlemede... Tespit edilen olayları yönetir." 
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 cursor-not-allowed opacity-50"
            disabled
          />
        </div>
      </div>
    </>
  );
}
