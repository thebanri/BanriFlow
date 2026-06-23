import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  applyNodeChanges, 
  applyEdgeChanges, 
  Handle, 
  Position 
} from 'reactflow';
import 'reactflow/dist/style.css';

// --- Custom ASCII Node ---
const AsciiNode = ({ data }) => {
  const isError = data.status === 'error';
  const colorClass = isError ? 'text-red-500' : (data.group === 'service' ? 'text-purple-400' : 'text-emerald-400');
  const borderClass = isError ? 'border-red-500/30' : 'border-cyan-500/10';
  const shadowClass = isError ? 'shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'shadow-[0_0_10px_rgba(6,182,212,0.05)]';

  const renderAscii = () => {
    const title = `[ ${data.group.toUpperCase().substring(0,10).padEnd(10, ' ')} ]`;
    const nameStr = data.name || "Unknown";
    const nameLine = `| N: ${nameStr.substring(0, 12).padEnd(12, ' ')} |`;
    const statStr = data.status || "OK";
    const statLine = `| S: ${statStr.substring(0, 12).padEnd(12, ' ')} |`;
    
    return ` +----------------+
 | ${title} |
 ${nameLine}
 ${statLine}
 +----------------+`;
  };

  return (
    <div className={`font-mono text-xs p-2 rounded-lg bg-slate-950/80 border ${borderClass} ${shadowClass} backdrop-blur-md cursor-pointer hover:border-cyan-500/30 hover:bg-slate-900/90 transition-all duration-300`}>
      <Handle type="target" position={Position.Left} className="!opacity-0 !border-none" />
      <pre className={`${colorClass} leading-tight m-0`}>{renderAscii()}</pre>
      <Handle type="source" position={Position.Right} className="!opacity-0 !border-none" />
    </div>
  );
};

// --- Custom Namespace Parent Node ---
const NamespaceNode = ({ data }) => {
  return (
    <div className="w-full h-full border-2 border-dashed border-slate-700/50 bg-slate-900/20 rounded-xl relative">
      <div className="absolute -top-3 left-4 bg-slate-950 px-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
        NAMESPACE: {data.label}
      </div>
    </div>
  );
};

// --- Main Component ---
export default function TopologyGraph({ data, onNodeClick }) {
  const [nodes, setNodes] = React.useState([]);
  const [edges, setEdges] = React.useState([]);

  const nodeTypes = useMemo(() => ({ asciiNode: AsciiNode, namespaceNode: NamespaceNode }), []);

  useEffect(() => {
    if (!data || !data.nodes) return;

    const fixedDataNodes = data.nodes.map(n => {
      if (n.name === 'kubernetes' && n.group === 'service') {
        return { ...n, namespace: 'kube-system' };
      }
      return n;
    });

    const namespaces = [...new Set(fixedDataNodes.map(n => n.namespace || 'default'))];
    
    const newNodes = [];
    let cumulativeX = 0; // Prevent namespace overlapping
    
    namespaces.forEach((ns) => {
      const nsNodes = fixedDataNodes.filter(n => (n.namespace || 'default') === ns);
      const services = nsNodes.filter(n => n.group === 'service');
      const pods = nsNodes.filter(n => n.group === 'pod');
      
      let currentY = 50;
      let maxCols = 1;
      
      const placedPodIds = new Set();
      
      const treeServices = [];
      const standaloneServices = [];

      // Identify tree services vs standalone services
      services.forEach(svc => {
        const connectedLinks = (data.links || []).filter(l => l.source === svc.id || (l.source.id && l.source.id === svc.id));
        if (connectedLinks.length > 0) {
          treeServices.push(svc);
        } else {
          standaloneServices.push(svc);
        }
      });
      
      // Layout Tree Services and their connected Pods
      treeServices.forEach(svc => {
        const connectedLinks = (data.links || []).filter(l => l.source === svc.id || (l.source.id && l.source.id === svc.id));
        const connectedPodIds = connectedLinks.map(l => typeof l.target === 'object' ? l.target.id : l.target);
        const connectedPods = pods.filter(p => connectedPodIds.includes(p.id));
        
        // Only place pods that haven't been placed yet by another service
        const unplacedPods = connectedPods.filter(p => !placedPodIds.has(p.id));
        
        // Place Service on left
        newNodes.push({
          id: svc.id,
          type: 'asciiNode',
          position: { x: 50, y: currentY + (Math.max(1, unplacedPods.length) * 150) / 2 - 75 },
          parentNode: `ns-${ns}`,
          extent: 'parent',
          data: { ...svc },
        });

        // Place connected Pods on right, stacking upwards/downwards
        unplacedPods.forEach((pod, idx) => {
          newNodes.push({
            id: pod.id,
            type: 'asciiNode',
            position: { x: 350, y: currentY + idx * 150 },
            parentNode: `ns-${ns}`,
            extent: 'parent',
            data: { ...pod },
          });
          placedPodIds.add(pod.id);
        });

        if (unplacedPods.length > 0) maxCols = 2;
        currentY += Math.max(1, unplacedPods.length) * 150 + 50;
      });

      // Layout Standalone Nodes (Pods + Services with 0 connections) in a grid
      const standalonePods = pods.filter(p => !placedPodIds.has(p.id));
      const standaloneNodes = [...standaloneServices, ...standalonePods];

      if (standaloneNodes.length > 0) currentY += 50; // padding

      standaloneNodes.forEach((node, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        newNodes.push({
          id: node.id,
          type: 'asciiNode',
          position: { x: 50 + col * 280, y: currentY + row * 150 },
          parentNode: `ns-${ns}`,
          extent: 'parent',
          data: { ...node },
        });
      });

      if (standaloneNodes.length > 0) {
        maxCols = Math.max(maxCols, 3);
        currentY += Math.ceil(standaloneNodes.length / 3) * 150 + 50;
      }

      // Calculate Parent Box Size
      const boxWidth = (maxCols * 300) + 150;
      const boxHeight = Math.max(300, currentY);

      newNodes.push({
        id: `ns-${ns}`,
        type: 'namespaceNode',
        position: { x: cumulativeX, y: 0 },
        style: { width: boxWidth, height: boxHeight, zIndex: -1 },
        data: { label: ns },
        draggable: false, // Kesin çözüm: Kutuları sabitle!
      });

      cumulativeX += boxWidth + 100; // Add padding between namespaces
    });

    const newEdges = (data.links || []).map((l, i) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return {
        id: `e${sourceId}-${targetId}-${i}`,
        source: sourceId,
        target: targetId,
        animated: true, 
        style: { stroke: l.status === 'error' ? '#ef4444' : '#0ea5e9', strokeWidth: 2 },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [data]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          if (node.type !== 'namespaceNode') onNodeClick(node.data);
        }}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#334155" gap={24} size={1.5} />
      </ReactFlow>
    </div>
  );
}
