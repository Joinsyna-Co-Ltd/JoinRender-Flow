import type { NodeDefinition } from '../types';

/**
 * 内置节点定义
 * 
 * 核心设计理念：
 * - 像"乐高积木"：把复杂代码封装成积木块
 * - 三种核心节点：输入节点、LLM 节点、媒体模型节点
 * - 关键机制：Reference Image 锁定（角色一致性的物理定律）
 */

export const builtinNodeDefinitions: NodeDefinition[] = [
  // ============================================
  // 输入节点
  // 工作流入口，上传媒体或输入文本
  // ============================================
  {
    type: 'text-input',
    name: '文本输入',
    category: 'input',
    color: '#6366f1',
    icon: '📝',
    inputs: [],
    outputs: [{ name: '文本', type: 'text' }],
    defaultData: { text: '' },
    description: '输入文本，可以是小说片段、角色描述等',
  },
  {
    type: 'image-upload',
    name: '图像上传',
    category: 'input',
    color: '#6366f1',
    icon: '🖼️',
    inputs: [],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { imageUrl: '', fileName: '' },
    description: '上传图像文件',
  },
  {
    type: 'video-upload',
    name: '视频上传',
    category: 'input',
    color: '#6366f1',
    icon: '🎬',
    inputs: [],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { videoUrl: '', fileName: '' },
    description: '上传视频文件',
  },

  // ============================================
  // LLM 节点（大脑节点）
  // 分析、增强和优化提示词
  // 关键：将小说语言转换为 JSON 格式镜头语言
  // ============================================
  {
    type: 'llm',
    name: 'LLM 处理',
    category: 'llm',
    color: '#10b981',
    icon: '🧠',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: `角色：科幻电影导演
任务：将用户的小说片段转换为3个不同的视觉提示词
输出格式：JSON
1. 角色参考提示词（全身，中性光照，绿色背景）
2. 动作镜头提示词（电影级光照，动态角度）
3. 特写镜头提示词（特写，情感表达）`,
    },
    description: 'LLM 节点：将小说语言转换为标准 JSON 格式的镜头语言',
  },
  {
    type: 'prompt-enhancer',
    name: '提示词增强',
    category: 'llm',
    color: '#10b981',
    icon: '✨',
    inputs: [{ name: '基础提示词', type: 'text' }],
    outputs: [{ name: '增强提示词', type: 'text' }],
    defaultData: { 
      style: 'cinematic',
      detail: 'high',
    },
    description: '将基础提示词转换为详细、有效的提示词',
  },
  {
    type: 'image-analyzer',
    name: '图像分析',
    category: 'llm',
    color: '#10b981',
    icon: '👁️',
    inputs: [{ name: '图像', type: 'image' }],
    outputs: [{ name: '描述', type: 'text' }],
    defaultData: {},
    description: '自动分析图像并生成描述',
  },
  {
    type: 'json-splitter',
    name: 'JSON 分离器',
    category: 'llm',
    color: '#10b981',
    icon: '📋',
    inputs: [{ name: 'JSON 文本', type: 'text' }],
    outputs: [
      { name: '提示词 1', type: 'text' },
      { name: '提示词 2', type: 'text' },
      { name: '提示词 3', type: 'text' },
    ],
    defaultData: {},
    description: '解析 JSON 并分离出多个提示词',
  },

  // ============================================
  // 媒体模型节点
  // 使用生成模型转换输入
  // 关键：Reference Image 输入端锁定角色一致性
  // ============================================
  
  // 图像生成 - 角色参考（定海神针）
  {
    type: 'character-reference-gen',
    name: '角色参考生成',
    category: 'media',
    color: '#f59e0b',
    icon: '🎯',
    inputs: [
      { name: '角色提示词', type: 'text' },
    ],
    outputs: [
      { name: '参考图像', type: 'image' },
    ],
    defaultData: { 
      pose: 'T-Pose',
      lighting: 'neutral',
      background: 'green',
      style: 'full-body',
    },
    description: '生成角色参考图（T-Pose 标准证件照），作为全局参考确保角色一致性',
  },
  
  // 图像生成 - 通用
  {
    type: 'image-gen',
    name: '图像生成',
    category: 'media',
    color: '#ec4899',
    icon: '🖼️',
    inputs: [
      { name: '提示词', type: 'text' },
      { name: '参考图像', type: 'image', isReferenceInput: true },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      model: 'sd-xl',
      aspectRatio: '16:9',
    },
    description: '图像生成节点，参考图像输入端连接角色参考图以保持一致性',
  },
  
  // 高级图像生成
  {
    type: 'advanced-image-gen',
    name: '高级图像生成',
    category: 'media',
    color: '#ec4899',
    icon: '✨',
    inputs: [
      { name: '提示词', type: 'text' },
      { name: '参考图像', type: 'image', isReferenceInput: true },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      aspectRatio: '16:9',
      style: 'cinematic',
    },
    description: '高级图像生成，支持参考图像角色一致性',
  },
  
  // 视频生成
  {
    type: 'video-gen',
    name: '视频生成',
    category: 'media',
    color: '#ec4899',
    icon: '🎬',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
      { name: '参考图像', type: 'image', isReferenceInput: true },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 5,
      motion: 'auto',
    },
    description: '视频生成，将静态图转成视频',
  },
  
  // 首尾帧视频生成
  {
    type: 'frame-interpolation',
    name: '首尾帧插值',
    category: 'media',
    color: '#ec4899',
    icon: '🎥',
    inputs: [
      { name: '起始帧', type: 'image' },
      { name: '结束帧', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 4,
    },
    description: '从首尾帧生成视频',
  },
  
  // 图像变体
  {
    type: 'image-variations',
    name: '图像变体',
    category: 'media',
    color: '#ec4899',
    icon: '🔄',
    inputs: [
      { name: '源图像', type: 'image' },
      { name: '参考图像', type: 'image', isReferenceInput: true },
    ],
    outputs: [
      { name: '变体 1', type: 'image' },
      { name: '变体 2', type: 'image' },
      { name: '变体 3', type: 'image' },
    ],
    defaultData: { 
      variationStrength: 0.5,
    },
    description: '生成图像变体，保持角色一致性',
  },
  
  // 风格迁移
  {
    type: 'style-transfer',
    name: '风格迁移',
    category: 'media',
    color: '#ec4899',
    icon: '🎨',
    inputs: [
      { name: '内容图像', type: 'image' },
      { name: '风格参考', type: 'image' },
    ],
    outputs: [{ name: '风格化图像', type: 'image' }],
    defaultData: { 
      strength: 0.8,
    },
    description: '风格迁移',
  },
  
  // 背景移除
  {
    type: 'remove-background',
    name: '背景移除',
    category: 'media',
    color: '#ec4899',
    icon: '✂️',
    inputs: [{ name: '图像', type: 'image' }],
    outputs: [
      { name: '图像', type: 'image' },
      { name: '蒙版', type: 'image' },
    ],
    defaultData: {},
    description: '移除图像背景',
  },
  
  // 图像放大
  {
    type: 'upscale',
    name: '图像放大',
    category: 'media',
    color: '#ec4899',
    icon: '🔍',
    inputs: [{ name: '图像', type: 'image' }],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      scale: 2,
    },
    description: '图像超分辨率放大',
  },

  // ============================================
  // 输出节点
  // ============================================
  {
    type: 'image-output',
    name: '图像输出',
    category: 'output',
    color: '#ef4444',
    icon: '📤',
    inputs: [{ name: '图像', type: 'image' }],
    outputs: [],
    defaultData: { 
      format: 'png',
      quality: 90,
    },
    description: '图像输出/预览',
  },
  {
    type: 'video-output',
    name: '视频输出',
    category: 'output',
    color: '#ef4444',
    icon: '🎞️',
    inputs: [{ name: '视频', type: 'video' }],
    outputs: [],
    defaultData: { 
      format: 'mp4',
      quality: 'high',
    },
    description: '视频输出/预览',
  },
  {
    type: 'storyboard-output',
    name: '分镜板输出',
    category: 'output',
    color: '#ef4444',
    icon: '🎬',
    inputs: [
      { name: '镜头 1', type: 'image' },
      { name: '镜头 2', type: 'image' },
      { name: '镜头 3', type: 'image' },
    ],
    outputs: [],
    defaultData: { 
      layout: 'horizontal',
    },
    description: '分镜板输出',
  },
];

