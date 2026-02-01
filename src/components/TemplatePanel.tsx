import React from 'react';
import { useWorkflowStore } from '../store';
import { workflowTemplates } from '../templates';
import type { WorkflowTemplate } from '../types';

interface TemplatePanelProps {
  onClose: () => void;
}

export const TemplatePanel: React.FC<TemplatePanelProps> = ({ onClose }) => {
  const { loadWorkflow } = useWorkflowStore();

  const handleLoadTemplate = (template: WorkflowTemplate) => {
    loadWorkflow(template.nodes, template.connections);
    onClose();
  };

  return (
    <div className="template-panel-overlay" onClick={onClose}>
      <div className="template-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>工作流模板</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="panel-content">
          <p className="template-intro">
            选择一个模板快速开始。这些模板展示了节点编辑器的最佳实践。
          </p>

          <div className="template-list">
            {workflowTemplates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="template-icon">
                  {template.icon}
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <div className="template-meta">
                    <span>{template.nodes.length} 个节点</span>
                    <span>•</span>
                    <span>{template.connections.length} 个连接</span>
                  </div>
                </div>
                <button 
                  className="template-load-btn"
                  onClick={() => handleLoadTemplate(template)}
                >
                  使用模板
                </button>
              </div>
            ))}
          </div>

          <div className="template-tips">
            <h4>💡 核心概念：参考图像锁定</h4>
            <p>
              角色一致性的秘诀是 <strong>参考图像</strong> 输入。
              确保所有图像生成和视频生成节点的参考图像输入都连接到同一个角色参考节点。
              这是保持人脸一致的"物理定律"！
            </p>
            
            <div className="workflow-diagram">
              <div className="diagram-step">
                <span className="step-num">1</span>
                <span>文本输入</span>
              </div>
              <span className="diagram-arrow">→</span>
              <div className="diagram-step">
                <span className="step-num">2</span>
                <span>LLM</span>
              </div>
              <span className="diagram-arrow">→</span>
              <div className="diagram-step highlight">
                <span className="step-num">3</span>
                <span>角色参考</span>
              </div>
              <span className="diagram-arrow">→</span>
              <div className="diagram-step">
                <span className="step-num">4</span>
                <span>图像生成</span>
              </div>
              <span className="diagram-arrow">→</span>
              <div className="diagram-step">
                <span className="step-num">5</span>
                <span>视频生成</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
