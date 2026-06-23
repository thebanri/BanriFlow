import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Lightbulb, Terminal, Loader2, Play } from 'lucide-react';

export default function AIChatPanel({ activeIncident, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStream, setActiveStream] = useState(null); // { pod, output, isDone }
  const bottomRef = useRef(null);

  // Auto-open when a new incident is passed via click in LogTerminal
  useEffect(() => {
    if (activeIncident) {
      setIsOpen(true);
      // Reset stream if opening a new incident
      setActiveStream(null);
    }
  }, [activeIncident]);

  useEffect(() => {
    if (bottomRef.current && isOpen) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, activeStream]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSolve = async () => {
    if (!activeIncident) return;
    const { ns, pod, err } = activeIncident;
    
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
            if (data === '[SOLVED]') {
               setActiveStream(prev => ({ ...prev, isSolved: true }));
               continue;
            }
            setActiveStream(prev => ({ ...prev, output: prev.output + data + "\n" }));
          }
        }
      }
    } catch (error) {
      setActiveStream(prev => ({ ...prev, output: prev.output + `\n❌ Request failed: ${error.message}`, isDone: true }));
    }
  };

  if (!isOpen && !activeIncident) {
    return null; // Don't even show the bubble if no incident is active
  }

  return (
    <>
      {/* Floating Bubble (if closed but there is an active incident) */}
      {!isOpen && activeIncident && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[60] p-4 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/50 text-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:bg-emerald-500/30 transition-all flex items-center justify-center group animate-bounce"
        >
          <Bot size={28} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-950">
            1
          </span>
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
              <h2 className="text-lg font-bold text-slate-100">KubeSight AI</h2>
              <p className="text-xs text-emerald-400/80 font-mono tracking-wider">ACTIVE INCIDENT RESPONSE</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-black/40">
          {activeIncident ? (
            <div className="flex flex-col gap-2">
              {/* AI Message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-emerald-400" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-300 shadow-md">
                  <div className="font-mono text-[10px] text-cyan-400 mb-2 border-b border-slate-700/50 pb-1 inline-block">
                    {activeIncident.ns}/{activeIncident.pod}
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{activeIncident.err}</p>
                  
                  {!activeStream && (
                    <button 
                      onClick={handleSolve}
                      className="mt-4 flex w-full justify-center items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all active:scale-95"
                    >
                      <Play fill="currentColor" size={14} /> TESPİTİ UYGULA VE DOĞRULA
                    </button>
                  )}
                </div>
              </div>

              {/* Active Terminal Stream */}
              {activeStream && (
                <div className="flex flex-col gap-3 justify-end ml-10">
                  <div className="bg-black border border-emerald-500/30 rounded-2xl rounded-tr-sm p-4 shadow-md text-xs font-mono text-emerald-400 w-full overflow-hidden relative">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 border-b border-slate-800 pb-2">
                      <Terminal size={14} /> <span>AI Execution Terminal</span>
                      {!activeStream.isDone && <Loader2 size={12} className="animate-spin ml-auto text-emerald-500" />}
                    </div>
                    <pre className="whitespace-pre-wrap break-all leading-relaxed custom-scrollbar max-h-64 overflow-y-auto">
                      {activeStream.output}
                    </pre>
                  </div>
                  
                  {activeStream.isSolved && (
                    <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <CheckCircle size={18} /> PROBLEM SOLVED
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              Log terminalinden bir çözüm önerisi seçin.
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Chat Input placeholder */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-md flex gap-2">
          <input 
            type="text" 
            placeholder="AI Olay Merkezindesiniz..." 
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 cursor-not-allowed opacity-50"
            disabled
          />
        </div>
      </div>
    </>
  );
}
