import React, { useCallback, useState, useRef } from 'react';
import { useWorkflowStore } from '../store';
import { getNodeDefinition } from '../nodes/definitions';

interface PropertiesPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ width, onWidthChange }) => {
  const { nodes, selectedNodeIds, updateNodeData } = useWorkflowStore();
  const [isResizing, setIsResizing] = useState(false);
  
  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find(n => n.id === selectedNodeIds[0])
    : null;
  
  const definition = selectedNode ? getNodeDefinition(selectedNode.type) : null;

  // 拖拽调整宽度
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(200, Math.min(400, startWidth + delta));
      onWidthChange(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, onWidthChange]);
  
  if (!selectedNode || !definition) {
    return (
      <div className={`properties-panel ${isResizing ? 'resizing' : ''}`} style={{ width }}>
        {/* 拖拽调整宽度的手柄 */}
        <div 
          className="panel-resize-handle"
          onMouseDown={handleResizeStart}
        />
        <div className="panel-header">
          <h2>属性</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">未选中节点</div>
          <div className="empty-state-desc">
            选择一个节点以查看和编辑其属性
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`properties-panel ${isResizing ? 'resizing' : ''}`} style={{ width }}>
      {/* 拖拽调整宽度的手柄 */}
      <div 
        className="panel-resize-handle"
        onMouseDown={handleResizeStart}
      />
      <div className="panel-header">
        <h2>
          <span style={{ marginRight: 8 }}>{definition.icon}</span>
          {definition.name}
        </h2>
      </div>
      
      <div className="panel-content">
        {/* 节点描述 */}
        {definition.description && (
          <div style={{ 
            fontSize: 12, 
            color: 'var(--text-secondary)', 
            marginBottom: 16,
            lineHeight: 1.5,
          }}>
            {definition.description}
          </div>
        )}
        
        {/* ComfyUI 节点标记 */}
        {definition.isCustom && (
          <div style={{
            padding: 8,
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: 'var(--accent-purple)' }}>🧩 ComfyUI 节点</strong>
            {definition.comfyClass && (
              <p style={{ marginTop: 4, fontFamily: 'monospace' }}>
                类名: {definition.comfyClass}
              </p>
            )}
          </div>
        )}
        
        {/* 参考图像提示 */}
        {selectedNode.inputs.some(i => i.isReferenceInput) && (
          <div style={{
            padding: 12,
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: 'var(--accent-warning)' }}>🔒 参考锁定</strong>
            <p style={{ marginTop: 4 }}>
              将参考图像输入连接到角色参考节点以保持角色一致性。
            </p>
          </div>
        )}
        
        {/* 端口信息 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: 10, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
            连接
          </div>
          
          {selectedNode.inputs.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>输入</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedNode.inputs.map(port => (
                  <span 
                    key={port.id}
                    style={{
                      padding: '4px 8px',
                      background: port.connected ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-tertiary)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: port.connected ? 'var(--accent-success)' : 'var(--text-secondary)',
                    }}
                  >
                    {port.name}
                    {port.isReferenceInput && ' 🔒'}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {selectedNode.outputs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>输出</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedNode.outputs.map(port => (
                  <span 
                    key={port.id}
                    style={{
                      padding: '4px 8px',
                      background: port.connected ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-tertiary)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: port.connected ? 'var(--accent-success)' : 'var(--text-secondary)',
                    }}
                  >
                    {port.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 节点 ID */}
        <div style={{ 
          fontSize: 10, 
          color: 'var(--text-muted)',
          fontFamily: 'monospace',
        }}>
          ID: {selectedNode.id.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
};
