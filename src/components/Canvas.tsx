import React, { useCallback, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../store';
import { Node } from './Node';
import { Connections } from './Connections';

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const {
    nodes,
    canvas,
    connectionState,
    setZoom,
    setOffset,
    clearSelection,
    updateConnectionMouse,
    cancelConnection,
    addNode,
  } = useWorkflowStore();
  
  // 处理画布平移
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.node')) return;
    
    clearSelection();
    
    // 如果正在连接，取消连接
    if (connectionState.isConnecting) {
      cancelConnection();
      return;
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffset = { ...canvas.offset };
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setOffset({
        x: startOffset.x + dx,
        y: startOffset.y + dy,
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [canvas.offset, clearSelection, setOffset, connectionState.isConnecting, cancelConnection]);
  
  // 处理缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(2, canvas.zoom * delta));
    
    // 以鼠标位置为中心缩放
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newOffset = {
      x: mouseX - (mouseX - canvas.offset.x) * (newZoom / canvas.zoom),
      y: mouseY - (mouseY - canvas.offset.y) * (newZoom / canvas.zoom),
    };
    
    setZoom(newZoom);
    setOffset(newOffset);
  }, [canvas.zoom, canvas.offset, setZoom, setOffset]);
  
  // 处理连接时的鼠标移动
  useEffect(() => {
    if (!connectionState.isConnecting) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      updateConnectionMouse({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      cancelConnection();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [connectionState.isConnecting, updateConnectionMouse, cancelConnection]);
  
  // 处理拖放
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const nodeType = e.dataTransfer.getData('nodeType');
    if (!nodeType) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // 转换到画布坐标
    const x = (e.clientX - rect.left - canvas.offset.x) / canvas.zoom;
    const y = (e.clientY - rect.top - canvas.offset.y) / canvas.zoom;
    
    addNode(nodeType, { x, y });
  }, [canvas.offset, canvas.zoom, addNode]);
  
  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="canvas-background" />
      
      <div
        ref={canvasRef}
        className="canvas"
        style={{
          transform: `translate(${canvas.offset.x}px, ${canvas.offset.y}px) scale(${canvas.zoom})`,
        }}
      >
        <Connections containerRef={containerRef} />
        
        {nodes.map(node => (
          <Node key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};
