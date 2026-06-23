import React, { useState, useEffect } from 'react';
import { Menu, TerminalSquare } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RightMenu from './components/RightMenu';
import LogTerminal from './components/LogTerminal';
import TopologyGraph from './components/TopologyGraph';
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
    // Fetch static topology directly from the Go API server on port 3005
    const apiUrl = `http://${window.location.hostname}:3005/api/topology`;
    axios.get(apiUrl)
      .then(res => {
        if (res.data && typeof res.data === 'object' && !res.data.error) {
          setGraphData({
            nodes: res.data.nodes || [],
            links: res.data.links || []
          });
          setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: "[SYSTEM] Cluster topology loaded successfully." }]);
        } else {
          setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: "[ERROR] Unexpected topology response." }]);
        }
      })
      .catch(err => {
        setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: "[ERROR] Could not fetch live topology." }]);
      });

    // Start Live SSE Event Stream for Kubernetes Events (e.g. Pod Crashes)
    const eventSource = new EventSource(`http://${window.location.hostname}:3005/api/events`);
    
    eventSource.onmessage = (e) => {
      setLogs(prev => {
        const newLogs = [...prev, { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text: e.data }];
        // Keep only last 50 logs to prevent memory leak
        return newLogs.slice(-50);
      });
    };

    eventSource.onerror = (e) => {
      console.warn("SSE EventStream Error:", e);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      


      {/* Hamburger Toggle */}
      <button 
        onClick={() => setIsRightMenuOpen(true)}
        className="absolute top-6 right-6 z-30 p-3 glass rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
      >
        <Menu className="text-cyan-400" size={24} />
      </button>

      {/* Center ASCII Topology */}
      <div className="absolute inset-0 z-0">
        <TopologyGraph data={graphData} onNodeClick={setSelectedNode} />
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
