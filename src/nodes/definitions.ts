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
  // Runway 风格节点 - Gen-4 系列
  // ============================================
  {
    type: 'gen4-text-to-image',
    name: 'Gen-4 文生图',
    category: 'media',
    color: '#8b5cf6',
    icon: '✨',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      aspectRatio: '16:9',
      style: 'cinematic',
    },
    description: 'Runway Gen-4 文本生成图像',
  },
  {
    type: 'gen4-image-to-video',
    name: 'Gen-4 图生视频',
    category: 'media',
    color: '#8b5cf6',
    icon: '🎬',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 5,
      motion: 'auto',
    },
    description: 'Runway Gen-4 图像生成视频',
  },
  {
    type: 'gen45-text-to-video',
    name: 'Gen-4.5 文生视频',
    category: 'media',
    color: '#a855f7',
    icon: '🚀',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 10,
      resolution: '1080p',
    },
    description: 'Runway Gen-4.5 文本直接生成视频',
  },
  {
    type: 'gen45-image-to-video',
    name: 'Gen-4.5 图生视频',
    category: 'media',
    color: '#a855f7',
    icon: '🎥',
    inputs: [
      { name: '首帧图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 10,
      cameraMotion: 'auto',
    },
    description: 'Runway Gen-4.5 图像生成视频，支持首帧控制',
  },
  {
    type: 'flash-image',
    name: 'Flash 快速生图',
    category: 'media',
    color: '#06b6d4',
    icon: '⚡',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      aspectRatio: '1:1',
    },
    description: '快速图像生成，适合快速迭代',
  },

  // ============================================
  // 音频节点
  // ============================================
  {
    type: 'audio-upload',
    name: '音频上传',
    category: 'input',
    color: '#6366f1',
    icon: '🎵',
    inputs: [],
    outputs: [{ name: '音频', type: 'audio' }],
    defaultData: { audioUrl: '', fileName: '' },
    description: '上传音频文件',
  },
  {
    type: 'tts',
    name: '语音合成',
    category: 'audio',
    color: '#f97316',
    icon: '🗣️',
    inputs: [
      { name: '文本', type: 'text' },
    ],
    outputs: [{ name: '音频', type: 'audio' }],
    defaultData: { 
      voice: 'alloy',
      provider: 'openai',
    },
    description: '文本转语音 (TTS)',
  },
  {
    type: 'stt',
    name: '语音识别',
    category: 'audio',
    color: '#f97316',
    icon: '👂',
    inputs: [
      { name: '音频', type: 'audio' },
    ],
    outputs: [{ name: '文本', type: 'text' }],
    defaultData: { 
      language: 'zh',
    },
    description: '语音转文本 (STT/Whisper)',
  },
  {
    type: 'music-gen',
    name: '音乐生成',
    category: 'audio',
    color: '#f97316',
    icon: '🎼',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '音频', type: 'audio' }],
    defaultData: { 
      duration: 30,
      style: 'pop',
      provider: 'suno',
    },
    description: '根据描述生成音乐',
  },
  {
    type: 'elevenlabs-tts',
    name: 'ElevenLabs 语音',
    category: 'audio',
    color: '#f97316',
    icon: '🎙️',
    inputs: [
      { name: '文本', type: 'text' },
    ],
    outputs: [{ name: '音频', type: 'audio' }],
    defaultData: { 
      voice: 'Rachel',
      model: 'eleven_multilingual_v2',
    },
    description: 'ElevenLabs 高质量语音合成',
  },
  {
    type: 'fish-audio-tts',
    name: 'Fish Audio 语音',
    category: 'audio',
    color: '#f97316',
    icon: '🐟',
    inputs: [
      { name: '文本', type: 'text' },
    ],
    outputs: [{ name: '音频', type: 'audio' }],
    defaultData: { 
      voice: '',
    },
    description: 'Fish Audio 语音克隆与合成',
  },

  // ============================================
  // 更多视频模型节点
  // ============================================
  {
    type: 'kling-video',
    name: '可灵视频',
    category: 'media',
    color: '#8b5cf6',
    icon: '🎬',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 5,
      model: 'kling-v1',
    },
    description: '可灵 AI 图生视频',
  },
  {
    type: 'luma-video',
    name: 'Luma 视频',
    category: 'media',
    color: '#8b5cf6',
    icon: '🌙',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 5,
    },
    description: 'Luma Dream Machine 视频生成',
  },
  {
    type: 'pika-video',
    name: 'Pika 视频',
    category: 'media',
    color: '#8b5cf6',
    icon: '⚡',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 3,
    },
    description: 'Pika Labs 视频生成',
  },
  {
    type: 'minimax-video',
    name: '海螺视频',
    category: 'media',
    color: '#8b5cf6',
    icon: '🐚',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: {},
    description: 'MiniMax 海螺 AI 视频生成',
  },

  // ============================================
  // 更多图像模型节点
  // ============================================
  {
    type: 'dalle-image',
    name: 'DALL-E 生图',
    category: 'media',
    color: '#ec4899',
    icon: '🎨',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      model: 'dall-e-3',
      size: '1024x1024',
      quality: 'hd',
    },
    description: 'OpenAI DALL-E 3 图像生成',
  },
  {
    type: 'stability-image',
    name: 'Stable Diffusion',
    category: 'media',
    color: '#ec4899',
    icon: '🖼️',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      width: 1024,
      height: 1024,
      cfgScale: 7,
    },
    description: 'Stability AI SDXL 图像生成',
  },
  {
    type: 'midjourney-image',
    name: 'Midjourney',
    category: 'media',
    color: '#ec4899',
    icon: '🌈',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: {},
    description: 'Midjourney 图像生成',
  },
  {
    type: 'ideogram-image',
    name: 'Ideogram',
    category: 'media',
    color: '#ec4899',
    icon: '✏️',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      aspectRatio: '16:9',
    },
    description: 'Ideogram AI 图像生成（擅长文字）',
  },
  {
    type: 'leonardo-image',
    name: 'Leonardo AI',
    category: 'media',
    color: '#ec4899',
    icon: '🎭',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '图像', type: 'image' }],
    defaultData: { 
      width: 1024,
      height: 1024,
    },
    description: 'Leonardo AI 图像生成',
  },

  // ============================================
  // 3D 模型生成节点
  // ============================================
  {
    type: '3d-model-upload',
    name: '3D模型上传',
    category: 'input',
    color: '#6366f1',
    icon: '📦',
    inputs: [],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { modelUrl: '', fileName: '' },
    description: '上传 3D 模型文件 (GLB/OBJ/FBX)',
  },
  {
    type: 'text-to-3d',
    name: '文字生成3D',
    category: '3d',
    color: '#14b8a6',
    icon: '🎲',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      quality: 'standard',
      format: 'glb',
      provider: 'meshy',
    },
    description: '根据文字描述生成 3D 模型',
  },
  {
    type: 'image-to-3d',
    name: '图片生成3D',
    category: '3d',
    color: '#14b8a6',
    icon: '🖼️➡️📦',
    inputs: [
      { name: '图像', type: 'image' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      quality: 'standard',
      format: 'glb',
      provider: 'meshy',
    },
    description: '从单张图片生成 3D 模型',
  },
  {
    type: 'meshy-3d',
    name: 'Meshy 3D',
    category: '3d',
    color: '#14b8a6',
    icon: '🔷',
    inputs: [
      { name: '提示词', type: 'text' },
      { name: '参考图像', type: 'image' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      artStyle: 'realistic',
      quality: 'high',
    },
    description: 'Meshy AI 3D 模型生成',
  },
  {
    type: 'tripo-3d',
    name: 'Tripo AI 3D',
    category: '3d',
    color: '#14b8a6',
    icon: '🔺',
    inputs: [
      { name: '图像', type: 'image' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: {},
    description: 'Tripo AI 图像转 3D 模型',
  },
  {
    type: 'rodin-3d',
    name: 'Rodin 3D',
    category: '3d',
    color: '#14b8a6',
    icon: '🗿',
    inputs: [
      { name: '图像', type: 'image' },
      { name: '提示词', type: 'text' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      quality: 'high',
    },
    description: 'Rodin (Hyper3D) 高质量 3D 生成',
  },
  {
    type: 'csm-3d',
    name: 'CSM 3D',
    category: '3d',
    color: '#14b8a6',
    icon: '🧊',
    inputs: [
      { name: '图像', type: 'image' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      format: 'glb',
    },
    description: 'CSM AI 图像转 3D',
  },
  {
    type: 'luma-genie-3d',
    name: 'Luma Genie',
    category: '3d',
    color: '#14b8a6',
    icon: '✨',
    inputs: [
      { name: '提示词', type: 'text' },
      { name: '图像', type: 'image' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: {},
    description: 'Luma Genie 3D 生成',
  },
  {
    type: 'triposr-3d',
    name: 'TripoSR',
    category: '3d',
    color: '#14b8a6',
    icon: '⚡',
    inputs: [
      { name: '图像', type: 'image' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: {},
    description: 'TripoSR 快速图像转 3D (Replicate)',
  },
  {
    type: '3d-texture',
    name: '3D贴图生成',
    category: '3d',
    color: '#14b8a6',
    icon: '🎨',
    inputs: [
      { name: '3D模型', type: 'model3d' },
      { name: '风格提示词', type: 'text' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      resolution: 1024,
    },
    description: '为 3D 模型生成贴图纹理',
  },
  {
    type: '3d-rigging',
    name: '3D骨骼绑定',
    category: '3d',
    color: '#14b8a6',
    icon: '🦴',
    inputs: [
      { name: '3D模型', type: 'model3d' },
    ],
    outputs: [{ name: '3D模型', type: 'model3d' }],
    defaultData: { 
      type: 'humanoid',
    },
    description: '自动为 3D 模型添加骨骼绑定',
  },
  {
    type: '3d-animation',
    name: '3D动画生成',
    category: '3d',
    color: '#14b8a6',
    icon: '🏃',
    inputs: [
      { name: '3D模型', type: 'model3d' },
      { name: '动作描述', type: 'text' },
    ],
    outputs: [{ name: '3D动画', type: 'model3d' }],
    defaultData: { 
      duration: 3,
      fps: 30,
    },
    description: '为 3D 模型生成动画',
  },
  {
    type: '3d-render',
    name: '3D渲染',
    category: '3d',
    color: '#14b8a6',
    icon: '📸',
    inputs: [
      { name: '3D模型', type: 'model3d' },
    ],
    outputs: [{ name: '渲染图像', type: 'image' }],
    defaultData: { 
      width: 1024,
      height: 1024,
      camera: 'front',
      lighting: 'studio',
    },
    description: '渲染 3D 模型为图像',
  },
  {
    type: '3d-turntable',
    name: '3D转盘视频',
    category: '3d',
    color: '#14b8a6',
    icon: '🔄',
    inputs: [
      { name: '3D模型', type: 'model3d' },
    ],
    outputs: [{ name: '视频', type: 'video' }],
    defaultData: { 
      duration: 5,
      fps: 30,
    },
    description: '生成 3D 模型 360° 旋转展示视频',
  },
  {
    type: '3d-output',
    name: '3D模型输出',
    category: 'output',
    color: '#ef4444',
    icon: '📦',
    inputs: [{ name: '3D模型', type: 'model3d' }],
    outputs: [],
    defaultData: { 
      format: 'glb',
    },
    description: '3D 模型输出/预览/下载',
  },

  // ============================================
  // 更多 LLM 节点
  // ============================================
  {
    type: 'claude-llm',
    name: 'Claude',
    category: 'llm',
    color: '#10b981',
    icon: '🤖',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: '你是一个有帮助的助手。',
      model: 'claude-3-5-sonnet-20241022',
    },
    description: 'Anthropic Claude 模型',
  },
  {
    type: 'gemini-llm',
    name: 'Gemini',
    category: 'llm',
    color: '#10b981',
    icon: '💎',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: '你是一个有帮助的助手。',
      model: 'gemini-1.5-flash',
    },
    description: 'Google Gemini 模型',
  },
  {
    type: 'deepseek-llm',
    name: 'DeepSeek',
    category: 'llm',
    color: '#10b981',
    icon: '🔍',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: '你是一个有帮助的助手。',
      model: 'deepseek-chat',
    },
    description: 'DeepSeek 深度求索',
  },
  {
    type: 'kimi-llm',
    name: 'Kimi',
    category: 'llm',
    color: '#10b981',
    icon: '🌙',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: '你是一个有帮助的助手。',
      model: 'moonshot-v1-8k',
    },
    description: 'Moonshot Kimi 模型',
  },
  {
    type: 'qwen-llm',
    name: '通义千问',
    category: 'llm',
    color: '#10b981',
    icon: '🔮',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: '你是一个有帮助的助手。',
      model: 'qwen-turbo',
    },
    description: '阿里通义千问',
  },
  {
    type: 'glm-llm',
    name: '智谱 GLM',
    category: 'llm',
    color: '#10b981',
    icon: '🧠',
    inputs: [
      { name: '输入文本', type: 'text' },
    ],
    outputs: [{ name: '输出文本', type: 'text' }],
    defaultData: { 
      systemPrompt: '你是一个有帮助的助手。',
      model: 'glm-4-flash',
    },
    description: '智谱 GLM 模型',
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
  {
    type: 'audio-output',
    name: '音频输出',
    category: 'output',
    color: '#ef4444',
    icon: '🔊',
    inputs: [{ name: '音频', type: 'audio' }],
    outputs: [],
    defaultData: { 
      format: 'mp3',
    },
    description: '音频输出/预览',
  },
  
  // ============================================
  // 自定义/集成节点
  // 用于外部 API 调用和自定义逻辑
  // ============================================
  {
    type: 'http-request',
    name: 'HTTP 请求',
    category: 'custom',
    color: '#3b82f6',
    icon: '🌐',
    inputs: [
      { name: 'URL', type: 'text' },
      { name: '请求体', type: 'text' },
    ],
    outputs: [
      { name: '响应', type: 'text' },
      { name: '状态码', type: 'text' },
    ],
    defaultData: { 
      method: 'GET',
      headers: '{}',
      timeout: 30000,
    },
    description: '发送 HTTP 请求到任意 API',
  },
  {
    type: 'webhook-trigger',
    name: 'Webhook 触发器',
    category: 'custom',
    color: '#8b5cf6',
    icon: '🪝',
    inputs: [],
    outputs: [
      { name: '数据', type: 'any' },
      { name: 'Headers', type: 'text' },
    ],
    defaultData: { 
      path: 'my-webhook',
      method: 'POST',
      secret: '',
    },
    description: '接收外部 Webhook 调用',
  },
  {
    type: 'javascript-code',
    name: 'JavaScript 代码',
    category: 'custom',
    color: '#f59e0b',
    icon: '📜',
    inputs: [
      { name: '输入1', type: 'any' },
      { name: '输入2', type: 'any' },
    ],
    outputs: [
      { name: '输出', type: 'any' },
    ],
    defaultData: { 
      code: `// 可用变量: input1, input2
// 返回值会作为输出
const result = {
  processed: input1,
  timestamp: Date.now()
};
return result;`,
    },
    description: '执行自定义 JavaScript 代码',
  },
  {
    type: 'json-parse',
    name: 'JSON 解析',
    category: 'custom',
    color: '#06b6d4',
    icon: '📋',
    inputs: [
      { name: 'JSON文本', type: 'text' },
    ],
    outputs: [
      { name: '对象', type: 'any' },
    ],
    defaultData: {},
    description: '解析 JSON 字符串为对象',
  },
  {
    type: 'json-stringify',
    name: 'JSON 序列化',
    category: 'custom',
    color: '#06b6d4',
    icon: '📝',
    inputs: [
      { name: '对象', type: 'any' },
    ],
    outputs: [
      { name: 'JSON文本', type: 'text' },
    ],
    defaultData: { 
      pretty: true,
    },
    description: '将对象序列化为 JSON 字符串',
  },
  {
    type: 'data-mapper',
    name: '数据映射',
    category: 'custom',
    color: '#84cc16',
    icon: '🔀',
    inputs: [
      { name: '输入数据', type: 'any' },
    ],
    outputs: [
      { name: '输出数据', type: 'any' },
    ],
    defaultData: { 
      mapping: '{\n  "输出字段": "输入数据.字段名"\n}',
    },
    description: '映射和转换数据结构',
  },
  {
    type: 'condition',
    name: '条件判断',
    category: 'custom',
    color: '#f97316',
    icon: '❓',
    inputs: [
      { name: '输入', type: 'any' },
    ],
    outputs: [
      { name: '真', type: 'any' },
      { name: '假', type: 'any' },
    ],
    defaultData: { 
      condition: 'input !== null && input !== undefined',
    },
    description: '根据条件分流数据',
  },
  {
    type: 'loop',
    name: '循环处理',
    category: 'custom',
    color: '#ec4899',
    icon: '🔄',
    inputs: [
      { name: '数组', type: 'any' },
    ],
    outputs: [
      { name: '当前项', type: 'any' },
      { name: '索引', type: 'text' },
    ],
    defaultData: {},
    description: '遍历数组中的每个元素',
  },
  {
    type: 'aggregate',
    name: '数据聚合',
    category: 'custom',
    color: '#14b8a6',
    icon: '📊',
    inputs: [
      { name: '项目', type: 'any' },
    ],
    outputs: [
      { name: '数组', type: 'any' },
    ],
    defaultData: {},
    description: '将多个输入聚合为数组',
  },
  {
    type: 'delay',
    name: '延迟',
    category: 'custom',
    color: '#64748b',
    icon: '⏱️',
    inputs: [
      { name: '输入', type: 'any' },
    ],
    outputs: [
      { name: '输出', type: 'any' },
    ],
    defaultData: { 
      delay: 1000,
    },
    description: '延迟一段时间后传递数据',
  },
  {
    type: 'openai-compatible',
    name: 'OpenAI 兼容 API',
    category: 'custom',
    color: '#10b981',
    icon: '🔌',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [
      { name: '回复', type: 'text' },
    ],
    defaultData: { 
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama2',
      systemPrompt: '你是一个有帮助的助手。',
    },
    description: '调用 OpenAI 兼容 API（Ollama、vLLM 等）',
  },
  {
    type: 'sd-webui-api',
    name: 'SD WebUI API',
    category: 'custom',
    color: '#ec4899',
    icon: '🎨',
    inputs: [
      { name: '提示词', type: 'text' },
    ],
    outputs: [
      { name: '图像', type: 'image' },
    ],
    defaultData: { 
      baseUrl: 'http://127.0.0.1:7860',
      negativePrompt: '',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'Euler a',
    },
    description: '调用本地 Stable Diffusion WebUI',
  },
  {
    type: 'comfyui-api',
    name: 'ComfyUI API',
    category: 'custom',
    color: '#8b5cf6',
    icon: '🖼️',
    inputs: [
      { name: '工作流JSON', type: 'text' },
    ],
    outputs: [
      { name: '图像', type: 'image' },
    ],
    defaultData: { 
      baseUrl: 'http://127.0.0.1:8188',
    },
    description: '调用本地 ComfyUI API',
  },
  {
    type: 'custom-api',
    name: '自定义 API',
    category: 'custom',
    color: '#64748b',
    icon: '🔧',
    inputs: [
      { name: '输入', type: 'any' },
    ],
    outputs: [
      { name: '输出', type: 'any' },
    ],
    defaultData: { 
      name: '我的 API',
      baseUrl: '',
      apiKey: '',
      endpoint: '/api/v1/generate',
      method: 'POST',
      bodyTemplate: '{"prompt": "{{输入}}"}',
      responseField: 'result',
    },
    description: '配置并调用自定义 API',
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
  audio: '音频节点',
  '3d': '3D 模型节点',
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
  audio: '#f97316',
  '3d': '#14b8a6',
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
  audio: '语音合成、识别、音乐生成',
  '3d': '3D 模型生成、贴图、动画',
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