// 存储自定义节点（来自插件）
let customNodeDefinitions: NodeDefinition[] = [];

// 设置自定义节点
export const setCustomNodeDefinitions = (nodes: NodeDefinition[]) => {
  customNodeDefinitions = nodes;
};

// 获取所有节点定义（内置 + 自定义）
export const getNodeDefinitions = (): NodeDefinition[] => {
  return [...builtinNodeDefinitions, ...customNodeDefinitions];
};

export const getNodeDefinition = (type: string): NodeDefinition | undefined => {
  return getNodeDefinitions().find(d => d.type === type);
};

export const getNodesByCategory = (category: string): NodeDefinition[] => {
  return getNodeDefinitions().filter(d => d.category === category);
};

// 类别标签（中文）
export const categoryLabels: Record<string, string> = {
  input: '输入节点',
  llm: 'LLM 节点',
  media: '媒体模型节点',
  output: '输出节点',
  // ComfyUI 类别
  loaders: '加载器',
  sampling: '采样器',
  conditioning: '条件',
  latent: '潜空间',
  image: '图像处理',
  mask: '蒙版',
  controlnet: 'ControlNet',
  ipadapter: 'IP-Adapter',
  custom: '自定义节点',
};

// 类别颜色
export const categoryColors: Record<string, string> = {
  input: '#6366f1',
  llm: '#10b981',
  media: '#ec4899',
  output: '#ef4444',
  // ComfyUI 类别
  loaders: '#8b5cf6',
  sampling: '#06b6d4',
  conditioning: '#f59e0b',
  latent: '#84cc16',
  image: '#ec4899',
  mask: '#6366f1',
  controlnet: '#14b8a6',
  ipadapter: '#f97316',
  custom: '#64748b',
};

// 类别描述
export const categoryDescriptions: Record<string, string> = {
  input: '工作流入口，上传媒体或输入文本',
  llm: '分析、增强和优化提示词',
  media: '使用生成模型转换输入',
  output: '输出和预览结果',
  // ComfyUI 类别
  loaders: '加载模型、LoRA、VAE 等',
  sampling: 'KSampler 等采样节点',
  conditioning: 'CLIP 文本编码等',
  latent: '潜空间操作',
  image: '图像处理节点',
  mask: '蒙版操作',
  controlnet: 'ControlNet 预处理器',
  ipadapter: 'IP-Adapter 节点',
  custom: '自定义插件节点',
};

// 获取所有类别
export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  getNodeDefinitions().forEach(node => categories.add(node.category));
  return Array.from(categories);
};
