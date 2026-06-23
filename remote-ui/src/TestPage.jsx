import React, { useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

// Obsidian benzeri sahte ağ verimiz (Node ve Linkler)
const graphData = {
  nodes: [
    { id: 'Ana Sayfa', group: 1, val: 20 },
    { id: 'React', group: 2, val: 15 },
    { id: 'JavaScript', group: 2, val: 10 },
    { id: 'Notlarım', group: 1, val: 10 },
    { id: 'Fikirler', group: 3, val: 15 },
    { id: 'Projeler', group: 3, val: 20 }
  ],
  links: [
    { source: 'Ana Sayfa', target: 'Notlarım' },
    { source: 'Notlarım', target: 'React' },
    { source: 'React', target: 'JavaScript' },
    { source: 'Ana Sayfa', target: 'Fikirler' },
    { source: 'Fikirler', target: 'Projeler' },
    { source: 'Projeler', target: 'React' },
    { source: 'Ana Sayfa', target: 'Projeler' }
  ]
};

// Dinamik 3D verinin ASCII Art formatındaki yansıması
const asciiArtMap = `
        [Ana Sayfa] ===================== [Fikirler]
        /         \\                           |
       /           \\                          |
      /             \\                         |
 [Notlarım]      [Projeler] ==================/
      \\             /
       \\           /
        \\         /
         [React] ==================== [JavaScript]
`;

export default function TestPage() {
  const [viewMode, setViewMode] = useState('3d'); // '3d' veya 'ascii'

  const styles = {
    container: {
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#1e1e1e', // Obsidian tarzı koyu tema
      color: '#ffffff'
    },
    header: {
      padding: '20px',
      textAlign: 'center',
      borderBottom: '1px solid #333'
    },
    button: {
      padding: '10px 20px',
      margin: '0 10px',
      cursor: 'pointer',
      backgroundColor: '#4a4a4a',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontWeight: 'bold'
    },
    activeButton: {
      backgroundColor: '#7b61ff', // Aktif sekme için Obsidian moru
    },
    content: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    },
    asciiContainer: {
      fontFamily: 'monospace',
      whiteSpace: 'pre',
      color: '#00ff00', // Hacker / Retro yeşili
      backgroundColor: '#000000',
      padding: '40px',
      borderRadius: '10px',
      border: '1px solid #333',
      fontSize: '1.2rem',
      lineHeight: '1.5'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Bilgi Ağı (Graph View)</h2>
        <button 
          style={{...styles.button, ...(viewMode === '3d' ? styles.activeButton : {})}}
          onClick={() => setViewMode('3d')}
        >
          3D Görünüm
        </button>
        <button 
          style={{...styles.button, ...(viewMode === 'ascii' ? styles.activeButton : {})}}
          onClick={() => setViewMode('ascii')}
        >
          ASCII Art Görünüm
        </button>
      </div>

      <div style={styles.content}>
        {viewMode === '3d' ? (
          <ForceGraph3D
            graphData={graphData}
            nodeAutoColorBy="group"
            nodeRelSize={6}
            linkWidth={1.5}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            backgroundColor="#1e1e1e"
          />
        ) : (
          <div style={styles.asciiContainer}>
            {asciiArtMap}
          </div>
        )}
      </div>
    </div>
  );
}
