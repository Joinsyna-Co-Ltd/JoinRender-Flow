import React, { useCallback, useRef } from 'react';
import type { NodeInstance, Port } from '../types';
import { getNodeDefinition } from '../nodes/definitions';
import { useWorkflowStore } from '../store';

interface NodeProps {
  node: NodeInstance;
}

export const Node: React.FC<NodeProps> = ({ node }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const definition = getNodeDefinition(node.type);
  
  const {
    selectedNodeIds,
    executionStates,
    selectNode,
    startDrag,
    updateDrag,
    endDrag,
    startConnection,
    endConnection,
    connectionState,
    removeNode,
    updateNodeData,
  } = useWorkflowStore();
  
  const isSelected = selectedNodeIds.includes(node.id);
  const executionState = executionStates.find(s => s.nodeId === node.id);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    selectNode(node.id, e.ctrlKey || e.metaKey);
    startDrag(node.id, { x: e.clientX, y: e.clientY });
    
    const handleMouseMove = (e: MouseEvent) => {
      updateDrag({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      endDrag();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [node.id, selectNode, startDrag, updateDrag, endDrag]);
  
  const handlePortMouseDown = useCallback((e: React.MouseEvent, port: Port) => {
    e.stopPropagation();
    if (port.direction === 'output') {
      startConnection(node.id, port.id, port.type);
    }
  }, [node.id, startConnection]);
  
  const handlePortMouseUp = useCallback((e: React.MouseEvent, port: Port) => {
    e.stopPropagation();
    if (connectionState.isConnecting && port.direction === 'input') {
      if (
        connectionState.sourcePortType === port.type ||
        connectionState.sourcePortType === 'any' ||
        port.type === 'any'
      ) {
        endConnection(node.id, port.id);
      }
    }
  }, [node.id, connectionState, endConnection]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(node.id);
  }, [node.id, removeNode]);
  
  const handleDataChange = useCallback((key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value });
  }, [node.id, updateNodeData]);
  
  // 如果没有找到定义，显示未知节点
  if (!definition) {
    return (
      <div
        ref={nodeRef}
        className={`node unknown ${isSelected ? 'selected' : ''}`}
        style={{
          left: node.position.x,
          top: node.position.y,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="node-header" onMouseDown={handleMouseDown}>
          <div className="node-icon">❓</div>
          <div className="node-title">{node.type}</div>
          <button className="node-delete-btn" onClick={handleDelete}>✕</button>
        </div>
        <div className="node-body">
          <div className="node-content">
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              未知节点类型
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const statusClass = executionState?.status === 'running' 
    ? 'running' 
    : executionState?.status === 'completed'
    ? 'completed'
    : executionState?.status === 'error'
    ? 'error'
    : '';
  
  return (
    <div
      ref={nodeRef}
      className={`node ${isSelected ? 'selected' : ''} ${statusClass} ${definition.isCustom ? 'comfy-node' : ''}`}
      data-category={definition.category}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="node-header" 
        onMouseDown={handleMouseDown}
        style={{ borderLeftColor: definition.color }}
      >
        <div className="node-icon">{definition.icon}</div>
        <div className="node-title">{definition.name}</div>
        {definition.isCustom && <span className="node-badge comfy">ComfyUI</span>}
        <button className="node-delete-btn" onClick={handleDelete}>✕</button>
      </div>
      
      <div className="node-body">
        {/* 输入端口 */}
        {node.inputs.length > 0 && (
          <div className="node-ports inputs">
            {node.inputs.map(port => (
              <div key={port.id} className="port-row input">
                <div
                  className={`port input ${port.type} ${port.connected ? 'connected' : ''} ${port.isReferenceInput ? 'reference' : ''}`}
                  onMouseDown={(e) => handlePortMouseDown(e, port)}
                  onMouseUp={(e) => handlePortMouseUp(e, port)}
                  data-port-id={port.id}
                  data-node-id={node.id}
                  title={port.isReferenceInput ? '参考图像（角色锁定）' : port.name}
                />
                <span className="port-label">
                  {port.name}
                  {port.isReferenceInput && <span className="ref-badge">🔒</span>}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* 节点内容 */}
        {renderNodeContent(node, definition, handleDataChange)}
        
        {/* 输出端口 */}
        {node.outputs.length > 0 && (
          <div className="node-ports outputs">
            {node.outputs.map(port => (
              <div key={port.id} className="port-row output">
                <span className="port-label">{port.name}</span>
                <div
                  className={`port output ${port.type} ${port.connected ? 'connected' : ''}`}
                  onMouseDown={(e) => handlePortMouseDown(e, port)}
                  data-port-id={port.id}
                  data-node-id={node.id}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* 执行进度 */}
        {executionState?.status === 'running' && (
          <div className="node-progress">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${executionState.progress || 0}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function renderNodeContent(
  node: NodeInstance, 
  definition: ReturnType<typeof getNodeDefinition>,
  onChange: (key: string, value: unknown) => void
) {
  if (!definition) return null;
  
  // ComfyUI 节点：渲染 widget
  if (definition.isCustom) {
    const widgetInputs = node.inputs.filter(input => input.widget);
    if (widgetInputs.length === 0) return null;
    
    return (
      <div className="node-content">
        {widgetInputs.map(input => (
          <div key={input.id} className="widget-field">
            <label>{input.name}</label>
            {renderWidget(input, node.data[input.name], (value) => onChange(input.name, value))}
          </div>
        ))}
      </div>
    );
  }
  
  // 内置节点
  switch (node.type) {
    case 'text-input':
      return (
        <div className="node-content">
          <textarea
            placeholder="在此输入文本..."
            value={(node.data.text as string) || ''}
            onChange={(e) => onChange('text', e.target.value)}
            rows={4}
          />
        </div>
      );
    
    case 'llm':
      return (
        <div className="node-content">
          <div className="field-label">系统提示词</div>
          <textarea
            placeholder="输入系统提示词..."
            value={(node.data.systemPrompt as string) || ''}
            onChange={(e) => onChange('systemPrompt', e.target.value)}
            rows={4}
            className="code-textarea"
          />
        </div>
      );
    
    case 'image-upload':
    case 'video-upload':
      return (
        <div className="node-content">
          <div className="upload-area">
            <span className="upload-icon">📁</span>
            <span className="upload-text">
              拖放{node.type === 'image-upload' ? '图像' : '视频'}到此处
            </span>
          </div>
        </div>
      );
    
    case 'character-reference-gen':
      return (
        <div className="node-content">
          <div className="field-group">
            <label>姿势</label>
            <select
              value={(node.data.pose as string) || 'T-Pose'}
              onChange={(e) => onChange('pose', e.target.value)}
            >
              <option value="T-Pose">T-Pose（推荐）</option>
              <option value="A-Pose">A-Pose</option>
              <option value="Standing">站立</option>
            </select>
          </div>
          <div className="field-group">
            <label>背景</label>
            <select
              value={(node.data.background as string) || 'green'}
              onChange={(e) => onChange('background', e.target.value)}
            >
              <option value="green">绿幕</option>
              <option value="white">白色</option>
              <option value="gray">灰色</option>
            </select>
          </div>
        </div>
      );
    
    case 'image-gen':
    case 'advanced-image-gen':
      return (
        <div className="node-content">
          <div className="field-group">
            <label>宽高比</label>
            <select
              value={(node.data.aspectRatio as string) || '16:9'}
              onChange={(e) => onChange('aspectRatio', e.target.value)}
            >
              <option value="16:9">16:9 横向</option>
              <option value="9:16">9:16 竖向</option>
              <option value="1:1">1:1 方形</option>
              <option value="21:9">21:9 电影</option>
            </select>
          </div>
        </div>
      );
    
    case 'video-gen':
    case 'frame-interpolation':
      return (
        <div className="node-content">
          <div className="field-group">
            <label>时长</label>
            <select
              value={(node.data.duration as number) || 5}
              onChange={(e) => onChange('duration', Number(e.target.value))}
            >
              <option value={3}>3 秒</option>
              <option value={5}>5 秒</option>
              <option value={10}>10 秒</option>
            </select>
          </div>
          {node.type === 'video-gen' && (
            <div className="field-group">
              <label>运动</label>
              <select
                value={(node.data.motion as string) || 'auto'}
                onChange={(e) => onChange('motion', e.target.value)}
              >
                <option value="auto">自动</option>
                <option value="subtle">轻微</option>
                <option value="dynamic">动态</option>
              </select>
            </div>
          )}
        </div>
      );
    
    case 'image-output':
      return (
        <div className="node-content">
          <div className="output-preview">
            <span className="preview-placeholder">🖼️</span>
            <span className="preview-text">输出预览</span>
          </div>
        </div>
      );
    
    case 'video-output':
      return (
        <div className="node-content">
          <div className="output-preview">
            <span className="preview-placeholder">🎬</span>
            <span className="preview-text">视频预览</span>
          </div>
        </div>
      );
    
    case 'storyboard-output':
      return (
        <div className="node-content">
          <div className="storyboard-preview">
            <div className="storyboard-frame">1</div>
            <div className="storyboard-frame">2</div>
            <div className="storyboard-frame">3</div>
          </div>
        </div>
      );
    
    default:
      return null;
  }
}

function renderWidget(
  input: Port,
  value: unknown,
  onChange: (value: unknown) => void
) {
  const widget = input.widget;
  if (!widget) return null;
  
  switch (widget.type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) ?? widget.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    
    case 'textarea':
      return (
        <textarea
          value={(value as string) ?? widget.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          value={(value as number) ?? widget.default ?? 0}
          min={widget.min}
          max={widget.max}
          step={widget.step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    
    case 'slider':
      return (
        <div className="slider-widget">
          <input
            type="range"
            value={(value as number) ?? widget.default ?? 0}
            min={widget.min ?? 0}
            max={widget.max ?? 1}
            step={widget.step ?? 0.01}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="slider-value">
            {((value as number) ?? widget.default ?? 0).toFixed(2)}
          </span>
        </div>
      );
    
    case 'combo':
      return (
        <select
          value={(value as string) ?? widget.default ?? widget.options?.[0] ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {widget.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    
    case 'toggle':
      return (
        <label className="toggle-widget">
          <input
            type="checkbox"
            checked={(value as boolean) ?? widget.default ?? false}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      );
    
    default:
      return null;
  }
}
