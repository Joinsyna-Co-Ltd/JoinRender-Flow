import React, { useState, useEffect } from 'react';

interface SettingsPanelProps {
  onClose: () => void;
}

interface APIKeyConfig {
  [key: string]: {
    apiKey?: string;
    baseUrl?: string;
  };
}

// API 服务分类配置
const apiCategories = [
  {
    id: 'llm',
    name: '文本模型 (LLM)',
    icon: '💬',
    services: [
      { id: 'openai', name: 'OpenAI', placeholder: 'sk-...', hint: 'GPT-4, DALL-E, Whisper, TTS', hasBaseUrl: true },
      { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', hint: 'Claude 系列' },
      { id: 'google', name: 'Google', placeholder: 'AIza...', hint: 'Gemini 系列' },
      { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...', hint: '深度求索' },
      { id: 'moonshot', name: 'Moonshot', placeholder: 'sk-...', hint: 'Kimi' },
      { id: 'zhipu', name: '智谱 AI', placeholder: 'xxx.xxx', hint: 'GLM 系列' },
      { id: 'qwen', name: '通义千问', placeholder: 'sk-...', hint: '阿里云' },
      { id: 'minimax', name: 'MiniMax', placeholder: '', hint: '海螺 AI' },
    ],
  },
  {
    id: 'image',
    name: '图像生成',
    icon: '🎨',
    services: [
      { id: 'stability', name: 'Stability AI', placeholder: 'sk-...', hint: 'Stable Diffusion' },
      { id: 'midjourney', name: 'Midjourney', placeholder: '', hint: '需要代理 API', hasBaseUrl: true },
      { id: 'ideogram', name: 'Ideogram', placeholder: '', hint: '擅长文字生成' },
      { id: 'leonardo', name: 'Leonardo AI', placeholder: '', hint: '' },
    ],
  },
  {
    id: 'video',
    name: '视频生成',
    icon: '🎬',
    services: [
      { id: 'runway', name: 'Runway', placeholder: '', hint: 'Gen-3, Gen-4' },
      { id: 'pika', name: 'Pika Labs', placeholder: '', hint: '' },
      { id: 'kling', name: '可灵 AI', placeholder: '', hint: '快手' },
      { id: 'luma', name: 'Luma', placeholder: '', hint: 'Dream Machine' },
      { id: 'minimax_video', name: 'MiniMax 视频', placeholder: '', hint: '海螺视频' },
    ],
  },
  {
    id: 'audio',
    name: '音频处理',
    icon: '🎵',
    services: [
      { id: 'elevenlabs', name: 'ElevenLabs', placeholder: '', hint: '语音合成' },
      { id: 'fish_audio', name: 'Fish Audio', placeholder: '', hint: '语音合成' },
    ],
  },
  {
    id: 'music',
    name: '音乐生成',
    icon: '🎼',
    services: [
      { id: 'suno', name: 'Suno', placeholder: '', hint: 'AI 音乐' },
      { id: 'udio', name: 'Udio', placeholder: '', hint: 'AI 音乐' },
    ],
  },
  {
    id: '3d',
    name: '3D 模型',
    icon: '📦',
    services: [
      { id: 'meshy', name: 'Meshy', placeholder: '', hint: '文本/图像转 3D' },
      { id: 'tripo', name: 'Tripo AI', placeholder: '', hint: '图像转 3D' },
      { id: 'rodin', name: 'Rodin', placeholder: '', hint: 'Hyper3D' },
      { id: 'csm', name: 'CSM AI', placeholder: '', hint: '' },
      { id: 'luma_genie', name: 'Luma Genie', placeholder: '', hint: '3D 生成' },
    ],
  },
  {
    id: 'general',
    name: '通用平台',
    icon: '🔌',
    services: [
      { id: 'replicate', name: 'Replicate', placeholder: 'r8_...', hint: '各类开源模型' },
    ],
  },
  {
    id: 'local',
    name: '本地服务',
    icon: '💻',
    services: [
      { id: 'ollama', name: 'Ollama', placeholder: '', hint: '本地 LLM', hasBaseUrl: true, baseUrlOnly: true, defaultBaseUrl: 'http://localhost:11434/api/generate' },
      { id: 'comfyui', name: 'ComfyUI', placeholder: '', hint: '本地图像生成', hasBaseUrl: true, baseUrlOnly: true, defaultBaseUrl: 'http://localhost:8188' },
      { id: 'sdwebui', name: 'SD WebUI', placeholder: '', hint: 'Stable Diffusion WebUI', hasBaseUrl: true, baseUrlOnly: true, defaultBaseUrl: 'http://127.0.0.1:7860' },
    ],
  },
];

const STORAGE_KEY = 'joinrender-api-keys';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<APIKeyConfig>({});
  const [activeCategory, setActiveCategory] = useState('llm');
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  // 加载配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('加载 API 配置失败:', e);
    }
  }, []);

  // 保存配置
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // 同时保存到 v2 格式供 api.ts 使用
      localStorage.setItem('joinrender-api-config-v2', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('保存配置失败:', e);
    }
  };

  // 更新单个服务配置
  const updateServiceConfig = (serviceId: string, field: 'apiKey' | 'baseUrl', value: string) => {
    setConfig(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      },
    }));
  };

  // 切换显示/隐藏密钥
  const toggleShowKey = (serviceId: string) => {
    setShowKeys(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const activeServices = apiCategories.find(c => c.id === activeCategory)?.services || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-panel-new" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="settings-header">
          <div className="settings-title">
            <span className="settings-icon">⚙️</span>
            <h2>API 设置</h2>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          {/* 左侧分类导航 */}
          <div className="settings-nav">
            {apiCategories.map(category => (
              <button
                key={category.id}
                className={`nav-item ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="nav-icon">{category.icon}</span>
                <span className="nav-name">{category.name}</span>
                <span className="nav-count">
                  {category.services.filter(s => config[s.id]?.apiKey || config[s.id]?.baseUrl).length}/{category.services.length}
                </span>
              </button>
            ))}
          </div>

          {/* 右侧配置区域 */}
          <div className="settings-content">
            <div className="settings-content-header">
              <h3>{apiCategories.find(c => c.id === activeCategory)?.name}</h3>
              <p className="settings-content-hint">
                填入 API Key 后即可使用对应服务，留空则跳过
              </p>
            </div>

            <div className="settings-services">
              {activeServices.map(service => (
                <div key={service.id} className="service-item">
                  <div className="service-header">
                    <div className="service-info">
                      <span className="service-name">{service.name}</span>
                      {service.hint && <span className="service-hint">{service.hint}</span>}
                    </div>
                    {config[service.id]?.apiKey && (
                      <span className="service-status configured">已配置</span>
                    )}
                  </div>

                  <div className="service-fields">
                    {!service.baseUrlOnly && (
                      <div className="field-row">
                        <label>API Key</label>
                        <div className="field-input-wrapper">
                          <input
                            type={showKeys.has(service.id) ? 'text' : 'password'}
                            value={config[service.id]?.apiKey || ''}
                            onChange={e => updateServiceConfig(service.id, 'apiKey', e.target.value)}
                            placeholder={service.placeholder || '输入 API Key'}
                          />
                          <button
                            className="toggle-visibility"
                            onClick={() => toggleShowKey(service.id)}
                            title={showKeys.has(service.id) ? '隐藏' : '显示'}
                          >
                            {showKeys.has(service.id) ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </div>
                    )}

                    {service.hasBaseUrl && (
                      <div className="field-row">
                        <label>Base URL {!service.baseUrlOnly && '(可选)'}</label>
                        <input
                          type="text"
                          value={config[service.id]?.baseUrl || ''}
                          onChange={e => updateServiceConfig(service.id, 'baseUrl', e.target.value)}
                          placeholder={service.defaultBaseUrl || '自定义 API 地址'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="settings-footer">
          <div className="footer-info">
            <span className="info-icon">💡</span>
            <span>配置保存在浏览器本地，也可以编辑 <code>public/api.config.json</code> 文件</span>
          </div>
          <div className="footer-actions">
            {saved && <span className="save-success">✓ 已保存</span>}
            <button className="btn-secondary" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={handleSave}>保存设置</button>
          </div>
        </div>
      </div>
    </div>
  );
};
