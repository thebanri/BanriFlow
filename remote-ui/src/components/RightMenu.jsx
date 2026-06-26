import React from 'react';
import { X, Flame, BarChart2, PlusSquare, Network } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function RightMenu({ isOpen, onClose }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className={`absolute top-0 right-0 h-full w-80 glass border-l border-slate-700/50 transform transition-transform duration-500 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-900/50">
        <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Menu</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col p-4 gap-2">
        <Link 
          to="/" 
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentPath === '/' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Network size={18} /> Topology Graph
        </Link>
        <Link 
          to="/stats" 
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentPath === '/stats' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <BarChart2 size={18} /> Stats Graphic
        </Link>
        <Link 
          to="/stress" 
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentPath === '/stress' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Flame size={18} /> Stress Test
        </Link>
        <Link 
          to="/create" 
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentPath === '/create' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <PlusSquare size={18} /> AI Generator
        </Link>
      </div>
    </div>
  );
}
