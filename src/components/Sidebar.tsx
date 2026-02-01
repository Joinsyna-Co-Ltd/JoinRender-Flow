import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getNodeDefinitions, categoryLabels, categoryColors, categoryDescriptions, getAllCategories } from '../nodes/definitions';
import { PluginManager } from '../plugins';
import type { NodeDefinition, NodeCategory } from '../types';

interface SidebarProps {
  onOpenTemplatePanel: () => void;
  onOpenPluginPanel: () => void;
  onOpenSettingsPanel: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

// 默认类别顺序
const defaultCategories: NodeCategory[] = ['input', 'llm', 'media', 'output'];

export const Sidebar: React.FC<SidebarProps> = ({ 
  onOpenTemplatePanel, 
  onOpenPluginPanel,
  onOpenSettingsPanel,
  width,
  onWidthChange,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(defaultCategories)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'builtin' | 'comfyui'>('builtin');
  const [, forceUpdate] = useState({});
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // 监听插件变化
  useEffect(() => {
    const unsubscribe = PluginManager.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  // 拖拽调整宽度
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
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
  
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);
  
  const handleDragStart = useCallback((e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('nodeType', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);
  
  // 获取所有节点
  const allNodes = getNodeDefinitions();
  
  // 根据标签页过滤
  const tabFilteredNodes = activeTab === 'builtin'
    ? allNodes.filter(n => !n.isCustom)
    : allNodes.filter(n => n.isCustom);
  
  // 搜索过滤
  const filteredNodes = searchQuery
    ? tabFilteredNodes.filter(node => 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tabFilteredNodes;
  
  // 获取当前显示的类别
  const categories = activeTab === 'builtin'
    ? defaultCategories
    : getAllCategories().filter(c => !defaultCategories.includes(c as NodeCategory));
  
  const nodesByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredNodes.filter(n => n.category === category);
    return acc;
  }, {} as Record<string, NodeDefinition[]>);
  
  // 计算 ComfyUI 节点数量
  const comfyNodeCount = allNodes.filter(n => n.isCustom).length;
  
  return (
    <div 
      ref={sidebarRef}
      className={`sidebar ${isResizing ? 'resizing' : ''}`} 
      style={{ width }}
    >
      <div className="sidebar-header">
        <h1>
          <span className="logo-gradient">JoinRender Flow</span>
        </h1>
        <p className="sidebar-subtitle">可视化节点编辑器</p>
      </div>

      {/* 搜索框 */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="搜索节点..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>

      {/* 标签页 */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'builtin' ? 'active' : ''}`}
          onClick={() => setActiveTab('builtin')}
        >
          内置节点
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'comfyui' ? 'active' : ''}`}
          onClick={() => setActiveTab('comfyui')}
        >
          ComfyUI ({comfyNodeCount})
        </button>
      </div>
      
      <div className="sidebar-content">
        {categories.map(category => {
          const nodes = nodesByCategory[category];
          if (!nodes || nodes.length === 0) return null;
          
          return (
            <div key={category} className="node-category">
              <div
                className="category-header"
                onClick={() => toggleCategory(category)}
              >
                <div
                  className="category-dot"
                  style={{ background: categoryColors[category] || '#64748b' }}
                />
                <div className="category-info">
                  <span className="category-name">
                    {categoryLabels[category] || category}
                  </span>
                  <span className="category-desc">
                    {categoryDescriptions[category] || ''}
                  </span>
                </div>
                <span className="category-count">{nodes.length}</span>
                <span className="category-toggle">
                  {expandedCategories.has(category) ? '−' : '+'}
                </span>
              </div>
              
              {expandedCategories.has(category) && (
                <div className="category-nodes">
                  {nodes.map(node => (
                    <div
                      key={node.type}
                      className="node-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.type)}
                      title={node.description}
                    >
                      <div
                        className="node-item-icon"
                        style={{ background: `${node.color}15`, color: node.color }}
                      >
                        {node.icon}
                      </div>
                      <div className="node-item-info">
                        <div className="node-item-name">{node.name}</div>
                        {node.isCustom && (
                          <div className="node-item-badge comfy">ComfyUI</div>
                        )}
                        {node.inputs.some(i => i.isReferenceInput) && (
                          <div className="node-item-badge ref">参考锁定</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {filteredNodes.length === 0 && (
          <div className="empty-state small">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">未找到节点</div>
            <div className="empty-state-desc">
              {activeTab === 'comfyui' && comfyNodeCount === 0
                ? '请先在插件管理中启用 ComfyUI 插件'
                : '尝试其他搜索关键词'}
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="sidebar-footer">
        <button className="footer-btn template" onClick={onOpenTemplatePanel}>
          <span>📋</span>
          <span>模板</span>
        </button>
        <button className="footer-btn plugin" onClick={onOpenPluginPanel}>
          <span>🧩</span>
          <span>插件</span>
        </button>
        <button className="footer-btn settings" onClick={onOpenSettingsPanel}>
          <span>⚙️</span>
          <span>设置</span>
        </button>
      </div>

      {/* 拖拽调整宽度的手柄 */}
      <div 
        className="sidebar-resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};
