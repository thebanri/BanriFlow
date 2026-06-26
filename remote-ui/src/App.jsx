import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import RightMenu from './components/RightMenu';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import Stress from './pages/Stress';
import Create from './pages/Create';

function App() {
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Routes Area */}
      <div className="absolute inset-0 w-full h-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/stress" element={<Stress />} />
          <Route path="/create" element={<Create />} />
        </Routes>
      </div>

      {/* Global Hamburger Toggle */}
      <button 
        onClick={() => setIsRightMenuOpen(true)}
        className="absolute top-6 right-6 z-40 p-3 glass rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
      >
        <Menu className="text-cyan-400" size={24} />
      </button>

      {/* Global Right Menu */}
      <RightMenu isOpen={isRightMenuOpen} onClose={() => setIsRightMenuOpen(false)} />
    </div>
  );
}

export default App;
