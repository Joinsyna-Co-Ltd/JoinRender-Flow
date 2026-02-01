import React, { useState, useEffect, useRef } from 'react';
import { PluginManager, builtinPlugins } from '../plugins';
import type { Plugin } from '../types';

interface PluginPanelProps {
  onClose: () => void;
}

export const PluginPanel: React.FC<PluginPanelProps> = ({ onClose }) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [activeTab, setActiveTab] = useState<'installed' | 'import'>('installed');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // 初始化内置插件（只执行一次）
    if (!initialized.current) {
      const existingPlugins = PluginManager.getPlugins();
      if (existingPlugins.length === 0) {
        builtinPlugins.forEach(plugin => {
          PluginManager.registerPlugin(plugin);
        });
      }
      initialized.current = true;
    }
    
    setPlugins(PluginManager.getPlugins());
    
    const unsubscribe = PluginManager.subscribe(() => {
      setPlugins(PluginManager.getPlugins());
    });
    
    return unsubscribe;
  }, []);

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    PluginManager.togglePlugin(pluginId, enabled);
  };

  const handleUninstallPlugin = (pluginId: string) => {
    if (window.confirm('确定要卸载此插件吗？')) {
      PluginManager.unregisterPlugin(pluginId);
    }
  };

  const handleImportFromText = () => {
    setImportError('');
    
    if (!importText.trim()) {
      setImportError('请输入插件 JSON');
      return;
    }
    
    const plugin = PluginManager.loadPluginFromJSON(importText);
    if (plugin) {
      setImportText('');
      setActiveTab('installed');
    } else {
      setImportError('无效的插件格式');
    }
  };

  const handleImportFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const plugin = PluginManager.loadPluginFromJSON(text);
      if (plugin) {
        setActiveTab('installed');
      } else {
        setImportError('无效的插件文件');
      }
    };
    reader.readAsText(file);
    
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isBuiltinPlugin = (pluginId: string) => {
    return builtinPlugins.some(p => p.id === pluginId);
  };

  return (
    <div className="plugin-panel-overlay" onClick={onClose}>
      <div className="plugin-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>插件管理</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="panel-tabs">
          <button
            className={`tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
            onClick={() => setActiveTab('installed')}
          >
            已安装 ({plugins.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            导入插件
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'installed' ? (
            <div className="plugin-list">
              {plugins.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <div className="empty-state-title">暂无插件</div>
                  <div className="empty-state-desc">
                    导入 ComfyUI 插件以扩展节点功能
                  </div>
                </div>
              ) : (
                plugins.map(plugin => (
                  <div key={plugin.id} className="plugin-item">
                    <div className="plugin-info">
                      <div className="plugin-header">
                        <span className="plugin-name">{plugin.name}</span>
                        {isBuiltinPlugin(plugin.id) && (
                          <span className="plugin-badge builtin">内置</span>
                        )}
                      </div>
                      <div className="plugin-meta">
                        <span>v{plugin.version}</span>
                        {plugin.author && <span>• {plugin.author}</span>}
                        <span>• {plugin.nodes.length} 个节点</span>
                      </div>
                      {plugin.description && (
                        <div className="plugin-desc">{plugin.description}</div>
                      )}
                    </div>
                    <div className="plugin-actions">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={plugin.enabled}
                          onChange={(e) => handleTogglePlugin(plugin.id, e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      {!isBuiltinPlugin(plugin.id) && (
                        <button
                          className="uninstall-btn"
                          onClick={() => handleUninstallPlugin(plugin.id)}
                          title="卸载"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="import-section">
              <div className="import-intro">
                <h3>导入 ComfyUI 插件</h3>
                <p>
                  支持导入 ComfyUI 节点定义 JSON 文件。
                  你可以从 ComfyUI 的 custom_nodes 目录中获取节点定义。
                </p>
              </div>

              <div className="import-methods">
                <div className="import-method">
                  <h4>从文件导入</h4>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFromFile}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="import-file-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📂 选择 JSON 文件
                  </button>
                </div>

                <div className="import-divider">
                  <span>或</span>
                </div>

                <div className="import-method">
                  <h4>粘贴 JSON</h4>
                  <textarea
                    placeholder='{"id": "my-plugin", "name": "我的插件", "nodes": [...]}'
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={8}
                  />
                  <button
                    className="import-text-btn"
                    onClick={handleImportFromText}
                    disabled={!importText.trim()}
                  >
                    导入
                  </button>
                </div>
              </div>

              {importError && (
                <div className="import-error">{importError}</div>
              )}

              <div className="import-example">
                <h4>示例格式</h4>
                <pre>{`{
  "id": "my-custom-nodes",
  "name": "我的自定义节点",
  "version": "1.0.0",
  "nodes": [
    {
      "name": "MyNode",
      "display_name": "我的节点",
      "category": "custom",
      "input": {
        "required": {
          "image": ["IMAGE"],
          "strength": ["FLOAT", {"default": 1.0}]
        }
      },
      "output": ["IMAGE"],
      "output_name": ["图像"]
    }
  ]
}`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
