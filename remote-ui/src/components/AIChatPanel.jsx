import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Terminal, Loader2, Play, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';

export default function AIChatPanel({ activeIncident, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('banriflow_ai_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Mark any interrupted streams as done so UI doesn't get stuck loading
        return parsed.map(m => (m.type === 'stream' && !m.isDone) ? { ...m, isDone: true, output: m.output + '\n⚠️ [Sayfa yenilendiği için işlem koptu]' } : m);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('banriflow_ai_chat', JSON.stringify(messages));
  }, [messages]);

  // Auto-open when a new incident is passed via click
  useEffect(() => {
    if (activeIncident) {
      setIsOpen(true);
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.type === 'incident' && lastMsg.data.err === activeIncident.err) {
          return prev;
        }
        return [...prev, { type: 'incident', id: Date.now(), data: activeIncident }];
      });
    }
  }, [activeIncident]);

  useEffect(() => {
    if (bottomRef.current && isOpen) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem('banriflow_ai_chat');
  };

  const handleSolve = (incidentData, customInput = '') => {
    const { ns, pod, err } = incidentData;
    
    if (customInput) {
      setMessages(prev => [...prev, { type: 'user', id: Date.now(), text: customInput }]);
    }
    
    const newStreamId = Date.now() + 1;
    setMessages(prev => [...prev, { type: 'stream', id: newStreamId, pod, output: "Otomatik çözüm başlatılıyor...\n", isDone: false, isSolved: false }]);
    
    const url = `http://${window.location.hostname}:3005/api/solve/stream?ns=${ns}&pod=${pod}&err=${encodeURIComponent(err)}&userInput=${encodeURIComponent(customInput)}`;
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (e) => {
      const data = e.data;
      if (data === '[DONE]') {
        setMessages(prev => prev.map(m => m.id === newStreamId ? { ...m, isDone: true } : m));
        eventSource.close();
        return;
      }
      if (data === '[SOLVED]') {
        setMessages(prev => prev.map(m => m.id === newStreamId ? { ...m, isSolved: true } : m));
        return;
      }
      setMessages(prev => prev.map(m => m.id === newStreamId ? { ...m, output: m.output + data + "\n" } : m));
    };

    eventSource.onerror = () => {
      setMessages(prev => prev.map(m => m.id === newStreamId ? { ...m, output: m.output + `\n❌ Bağlantı koptu veya işlem erken sonlandı.`, isDone: true } : m));
      eventSource.close();
    };
  };

  const isAnyStreamActive = messages.some(m => m.type === 'stream' && !m.isDone);
  const currentIncident = [...messages].reverse().find(m => m.type === 'incident')?.data;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputText.trim() !== '' && !isAnyStreamActive && currentIncident) {
      handleSolve(currentIncident, inputText.trim());
      setInputText('');
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
        </button>
      )}

      {/* Floating Chatbox */}
      <div className={`fixed bottom-6 right-6 z-[60] flex flex-col glass rounded-2xl border border-slate-700/50 shadow-2xl transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'} ${isExpanded ? 'w-[800px] h-[80vh] sm:w-[60vw]' : 'w-[400px] h-[600px] max-w-[90vw] max-h-[80vh]'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">AI Assistant</h2>
              <p className="text-[10px] text-emerald-400/80 font-mono tracking-wider">DEVSEC-OPS COPILOT</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={handleClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-3">
              <Bot size={32} className="text-slate-700" />
              <p>Log terminalinden bir sorun seçin veya direkt soru sorun.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              if (msg.type === 'incident') {
                return (
                  <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} className="text-emerald-400" />
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm p-3 text-sm text-slate-300 shadow-md w-[85%]">
                      <div className="font-mono text-[10px] text-cyan-400 mb-2 border-b border-slate-700/50 pb-1 inline-block">
                        {msg.data.ns}/{msg.data.pod}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap text-xs">{msg.data.err}</p>
                      
                      {/* Show solve button only if it's the last incident and no active stream */}
                      {index === messages.findLastIndex(m => m.type === 'incident') && (
                        <button 
                          onClick={() => handleSolve(msg.data, '')}
                          disabled={isAnyStreamActive}
                          className={`mt-3 flex w-full justify-center items-center gap-2 px-3 py-2 text-white rounded-lg text-xs font-bold transition-all ${
                            isAnyStreamActive 
                              ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                              : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95'
                          }`}
                        >
                          <Play fill="currentColor" size={12} /> {isAnyStreamActive ? 'İŞLEM SÜRÜYOR...' : 'YAPAY ZEKAYA ÇÖZDÜR'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              if (msg.type === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col gap-1 items-end animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-2xl rounded-tr-sm p-3 text-sm text-emerald-100 shadow-md max-w-[85%]">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (msg.type === 'stream') {
                return (
                  <div key={msg.id} className="flex flex-col gap-2 ml-11 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-[#0a0a0a] border border-emerald-500/30 rounded-xl p-3 shadow-md w-full relative group">
                      <div className="flex items-center gap-2 mb-2 text-slate-500 border-b border-slate-800 pb-2 text-[10px] uppercase font-bold tracking-widest">
                        <Terminal size={12} /> <span>AI Execution</span>
                        {!msg.isDone && <Loader2 size={10} className="animate-spin ml-auto text-emerald-500" />}
                      </div>
                      <pre className="whitespace-pre-wrap break-words leading-loose tracking-wide text-[11px] custom-scrollbar max-h-64 overflow-y-auto text-emerald-400/90 font-mono mt-1">
                        {msg.output}
                      </pre>
                    </div>
                    
                    {msg.isSolved && (
                      <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-lg p-2 flex items-center justify-center gap-2 text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle size={14} /> PROBLEM SOLVED
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Chat Input */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-md rounded-b-2xl">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentIncident ? "Yapay zekaya direkt emir ver... (Enter)" : "Önce bir sorun seçin..."}
            disabled={!currentIncident || isAnyStreamActive}
            className="w-full bg-slate-800/50 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </>
  );
}
