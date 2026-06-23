import React, { useRef, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

export default function Topology3D({ data, onNodeClick }) {
  const fgRef = useRef();

  useEffect(() => {
    if (fgRef.current && data && data.nodes && data.nodes.length > 0) {
      // Small delay to allow layout to settle
      setTimeout(() => {
        fgRef.current.d3Force('charge').strength(-200);
      }, 100);
    }
  }, [data]);

  if (!data || !data.nodes) return null;

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      nodeRelSize={6}
      nodeColor={node => {
        if (node.status === 'error') return '#ef4444'; // Red
        if (node.group === 'service') return '#8b5cf6'; // Purple
        if (node.group === 'deployment') return '#10b981'; // Emerald
        return '#3b82f6'; // Blue
      }}
      linkColor={link => link.status === 'blocked' ? '#ef4444' : 'rgba(148, 163, 184, 0.3)'}
      linkDirectionalArrowLength={3.5}
      linkDirectionalArrowRelPos={1}
      backgroundColor="#020617"
      onNodeClick={(node) => {
        // Aim at node
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          2000
        );
        onNodeClick(node);
      }}
      nodeThreeObject={node => {
        // Create an ASCII-like aesthetic using standard primitives but wireframed or stylized
        const isError = node.status === 'error';
        const isService = node.group === 'service';
        
        const geometry = isService ? new THREE.OctahedronGeometry(6) : new THREE.BoxGeometry(8, 8, 8);
        const material = new THREE.MeshPhongMaterial({
          color: isError ? '#ef4444' : (isService ? '#8b5cf6' : '#3b82f6'),
          transparent: true,
          opacity: 0.8,
          wireframe: true, // Gives an ASCII/Hacker aesthetic
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
      }}
    />
  );
}
