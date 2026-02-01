import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useWorkflowStore } from '../store';
import { PluginManager } from '../plugins';

interface ToolbarProps {
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ position, onPositionChange }) => {
  const { 
    nodes, 
    connections, 
    isRunning,
    clearWorkflow, 
    loadWorkflow,
    runAll,
  } = useWorkflowStore();
  
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSaveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 拖拽工具栏
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // 如果点击的是按钮，不启动拖拽
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...position };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // 限制在窗口范围内
      const toolbarWidth = toolbarRef.current?.offsetWidth || 300;
      const toolbarHeight = toolbarRef.current?.offsetHeight || 50;
      
      const newX = Math.max(0, Math.min(window.innerWidth - toolbarWidth, startPos.x + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - toolbarHeight, startPos.y + deltaY));
      
      onPositionChange({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  }, [position, onPositionChange]);
  
  const handleRunAll = useCallback(async () => {
    if (nodes.length === 0 || isRunning) return;
    await runAll();
  }, [nodes.length, isRunning, runAll]);
  
  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (window.confirm('确定要清空画布吗？')) {
      clearWorkflow();
    }
  }, [nodes.length, clearWorkflow]);
  
  const handleSave = useCallback(() => {
    const workflow = {
      nodes,
      connections,
      savedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveMenu(false);
  }, [nodes, connections]);
  
  const handleExportComfyUI = useCallback(() => {
    const comfyWorkflow = PluginManager.exportToComfyWorkflow(nodes, connections);
    
    const blob = new Blob([JSON.stringify(comfyWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comfyui-workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveMenu(false);
  }, [nodes, connections]);
  
  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // 检测是否为 ComfyUI 格式
        if (data.last_node_id !== undefined && data.links !== undefined) {
          const { nodes: importedNodes, connections: importedConnections } = 
            PluginManager.importComfyWorkflow(data);
          loadWorkflow(importedNodes, importedConnections);
        } else if (data.nodes && data.connections) {
          loadWorkflow(data.nodes, data.connections);
        } else {
          throw new Error('无效的工作流格式');
        }
      } catch (err) {
        alert('加载失败：' + (err as Error).message);
      }
    };
    input.click();
  }, [loadWorkflow]);
  
  return (
    <div 
      ref={toolbarRef}
      className={`toolbar ${isDragging ? 'dragging' : ''}`}
      style={{ 
        left: position.x, 
        top: position.y,
        transform: 'none',
      }}
      onMouseDown={handleDragStart}
    >
      {/* 拖拽手柄 */}
      <div className="toolbar-drag-handle" title="拖拽移动">
        <span>⋮⋮</span>
      </div>
      
      {/* 运行按钮 */}
      <button 
        className={`toolbar-btn run-btn ${isRunning ? 'running' : ''}`}
        onClick={handleRunAll}
        disabled={nodes.length === 0 || isRunning}
      >
        {isRunning ? (
          <>
            <span className="spinner"></span>
            运行中
          </>
        ) : (
          <>
            <span>▶</span>
            运行
          </>
        )}
      </button>
      
      <div className="toolbar-divider" />
      
      {/* 保存下拉菜单 */}
      <div className="toolbar-dropdown" ref={dropdownRef}>
        <button 
          className="toolbar-btn" 
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          disabled={nodes.length === 0}
        >
          <span>💾</span>
          保存
        </button>
        {showSaveMenu && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleSave}>
              <span>📄</span>
              保存工作流
            </button>
            <button className="dropdown-item" onClick={handleExportComfyUI}>
              <span>🔄</span>
              导出 ComfyUI
            </button>
          </div>
        )}
      </div>
      
      <button 
        className="toolbar-btn icon-btn" 
        onClick={handleLoad} 
        title="打开工作流"
      >
        📂
      </button>
      
      <div className="toolbar-divider" />
      
      <button 
        className="toolbar-btn icon-btn" 
        onClick={handleClear} 
        title="清空画布"
        disabled={nodes.length === 0}
      >
        🗑️
      </button>
    </div>
  );
};
