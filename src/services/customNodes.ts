/**
 * 自定义节点系统
 * 
 * 支持用户创建自己的节点类型：
 * - HTTP Request 节点：调用任意外部 API
 * - Webhook 节点：接收外部数据
 * - JavaScript 代码节点：自定义处理逻辑
 * - 自定义 API 节点：封装常用 API 调用
 */

import type { NodeDefinition, PortType } from '../types';

// ============================================
// 自定义节点配置类型
// ============================================

export interface CustomNodeConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  
  // 输入输出定义
  inputs: Array<{
    name: string;
    type: PortType;
    required?: boolean;
    default?: unknown;
  }>;
  outputs: Array<{
    name: string;
    type: PortType;
  }>;
  
  // 节点类型
  nodeType: 'http' | 'webhook' | 'code' | 'custom-api';
  
  // HTTP 请求配置
  httpConfig?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
    responseMapping?: Record<string, string>;
    authentication?: {
      type: 'none' | 'bearer' | 'basic' | 'api-key';
      tokenField?: string;
      headerName?: string;
    };
  };
  
  // Webhook 配置
  webhookConfig?: {
    path: string;
    method: 'GET' | 'POST';
    responseTemplate?: string;
  };
  
  // 代码配置
  codeConfig?: {
    language: 'javascript';
    code: string;
  };
  
  // 自定义 API 配置
  customApiConfig?: {
    baseUrl: string;
    apiKeyField?: string;
    endpoints: Array<{
      name: string;
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      bodyTemplate?: string;
    }>;
  };
}

// ============================================
// 自定义节点存储
// ============================================

const STORAGE_KEY = 'joinrender-custom-nodes';

let customNodes: CustomNodeConfig[] = [];

export function loadCustomNodes(): CustomNodeConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      customNodes = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('加载自定义节点失败:', e);
  }
  return customNodes;
}

export function saveCustomNodes(nodes: CustomNodeConfig[]): void {
  customNodes = nodes;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
}

export function addCustomNode(config: CustomNodeConfig): void {
  const existing = customNodes.findIndex(n => n.id === config.id);
  if (existing >= 0) {
    customNodes[existing] = config;
  } else {
    customNodes.push(config);
  }
  saveCustomNodes(customNodes);
}

export function removeCustomNode(id: string): void {
  customNodes = customNodes.filter(n => n.id !== id);
  saveCustomNodes(customNodes);
}

export function getCustomNodes(): CustomNodeConfig[] {
  return customNodes;
}

// ============================================
// 转换为节点定义
// ============================================

export function customNodeToDefinition(config: CustomNodeConfig): NodeDefinition {
  return {
    type: `custom-${config.id}`,
    name: config.name,
    category: (config.category as NodeDefinition['category']) || 'custom',
    color: config.color || '#64748b',
    icon: config.icon || '🔧',
    inputs: config.inputs.map(i => ({
      name: i.name,
      type: i.type,
    })),
    outputs: config.outputs.map(o => ({
      name: o.name,
      type: o.type,
    })),
    defaultData: {
      _customNodeId: config.id,
      _nodeType: config.nodeType,
      ...config.inputs.reduce((acc, i) => {
        if (i.default !== undefined) {
          acc[i.name] = i.default;
        }
        return acc;
      }, {} as Record<string, unknown>),
    },
    description: config.description || '自定义节点',
  };
}

export function getCustomNodeDefinitions(): NodeDefinition[] {
  return customNodes.map(customNodeToDefinition);
}

// ============================================
// 执行自定义节点
// ============================================

export async function executeCustomNode(
  config: CustomNodeConfig,
  inputs: Record<string, unknown>,
  apiKeys: Record<string, string>
): Promise<Record<string, unknown>> {
  switch (config.nodeType) {
    case 'http':
      return executeHttpNode(config, inputs, apiKeys);
    case 'webhook':
      return executeWebhookNode(config, inputs);
    case 'code':
      return executeCodeNode(config, inputs);
    case 'custom-api':
      return executeCustomApiNode(config, inputs, apiKeys);
    default:
      throw new Error(`未知的自定义节点类型: ${config.nodeType}`);
  }
}

