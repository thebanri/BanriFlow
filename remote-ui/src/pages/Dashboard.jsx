import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import LogTerminal from '../components/LogTerminal';
import TopologyGraph from '../components/TopologyGraph';
import AIChatPanel from '../components/AIChatPanel';
import axios from 'axios';

function Dashboard() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [logs, setLogs] = useState([]);
  const [solveData, setSolveData] = useState(null);

  useEffect(() => {
    const fetchTopology = () => {
      const apiUrl = `http://${window.location.hostname}:3005/api/topology`;
      axios.get(apiUrl)
        .then(res => {
          if (res.data && typeof res.data === 'object' && !res.data.error) {
            const newNodes = res.data.nodes || [];
            setGraphData({
              nodes: newNodes,
              links: res.data.links || []
            });
            
            // Auto-close or update stale selected node
            setSelectedNode(currentSelected => {
              if (!currentSelected) return null;
              const found = newNodes.find(n => n.id === currentSelected.id);
              if (!found) return null; // Node was deleted
              return found; // Return updated node data
            });
          }
        })
        .catch(err => {
          console.warn("Could not fetch topology", err);
        });
    };

    fetchTopology(); // Initial fetch
    const topoInterval = setInterval(fetchTopology, 3000); // Auto-refresh every 3 seconds

    // Fetch Historical Logs
    axios.get(`http://${window.location.hostname}:3005/api/logs/history`)
      .then(res => {
        if (Array.isArray(res.data)) {
          const historicalLogs = res.data.map(ev => ({
            id: ev.timestamp,
            time: new Date(ev.timestamp).toLocaleTimeString('tr-TR', { hour12: false }),
            text: ev.text
          }));
          setLogs(historicalLogs.slice(-100)); // Load up to last 100 historical logs
        }
      })
      .catch(err => console.warn("No historical logs found"));

    // Start Live SSE Event Stream for Kubernetes Events (e.g. Pod Crashes)
    const eventSource = new EventSource(`http://${window.location.hostname}:3005/api/events`);
    
    eventSource.onmessage = (e) => {
      setLogs(prev => {
        const newLogs = [...prev, { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString('tr-TR', { hour12: false }), text: e.data }];
        // Keep only last 100 logs to prevent memory leak
        return newLogs.slice(-100);
      });
    };

    eventSource.onerror = (e) => {
      console.warn("SSE EventStream Error:", e);
    };

    return () => {
      clearInterval(topoInterval);
      eventSource.close();
    };
  }, []);

  return (
    <>
      {/* Center ASCII Topology */}
      <div className="absolute inset-0 z-0">
        <TopologyGraph data={graphData} onNodeClick={setSelectedNode} />
      </div>

      {/* Left Details Panel */}
      <div className={`absolute top-28 left-6 z-40 transition-transform duration-500 ${selectedNode ? 'translate-x-0' : '-translate-x-[150%]'}`}>
        <Sidebar 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
          onSolve={(ns, pod, err) => setSolveData({ ns, pod, err })} 
        />
      </div>

      {/* AI Chat Panel & Bubble */}
      <AIChatPanel activeIncident={solveData} onClose={() => setSolveData(null)} />

      {/* Bottom Log Terminal */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <LogTerminal logs={logs} onSolve={(ns, pod, err) => setSolveData({ ns, pod, err })} />
      </div>
    </>
  );
}

export default Dashboard;
