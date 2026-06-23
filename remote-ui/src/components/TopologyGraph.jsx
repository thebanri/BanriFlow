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
  const borderClass = isError ? 'border-red-500/50' : 'border-cyan-500/30';
  const shadowClass = isError ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'shadow-[0_0_15px_rgba(6,182,212,0.1)]';

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
    <div className={`font-mono text-xs p-2 rounded-lg bg-slate-950/90 border ${borderClass} ${shadowClass} backdrop-blur-md cursor-pointer hover:border-cyan-400 transition-colors`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-600 !border-none" />
      <pre className={`${colorClass} leading-tight m-0`}>{renderAscii()}</pre>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-600 !border-none" />
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

    // 1. Find unique namespaces
    const namespaces = [...new Set(data.nodes.map(n => n.namespace || 'default'))];
    
    // 2. Build parent nodes for each namespace
    const newNodes = [];
    
    namespaces.forEach((ns, nsIndex) => {
      const nsNodes = data.nodes.filter(n => (n.namespace || 'default') === ns);
      
      // Calculate how big the namespace box needs to be
      const cols = Math.max(2, Math.ceil(Math.sqrt(nsNodes.length)));
      const rows = Math.ceil(nsNodes.length / cols);
      
      const boxWidth = cols * 250 + 100;
      const boxHeight = rows * 180 + 100;

      // Add the Namespace Box (Parent)
      newNodes.push({
        id: `ns-${ns}`,
        type: 'namespaceNode',
        position: { x: nsIndex * 900, y: 0 }, // Group them side by side
        style: { width: boxWidth, height: boxHeight },
        data: { label: ns },
      });

      // Add the actual pods/services inside this box
      nsNodes.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        newNodes.push({
          id: n.id,
          type: 'asciiNode',
          position: { x: col * 250 + 50, y: row * 180 + 50 }, // Relative to parent!
          parentNode: `ns-${ns}`,
          extent: 'parent',
          data: { ...n },
        });
      });
    });

    // 3. Build edges
    const newEdges = (data.links || []).map((l, i) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return {
        id: `e${sourceId}-${targetId}-${i}`,
        source: sourceId,
        target: targetId,
        animated: true, 
        style: { 
          stroke: l.status === 'error' ? '#ef4444' : '#0ea5e9', 
          strokeWidth: 2, 
        },
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

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          if (node.type !== 'namespaceNode') onNodeClick(node.data);
        }}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#334155" gap={24} size={1.5} />
        <Controls className="!bg-slate-900 !border-slate-700 !fill-slate-400" />
      </ReactFlow>
    </div>
  );
}