// HTTP 请求节点执行
async function executeHttpNode(
  config: CustomNodeConfig,
  inputs: Record<string, unknown>,
  apiKeys: Record<string, string>
): Promise<Record<string, unknown>> {
  const httpConfig = config.httpConfig;
  if (!httpConfig) throw new Error('HTTP 配置缺失');
  
  // 替换 URL 中的变量
  let url = httpConfig.url;
  for (const [key, value] of Object.entries(inputs)) {
    url = url.replace(`{{${key}}}`, String(value));
  }
  
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...httpConfig.headers,
  };
  
  // 处理认证
  if (httpConfig.authentication) {
    const auth = httpConfig.authentication;
    switch (auth.type) {
      case 'bearer':
        const bearerToken = auth.tokenField ? apiKeys[auth.tokenField] : '';
        if (bearerToken) {
          headers['Authorization'] = `Bearer ${bearerToken}`;
        }
        break;
      case 'basic':
        // Basic auth 需要用户名和密码
        break;
      case 'api-key':
        const apiKey = auth.tokenField ? apiKeys[auth.tokenField] : '';
        const headerName = auth.headerName || 'X-API-Key';
        if (apiKey) {
          headers[headerName] = apiKey;
        }
        break;
    }
  }
  
  // 构建请求体
  let body: string | undefined;
  if (httpConfig.method !== 'GET' && httpConfig.bodyTemplate) {
    body = httpConfig.bodyTemplate;
    for (const [key, value] of Object.entries(inputs)) {
      body = body.replace(`{{${key}}}`, JSON.stringify(value));
    }
  }
  
  // 发送请求
  const response = await fetch(url, {
    method: httpConfig.method,
    headers,
    body,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP 请求失败: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  
  // 映射响应
  const outputs: Record<string, unknown> = {};
  if (httpConfig.responseMapping) {
    for (const [outputName, jsonPath] of Object.entries(httpConfig.responseMapping)) {
      outputs[outputName] = getValueByPath(data, jsonPath);
    }
  } else {
    // 默认返回整个响应
    outputs['响应'] = data;
  }
  
  return outputs;
}

// Webhook 节点执行（返回配置信息，实际触发由外部完成）
async function executeWebhookNode(
  config: CustomNodeConfig,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const webhookConfig = config.webhookConfig;
  if (!webhookConfig) throw new Error('Webhook 配置缺失');
  
  // Webhook 节点通常作为触发器，这里返回配置信息
  return {
    webhookUrl: `${window.location.origin}/webhook/${webhookConfig.path}`,
    method: webhookConfig.method,
    ...inputs,
  };
}

// JavaScript 代码节点执行
async function executeCodeNode(
  config: CustomNodeConfig,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const codeConfig = config.codeConfig;
  if (!codeConfig) throw new Error('代码配置缺失');
  
  // 创建安全的执行环境
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  
  // 构建函数参数
  const inputNames = Object.keys(inputs);
  const inputValues = Object.values(inputs);
  
  // 包装代码，确保返回值
  const wrappedCode = `
    ${codeConfig.code}
    return typeof output !== 'undefined' ? output : {};
  `;
  
  try {
    const fn = new AsyncFunction(...inputNames, wrappedCode);
    const result = await fn(...inputValues);
    
    // 确保返回对象
    if (typeof result === 'object' && result !== null) {
      return result;
    }
    return { '输出': result };
  } catch (error) {
    throw new Error(`代码执行错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 自定义 API 节点执行
async function executeCustomApiNode(
  config: CustomNodeConfig,
  inputs: Record<string, unknown>,
  apiKeys: Record<string, string>
): Promise<Record<string, unknown>> {
  const apiConfig = config.customApiConfig;
  if (!apiConfig) throw new Error('API 配置缺失');
  
  const endpoint = apiConfig.endpoints[0]; // 使用第一个端点
  if (!endpoint) throw new Error('没有配置 API 端点');
  
  // 构建 URL
  let url = `${apiConfig.baseUrl}${endpoint.path}`;
  for (const [key, value] of Object.entries(inputs)) {
    url = url.replace(`{{${key}}}`, String(value));
  }
  
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 添加 API Key
  if (apiConfig.apiKeyField && apiKeys[apiConfig.apiKeyField]) {
    headers['Authorization'] = `Bearer ${apiKeys[apiConfig.apiKeyField]}`;
  }
  
  // 构建请求体
  let body: string | undefined;
  if (endpoint.method !== 'GET' && endpoint.bodyTemplate) {
    body = endpoint.bodyTemplate;
    for (const [key, value] of Object.entries(inputs)) {
      body = body.replace(`{{${key}}}`, JSON.stringify(value));
    }
  }
  
  const response = await fetch(url, {
    method: endpoint.method,
    headers,
    body,
  });
  
  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }
  
  const data = await response.json();
  return { '响应': data };
}

// 辅助函数：通过路径获取对象值
function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// ============================================
// 预设的自定义节点模板
// ============================================

export const customNodeTemplates: CustomNodeConfig[] = [
  // HTTP GET 请求模板
  {
    id: 'http-get-template',
    name: 'HTTP GET 请求',
    description: '发送 HTTP GET 请求到任意 URL',
    icon: '🌐',
    color: '#3b82f6',
    category: 'custom',
    nodeType: 'http',
    inputs: [
      { name: 'URL', type: 'text', required: true },
      { name: '参数', type: 'text' },
    ],
    outputs: [
      { name: '响应', type: 'text' },
    ],
    httpConfig: {
      method: 'GET',
      url: '{{URL}}',
      responseMapping: {
        '响应': '',
      },
    },
  },
  
  // HTTP POST 请求模板
  {
    id: 'http-post-template',
    name: 'HTTP POST 请求',
    description: '发送 HTTP POST 请求',
    icon: '📤',
    color: '#10b981',
    category: 'custom',
    nodeType: 'http',
    inputs: [
      { name: 'URL', type: 'text', required: true },
      { name: '请求体', type: 'text' },
    ],
    outputs: [
      { name: '响应', type: 'text' },
    ],
    httpConfig: {
      method: 'POST',
      url: '{{URL}}',
      bodyTemplate: '{{请求体}}',
      responseMapping: {
        '响应': '',
      },
    },
  },
  
  // JavaScript 代码节点模板
  {
    id: 'js-code-template',
    name: 'JavaScript 代码',
    description: '执行自定义 JavaScript 代码',
    icon: '📜',
    color: '#f59e0b',
    category: 'custom',
    nodeType: 'code',
    inputs: [
      { name: '输入', type: 'any' },
    ],
    outputs: [
      { name: '输出', type: 'any' },
    ],
    codeConfig: {
      language: 'javascript',
      code: `// 输入变量: 输入
// 返回值赋给 output 变量
const output = {
  result: 输入
};`,
    },
  },
  
  // OpenAI 兼容 API 模板
  {
    id: 'openai-compatible-template',
    name: 'OpenAI 兼容 API',
    description: '调用 OpenAI 兼容的 API（如 Ollama、vLLM 等）',
    icon: '🤖',
    color: '#8b5cf6',
    category: 'custom',
    nodeType: 'http',
    inputs: [
      { name: '提示词', type: 'text', required: true },
      { name: '系统提示', type: 'text', default: '你是一个有帮助的助手。' },
    ],
    outputs: [
      { name: '回复', type: 'text' },
    ],
    httpConfig: {
      method: 'POST',
      url: 'http://localhost:11434/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
      },
      bodyTemplate: JSON.stringify({
        model: 'llama2',
        messages: [
          { role: 'system', content: '{{系统提示}}' },
          { role: 'user', content: '{{提示词}}' },
        ],
      }),
      responseMapping: {
        '回复': 'choices.0.message.content',
      },
    },
  },
  
  // Stable Diffusion WebUI API 模板
  {
    id: 'sd-webui-template',
    name: 'SD WebUI API',
    description: '调用本地 Stable Diffusion WebUI API',
    icon: '🎨',
    color: '#ec4899',
    category: 'custom',
    nodeType: 'http',
    inputs: [
      { name: '提示词', type: 'text', required: true },
      { name: '负面提示词', type: 'text', default: '' },
      { name: '宽度', type: 'text', default: '512' },
      { name: '高度', type: 'text', default: '512' },
    ],
    outputs: [
      { name: '图像', type: 'image' },
    ],
    httpConfig: {
      method: 'POST',
      url: 'http://127.0.0.1:7860/sdapi/v1/txt2img',
      bodyTemplate: JSON.stringify({
        prompt: '{{提示词}}',
        negative_prompt: '{{负面提示词}}',
        width: '{{宽度}}',
        height: '{{高度}}',
        steps: 20,
      }),
      responseMapping: {
        '图像': 'images.0',
      },
    },
  },
];

// ============================================
// 初始化
// ============================================

export function initCustomNodes(): void {
  loadCustomNodes();
  
  // 如果没有自定义节点，添加一些示例
  if (customNodes.length === 0) {
    // 不自动添加模板，让用户自己选择
  }
}
