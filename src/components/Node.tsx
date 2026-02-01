import React, { useCallback, useRef } from 'react';
import type { NodeInstance, Port, NodeDefinition } from '../types';
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
    nodeOutputs,
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
        {renderNodeContent(node, definition, handleDataChange, nodeOutputs.get(node.id))}
        
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
  definition: NodeDefinition | undefined,
  onChange: (key: string, value: unknown) => void,
  outputs?: Record<string, unknown>
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
          {outputs?.['输出文本'] && (
            <div className="output-result">
              <div className="field-label">输出结果</div>
              <div className="result-text">{String(outputs['输出文本']).slice(0, 200)}...</div>
            </div>
          )}
        </div>
      );
    
    case 'image-upload':
      return (
        <div className="node-content">
          {node.data.imageUrl ? (
            <div className="preview-image-container">
              <img src={node.data.imageUrl as string} alt="上传的图像" className="preview-image" />
            </div>
          ) : (
            <div 
              className="upload-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onChange('imageUrl', ev.target?.result);
                    onChange('fileName', file.name);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      onChange('imageUrl', ev.target?.result);
                      onChange('fileName', file.name);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            >
              <span className="upload-icon">📁</span>
              <span className="upload-text">点击或拖放图像到此处</span>
            </div>
          )}
        </div>
      );
    
    case 'video-upload':
      return (
        <div className="node-content">
          {node.data.videoUrl ? (
            <div className="preview-video-container">
              <video src={node.data.videoUrl as string} controls className="preview-video" />
            </div>
          ) : (
            <div 
              className="upload-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('video/')) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onChange('videoUrl', ev.target?.result);
                    onChange('fileName', file.name);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      onChange('videoUrl', ev.target?.result);
                      onChange('fileName', file.name);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            >
              <span className="upload-icon">📁</span>
              <span className="upload-text">点击或拖放视频到此处</span>
            </div>
          )}
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
          {outputs?.['参考图像'] && (
            <div className="preview-image-container">
              <img src={outputs['参考图像'] as string} alt="生成的参考图" className="preview-image" />
            </div>
          )}
        </div>
      );
    
    case 'image-gen':
    case 'advanced-image-gen':
    case 'gen4-text-to-image':
    case 'flash-image':
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
          {outputs?.['图像'] && (
            <div className="preview-image-container">
              <img src={outputs['图像'] as string} alt="生成的图像" className="preview-image" />
            </div>
          )}
        </div>
      );
    
    case 'video-gen':
    case 'frame-interpolation':
    case 'gen4-image-to-video':
    case 'gen45-image-to-video':
    case 'gen45-text-to-video':
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
          {(node.type === 'video-gen' || node.type === 'gen4-image-to-video') && (
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
          {outputs?.['视频'] && (
            <div className="preview-video-container">
              <video src={outputs['视频'] as string} controls className="preview-video" />
            </div>
          )}
        </div>
      );
    
    case 'image-output': {
      const imageResult = outputs?.result as string;
      return (
        <div className="node-content">
          {imageResult ? (
            <div className="preview-image-container">
              <img src={imageResult} alt="输出图像" className="preview-image" />
              <button 
                className="download-btn"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = imageResult;
                  a.download = `output-${Date.now()}.png`;
                  a.click();
                }}
              >
                下载
              </button>
            </div>
          ) : (
            <div className="output-preview">
              <span className="preview-placeholder">🖼️</span>
              <span className="preview-text">运行后显示输出</span>
            </div>
          )}
        </div>
      );
    }
    
    case 'video-output': {
      const videoResult = outputs?.result as string;
      return (
        <div className="node-content">
          {videoResult ? (
            <div className="preview-video-container">
              <video src={videoResult} controls className="preview-video" />
              <button 
                className="download-btn"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = videoResult;
                  a.download = `output-${Date.now()}.mp4`;
                  a.click();
                }}
              >
                下载
              </button>
            </div>
          ) : (
            <div className="output-preview">
              <span className="preview-placeholder">🎬</span>
              <span className="preview-text">运行后显示输出</span>
            </div>
          )}
        </div>
      );
    }
    
    case 'storyboard-output': {
      const storyboardResult = outputs?.result as { shot1?: string; shot2?: string; shot3?: string };
      return (
        <div className="node-content">
          {storyboardResult?.shot1 || storyboardResult?.shot2 || storyboardResult?.shot3 ? (
            <div className="storyboard-preview with-images">
              {storyboardResult.shot1 && <img src={storyboardResult.shot1} alt="镜头1" className="storyboard-image" />}
              {storyboardResult.shot2 && <img src={storyboardResult.shot2} alt="镜头2" className="storyboard-image" />}
              {storyboardResult.shot3 && <img src={storyboardResult.shot3} alt="镜头3" className="storyboard-image" />}
            </div>
          ) : (
            <div className="storyboard-preview">
              <div className="storyboard-frame">1</div>
              <div className="storyboard-frame">2</div>
              <div className="storyboard-frame">3</div>
            </div>
          )}
        </div>
      );
    }
    
    case 'prompt-enhancer':
      return (
        <div className="node-content">
          <div className="field-group">
            <label>风格</label>
            <select
              value={(node.data.style as string) || 'cinematic'}
              onChange={(e) => onChange('style', e.target.value)}
            >
              <option value="cinematic">电影级</option>
              <option value="anime">动漫</option>
              <option value="realistic">写实</option>
              <option value="artistic">艺术</option>
            </select>
          </div>
          {outputs?.['增强提示词'] && (
            <div className="output-result">
              <div className="field-label">增强结果</div>
              <div className="result-text">{String(outputs['增强提示词']).slice(0, 150)}...</div>
            </div>
          )}
        </div>
      );
    
    case 'image-analyzer':
      return (
        <div className="node-content">
          {outputs?.['描述'] && (
            <div className="output-result">
              <div className="field-label">分析结果</div>
              <div className="result-text">{String(outputs['描述']).slice(0, 150)}...</div>
            </div>
          )}
        </div>
      );
    
    case 'json-splitter':
      return (
        <div className="node-content">
          {(outputs?.['提示词 1'] || outputs?.['提示词 2'] || outputs?.['提示词 3']) && (
            <div className="output-result">
              <div className="field-label">分离结果</div>
              <div className="result-text" style={{ fontSize: 10 }}>
                {outputs['提示词 1'] && <div>1: {String(outputs['提示词 1']).slice(0, 50)}...</div>}
                {outputs['提示词 2'] && <div>2: {String(outputs['提示词 2']).slice(0, 50)}...</div>}
                {outputs['提示词 3'] && <div>3: {String(outputs['提示词 3']).slice(0, 50)}...</div>}
              </div>
            </div>
          )}
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
