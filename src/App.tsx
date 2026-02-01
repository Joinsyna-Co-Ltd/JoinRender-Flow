import React, { useState, useEffect } from 'react';
import { 
  Canvas, 
  Sidebar, 
  Toolbar, 
  ZoomControls, 
  PropertiesPanel,
  TemplatePanel,
  PluginPanel,
  SettingsPanel,
} from './components';
import { PluginManager, builtinPlugins } from './plugins';
import { initAPIConfig } from './services/api';

export const App: React.FC = () => {
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  // 侧边栏宽度
  const [sidebarWidth, setSidebarWidth] = useState(260);
  // 属性面板宽度
  const [propertiesWidth, setPropertiesWidth] = useState(260);
  // 工具栏位置（初始居中）
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 16 });
  
  // 初始化工具栏位置（居中）
  useEffect(() => {
    const updateToolbarPosition = () => {
      const toolbarWidth = 340; // 估算工具栏宽度
      setToolbarPosition(prev => ({
        x: prev.x === 0 ? (window.innerWidth - sidebarWidth - propertiesWidth - toolbarWidth) / 2 + sidebarWidth : prev.x,
        y: prev.y,
      }));
    };
    
    updateToolbarPosition();
    window.addEventListener('resize', updateToolbarPosition);
    return () => window.removeEventListener('resize', updateToolbarPosition);
  }, [sidebarWidth, propertiesWidth]);

  // 初始化内置插件
  useEffect(() => {
    const existingPlugins = PluginManager.getPlugins();
    if (existingPlugins.length === 0) {
      builtinPlugins.forEach(plugin => {
        PluginManager.registerPlugin(plugin);
      });
    }
  }, []);

  // 初始化 API 配置
  useEffect(() => {
    initAPIConfig();
  }, []);

  return (
    <div className="app-container">
      <Sidebar 
        onOpenTemplatePanel={() => setShowTemplatePanel(true)} 
        onOpenPluginPanel={() => setShowPluginPanel(true)}
        onOpenSettingsPanel={() => setShowSettingsPanel(true)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      <Canvas />
      <Toolbar 
        position={toolbarPosition}
        onPositionChange={setToolbarPosition}
      />
      <ZoomControls />
      <PropertiesPanel 
        width={propertiesWidth}
        onWidthChange={setPropertiesWidth}
      />
      
      {showTemplatePanel && (
        <TemplatePanel onClose={() => setShowTemplatePanel(false)} />
      )}
      
      {showPluginPanel && (
        <PluginPanel onClose={() => setShowPluginPanel(false)} />
      )}
      
      {showSettingsPanel && (
        <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
      )}
    </div>
  );
};
