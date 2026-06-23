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

  // ASCII art generation based on node type
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
      
      <pre className={`${colorClass} leading-tight m-0`}>
        {renderAscii()}
      </pre>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-600 !border-none" />
    </div>
  );
};

// --- Main Component ---
export default function TopologyGraph({ data, onNodeClick }) {
  const [nodes, setNodes] = React.useState([]);
  const [edges, setEdges] = React.useState([]);

  const nodeTypes = useMemo(() => ({ asciiNode: AsciiNode }), []);

  // Convert generic graph data to React Flow format
  useEffect(() => {
    if (!data || !data.nodes) return;

    // Simple grid auto-layout
    const cols = 4;
    const newNodes = data.nodes.map((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        id: n.id,
        type: 'asciiNode',
        position: { x: col * 250 + 100, y: row * 180 + 100 },
        data: { ...n },
      };
    });

    const newEdges = (data.links || []).map((l, i) => {
      // In force-graph, source/target can be objects if initialized, or strings.
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      
      return {
        id: `e${sourceId}-${targetId}-${i}`,
        source: sourceId,
        target: targetId,
        animated: true, // This creates the glowing moving rope effect
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
        onNodeClick={(_, node) => onNodeClick(node.data)}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#334155" gap={24} size={1.5} />
        <Controls className="!bg-slate-900 !border-slate-700 !fill-slate-400" />
      </ReactFlow>
    </div>
  );
}
