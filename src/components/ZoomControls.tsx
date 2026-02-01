import React, { useCallback } from 'react';
import { useWorkflowStore } from '../store';

export const ZoomControls: React.FC = () => {
  const { canvas, setZoom, setOffset } = useWorkflowStore();
  
  const handleZoomIn = useCallback(() => {
    setZoom(canvas.zoom + 0.1);
  }, [canvas.zoom, setZoom]);
  
  const handleZoomOut = useCallback(() => {
    setZoom(canvas.zoom - 0.1);
  }, [canvas.zoom, setZoom]);
  
  const handleReset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [setZoom, setOffset]);
  
  return (
    <div className="zoom-controls">
      <button className="zoom-btn" onClick={handleZoomIn} title="放大">
        +
      </button>
      <div className="zoom-level" onClick={handleReset} style={{ cursor: 'pointer' }} title="重置">
        {Math.round(canvas.zoom * 100)}%
      </div>
      <button className="zoom-btn" onClick={handleZoomOut} title="缩小">
        −
      </button>
    </div>
  );
};
