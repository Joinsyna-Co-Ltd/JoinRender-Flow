/**
 * 自定义节点编辑器
 * 
 * 允许用户创建和管理自定义节点：
 * - HTTP 请求节点
 * - JavaScript 代码节点
 * - 自定义 API 节点
 */

import React, { useState, useEffect } from 'react';
import {
  CustomNodeConfig,
  getCustomNodes,
  addCustomNode,
  removeCustomNode,
  customNodeTemplates,
  loadCustomNodes,
} from '../services/customNodes';
import type { PortType } from '../types';

interface CustomNodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onNodesChanged: () => void;
}

export const CustomNodeEditor: React.FC<CustomNodeEditorProps> = ({
  isOpen,
  onClose,
  onNodesChanged,
}) => {
  const [nodes, setNodes] = useState<CustomNodeConfig[]>([]);
  const [editingNode, setEditingNode] = useState<CustomNodeConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'templates'>('list');

  useEffect(() => {
    if (isOpen) {
      loadCustomNodes();
      setNodes(getCustomNodes());
    }
  }, [isOpen]);

  const handleSaveNode = () => {
    if (editingNode) {
      addCustomNode(editingNode);
      setNodes(getCustomNodes());
      setEditingNode(null);
      setActiveTab('list');
      onNodesChanged();
    }
  };

  const handleDeleteNode = (id: string) => {
    if (confirm('确定要删除这个自定义节点吗？')) {
      removeCustomNode(id);
      setNodes(getCustomNodes());
      onNodesChanged();
    }
  };

  const handleCreateFromTemplate = (template: CustomNodeConfig) => {
    const newNode: CustomNodeConfig = {
      ...template,
      id: `custom-${Date.now()}`,
      name: `${template.name} (副本)`,
    };
    setEditingNode(newNode);
    setActiveTab('edit');
  };

  const handleCreateNew = (nodeType: CustomNodeConfig['nodeType']) => {
    const newNode: CustomNodeConfig = {
      id: `custom-${Date.now()}`,
      name: '新节点',
      description: '',
      icon: '🔧',
      color: '#64748b',
      category: 'custom',
      nodeType,
      inputs: [{ name: '输入', type: 'any' as PortType }],
      outputs: [{ name: '输出', type: 'any' as PortType }],
      ...(nodeType === 'http' && {
        httpConfig: {
          method: 'GET' as const,
          url: '',
          headers: {},
          bodyTemplate: '',
          responseMapping: {},
          authentication: { type: 'none' as const },
        },
      }),
      ...(nodeType === 'code' && {
        codeConfig: {
          language: 'javascript' as const,
          code: '// 输入变量: 输入\nconst output = { result: 输入 };\nreturn output;',
        },
      }),
      ...(nodeType === 'custom-api' && {
        customApiConfig: {
          baseUrl: '',
          apiKeyField: '',
          endpoints: [{ name: '默认', path: '/api', method: 'POST' as const }],
        },
      }),
    };
    setEditingNode(newNode);
    setActiveTab('edit');
  };

  if (!isOpen) return null;

  return (
    <div className="custom-node-editor-overlay">
      <div className="custom-node-editor">
        <div className="editor-header">
          <h2>🔧 自定义节点管理</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="editor-tabs">
          <button
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            我的节点
          </button>
          <button
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            模板库
          </button>
          <button
            className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            disabled={!editingNode}
          >
            编辑节点
          </button>
        </div>

        <div className="editor-content">
          {activeTab === 'list' && (
            <div className="node-list">
              <div className="create-buttons">
                <button onClick={() => handleCreateNew('http')}>
                  🌐 新建 HTTP 节点
                </button>
                <button onClick={() => handleCreateNew('code')}>
                  📜 新建代码节点
                </button>
                <button onClick={() => handleCreateNew('custom-api')}>
                  🔌 新建 API 节点
                </button>
              </div>

              {nodes.length === 0 ? (
                <div className="empty-state">
                  <p>还没有自定义节点</p>
                  <p>点击上方按钮创建，或从模板库选择</p>
                </div>
              ) : (
                <div className="nodes-grid">
                  {nodes.map(node => (
                    <div key={node.id} className="node-card">
                      <div className="node-icon" style={{ backgroundColor: node.color }}>
                        {node.icon}
                      </div>
                      <div className="node-info">
                        <h4>{node.name}</h4>
                        <p>{node.description || '无描述'}</p>
                        <span className="node-type">{getNodeTypeLabel(node.nodeType)}</span>
                      </div>
                      <div className="node-actions">
                        <button onClick={() => { setEditingNode(node); setActiveTab('edit'); }}>
                          编辑
                        </button>
                        <button className="delete" onClick={() => handleDeleteNode(node.id)}>
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="templates-list">
              <p className="templates-intro">
                选择一个模板快速创建自定义节点，可以根据需要修改配置。
              </p>
              <div className="nodes-grid">
                {customNodeTemplates.map(template => (
                  <div key={template.id} className="node-card template">
                    <div className="node-icon" style={{ backgroundColor: template.color }}>
                      {template.icon}
                    </div>
                    <div className="node-info">
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                      <span className="node-type">{getNodeTypeLabel(template.nodeType)}</span>
                    </div>
                    <div className="node-actions">
                      <button onClick={() => handleCreateFromTemplate(template)}>
                        使用此模板
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'edit' && editingNode && (
            <div className="node-editor-form">
              <div className="form-section">
                <h3>基本信息</h3>
                <div className="form-row">
                  <label>名称</label>
                  <input
                    type="text"
                    value={editingNode.name}
                    onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>描述</label>
                  <input
                    type="text"
                    value={editingNode.description || ''}
                    onChange={e => setEditingNode({ ...editingNode, description: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>图标</label>
                  <input
                    type="text"
                    value={editingNode.icon || ''}
                    onChange={e => setEditingNode({ ...editingNode, icon: e.target.value })}
                    placeholder="输入 emoji"
                  />
                </div>
                <div className="form-row">
                  <label>颜色</label>
                  <input
                    type="color"
                    value={editingNode.color || '#64748b'}
                    onChange={e => setEditingNode({ ...editingNode, color: e.target.value })}
                  />
                </div>
              </div>

              {editingNode.nodeType === 'http' && editingNode.httpConfig && (
                <div className="form-section">
                  <h3>HTTP 配置</h3>
                  <div className="form-row">
                    <label>请求方法</label>
                    <select
                      value={editingNode.httpConfig.method}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        httpConfig: { ...editingNode.httpConfig!, method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' },
                      })}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>URL</label>
                    <input
                      type="text"
                      value={editingNode.httpConfig.url}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        httpConfig: { ...editingNode.httpConfig!, url: e.target.value },
                      })}
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>
                  <div className="form-row">
                    <label>请求头 (JSON)</label>
                    <textarea
                      value={JSON.stringify(editingNode.httpConfig.headers || {}, null, 2)}
                      onChange={e => {
                        try {
                          const headers = JSON.parse(e.target.value);
                          setEditingNode({
                            ...editingNode,
                            httpConfig: { ...editingNode.httpConfig!, headers },
                          });
                        } catch {
                          // 忽略无效 JSON
                        }
                      }}
                      placeholder='{"Authorization": "Bearer xxx"}'
                    />
                  </div>
                  <div className="form-row">
                    <label>请求体模板</label>
                    <textarea
                      value={editingNode.httpConfig.bodyTemplate || ''}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        httpConfig: { ...editingNode.httpConfig!, bodyTemplate: e.target.value },
                      })}
                      placeholder='{"prompt": "{{输入}}"}'
                    />
                  </div>
                  <div className="form-row">
                    <label>认证方式</label>
                    <select
                      value={editingNode.httpConfig.authentication?.type || 'none'}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        httpConfig: {
                          ...editingNode.httpConfig!,
                          authentication: { ...editingNode.httpConfig!.authentication, type: e.target.value as 'none' | 'bearer' | 'basic' | 'api-key' },
                        },
                      })}
                    >
                      <option value="none">无</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="api-key">API Key</option>
                      <option value="basic">Basic Auth</option>
                    </select>
                  </div>
                </div>
              )}

              {editingNode.nodeType === 'code' && editingNode.codeConfig && (
                <div className="form-section">
                  <h3>代码配置</h3>
                  <div className="form-row">
                    <label>JavaScript 代码</label>
                    <textarea
                      className="code-editor"
                      value={editingNode.codeConfig.code}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        codeConfig: { ...editingNode.codeConfig!, code: e.target.value },
                      })}
                      placeholder="// 输入变量: 输入&#10;const output = { result: 输入 };&#10;return output;"
                    />
                  </div>
                  <div className="code-help">
                    <p>可用变量：</p>
                    <ul>
                      {editingNode.inputs.map(input => (
                        <li key={input.name}><code>{input.name}</code></li>
                      ))}
                    </ul>
                    <p>返回值将作为输出传递给下游节点。</p>
                  </div>
                </div>
              )}

              {editingNode.nodeType === 'custom-api' && editingNode.customApiConfig && (
                <div className="form-section">
                  <h3>API 配置</h3>
                  <div className="form-row">
                    <label>Base URL</label>
                    <input
                      type="text"
                      value={editingNode.customApiConfig.baseUrl}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        customApiConfig: { ...editingNode.customApiConfig!, baseUrl: e.target.value },
                      })}
                      placeholder="https://api.example.com"
                    />
                  </div>
                  <div className="form-row">
                    <label>API Key 字段名</label>
                    <input
                      type="text"
                      value={editingNode.customApiConfig.apiKeyField || ''}
                      onChange={e => setEditingNode({
                        ...editingNode,
                        customApiConfig: { ...editingNode.customApiConfig!, apiKeyField: e.target.value },
                      })}
                      placeholder="my_api_key"
                    />
                  </div>
                </div>
              )}

              <div className="form-section">
                <h3>输入端口</h3>
                {editingNode.inputs.map((input, index) => (
                  <div key={index} className="port-row">
                    <input
                      type="text"
                      value={input.name}
                      onChange={e => {
                        const newInputs = [...editingNode.inputs];
                        newInputs[index] = { ...input, name: e.target.value };
                        setEditingNode({ ...editingNode, inputs: newInputs });
                      }}
                      placeholder="端口名称"
                    />
                    <select
                      value={input.type}
                      onChange={e => {
                        const newInputs = [...editingNode.inputs];
                        newInputs[index] = { ...input, type: e.target.value as PortType };
                        setEditingNode({ ...editingNode, inputs: newInputs });
                      }}
                    >
                      <option value="any">任意</option>
                      <option value="text">文本</option>
                      <option value="image">图像</option>
                      <option value="video">视频</option>
                      <option value="audio">音频</option>
                    </select>
                    <button
                      className="remove-btn"
                      onClick={() => {
                        const newInputs = editingNode.inputs.filter((_, i) => i !== index);
                        setEditingNode({ ...editingNode, inputs: newInputs });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="add-port-btn"
                  onClick={() => {
                    setEditingNode({
                      ...editingNode,
                      inputs: [...editingNode.inputs, { name: `输入${editingNode.inputs.length + 1}`, type: 'any' }],
                    });
                  }}
                >
                  + 添加输入
                </button>
              </div>

              <div className="form-section">
                <h3>输出端口</h3>
                {editingNode.outputs.map((output, index) => (
                  <div key={index} className="port-row">
                    <input
                      type="text"
                      value={output.name}
                      onChange={e => {
                        const newOutputs = [...editingNode.outputs];
                        newOutputs[index] = { ...output, name: e.target.value };
                        setEditingNode({ ...editingNode, outputs: newOutputs });
                      }}
                      placeholder="端口名称"
                    />
                    <select
                      value={output.type}
                      onChange={e => {
                        const newOutputs = [...editingNode.outputs];
                        newOutputs[index] = { ...output, type: e.target.value as PortType };
                        setEditingNode({ ...editingNode, outputs: newOutputs });
                      }}
                    >
                      <option value="any">任意</option>
                      <option value="text">文本</option>
                      <option value="image">图像</option>
                      <option value="video">视频</option>
                      <option value="audio">音频</option>
                    </select>
                    <button
                      className="remove-btn"
                      onClick={() => {
                        const newOutputs = editingNode.outputs.filter((_, i) => i !== index);
                        setEditingNode({ ...editingNode, outputs: newOutputs });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="add-port-btn"
                  onClick={() => {
                    setEditingNode({
                      ...editingNode,
                      outputs: [...editingNode.outputs, { name: `输出${editingNode.outputs.length + 1}`, type: 'any' }],
                    });
                  }}
                >
                  + 添加输出
                </button>
              </div>

              <div className="form-actions">
                <button className="cancel-btn" onClick={() => { setEditingNode(null); setActiveTab('list'); }}>
                  取消
                </button>
                <button className="save-btn" onClick={handleSaveNode}>
                  保存节点
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getNodeTypeLabel(type: CustomNodeConfig['nodeType']): string {
  switch (type) {
    case 'http': return 'HTTP 请求';
    case 'webhook': return 'Webhook';
    case 'code': return 'JavaScript';
    case 'custom-api': return '自定义 API';
    default: return type;
  }
}
