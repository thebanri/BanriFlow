import React, { useState, useEffect } from 'react';
import { Menu, TerminalSquare } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightMenu from './components/RightMenu';
import LogTerminal from './components/LogTerminal';
import Topology3D from './components/Topology3D';
import axios from 'axios';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: "KubeSight Dashboard initialized." },
    { id: 2, time: new Date().toLocaleTimeString(), text: "Connecting to cluster API..." }
  ]);

  useEffect(() => {
    // Fetch topology
    axios.get('/api/topology')
      .then(res => {
        if (res.data && !res.data.error) {
          setGraphData(res.data);
          setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: "Cluster topology loaded successfully." }]);
        }
      })
      .catch(err => {
        console.warn('API fetch failed:', err);
        setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: "[ERROR] Could not fetch live topology." }]);
      });
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      
      {/* Top Left Header (Updated as requested) */}
      <div className="absolute top-6 left-6 z-20 glass px-6 py-3 rounded-2xl border border-slate-700/50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
          KubeSight
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-wide">AI CLOUD AUDIT</p>
      </div>

      {/* Hamburger Toggle */}
      <button 
        onClick={() => setIsRightMenuOpen(true)}
        className="absolute top-6 right-6 z-30 p-3 glass rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
      >
        <Menu className="text-cyan-400" size={24} />
      </button>

      {/* Center 3D Topology */}
      <div className="absolute inset-0 z-0">
        <Topology3D data={graphData} onNodeClick={setSelectedNode} />
      </div>

      {/* Left Details Panel */}
      <div className={`absolute top-28 left-6 z-10 transition-transform duration-500 ${selectedNode ? 'translate-x-0' : '-translate-x-[150%]'}`}>
        <Sidebar node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>

      {/* Right Hamburger Menu Panel */}
      <RightMenu isOpen={isRightMenuOpen} onClose={() => setIsRightMenuOpen(false)} selectedNode={selectedNode} />

      {/* Bottom Log Terminal */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <LogTerminal logs={logs} />
      </div>
    </div>
  );
}

export default App;
