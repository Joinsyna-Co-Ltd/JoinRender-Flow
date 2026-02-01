import React, { useState, useEffect } from 'react';
import { getAPIConfig, saveAPIConfig, type APIConfig } from '../services/api';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<APIConfig>({ provider: 'mock' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(getAPIConfig());
  }, []);

  const handleSave = () => {
    saveAPIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>API 设置</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <label>API 提供商</label>
            <select
              value={config.provider}
              onChange={e => setConfig({ ...config, provider: e.target.value as APIConfig['provider'] })}
            >
              <option value="mock">模拟模式（无需 API）</option>
              <option value="openai">OpenAI</option>
              <option value="replicate">Replicate</option>
              <option value="local">本地模型（Ollama）</option>
            </select>
            <p className="settings-hint">
              {config.provider === 'mock' && '模拟模式下会返回占位结果，用于测试工作流'}
              {config.provider === 'openai' && '使用 OpenAI API 进行 LLM 处理和图像分析'}
              {config.provider === 'replicate' && '使用 Replicate API 进行图像和视频生成'}
              {config.provider === 'local' && '连接本地运行的 Ollama 服务'}
            </p>
          </div>

          {config.provider === 'openai' && (
            <>
              <div className="settings-section">
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
              <div className="settings-section">
                <label>API Base URL（可选）</label>
                <input
                  type="text"
                  value={config.baseUrl || ''}
                  onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
                <p className="settings-hint">留空使用默认地址，或填写代理地址</p>
              </div>
            </>
          )}

          {config.provider === 'replicate' && (
            <div className="settings-section">
              <label>Replicate API Token</label>
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="r8_..."
              />
              <p className="settings-hint">
                从 <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer">replicate.com</a> 获取
              </p>
            </div>
          )}

          {config.provider === 'local' && (
            <div className="settings-section">
              <label>Ollama 地址</label>
              <input
                type="text"
                value={config.baseUrl || ''}
                onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="http://localhost:11434/api/generate"
              />
              <p className="settings-hint">确保 Ollama 服务正在运行</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {saved && <span className="save-success">已保存</span>}
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>保存设置</button>
        </div>
      </div>
    </div>
  );
};
