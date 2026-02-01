/**
 * AI API 服务
 * 支持 OpenAI、Replicate 等多个后端
 */

// API 配置
export interface APIConfig {
  provider: 'openai' | 'replicate' | 'local' | 'mock';
  apiKey?: string;
  baseUrl?: string;
}

// 当前配置（从 localStorage 读取）
let currentConfig: APIConfig = {
  provider: 'mock',
};

// 初始化配置
export function initAPIConfig() {
  try {
    const saved = localStorage.getItem('joinrender-api-config');
    if (saved) {
      currentConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load API config:', e);
  }
}

// 保存配置
export function saveAPIConfig(config: APIConfig) {
  currentConfig = config;
  localStorage.setItem('joinrender-api-config', JSON.stringify(config));
}

// 获取当前配置
export function getAPIConfig(): APIConfig {
  return { ...currentConfig };
}

// ============================================
// LLM 服务
// ============================================

export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  model?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const { provider, apiKey, baseUrl } = currentConfig;

  switch (provider) {
    case 'openai':
      return callOpenAI(request, apiKey!, baseUrl);
    case 'local':
      return callLocalLLM(request, baseUrl);
    case 'mock':
    default:
      return mockLLM(request);
  }
}

async function callOpenAI(
  request: LLMRequest,
  apiKey: string,
  baseUrl?: string
): Promise<LLMResponse> {
  const url = baseUrl || 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
    },
  };
}

async function callLocalLLM(
  request: LLMRequest,
  baseUrl?: string
): Promise<LLMResponse> {
  const url = baseUrl || 'http://localhost:11434/api/generate';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model || 'llama2',
      prompt: `${request.systemPrompt}\n\nUser: ${request.userMessage}\n\nAssistant:`,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.statusText}`);
  }

  const data = await response.json();
  return { content: data.response };
}

async function mockLLM(request: LLMRequest): Promise<LLMResponse> {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // 根据系统提示词生成模拟响应
  if (request.systemPrompt.includes('JSON') || request.systemPrompt.includes('json')) {
    return {
      content: JSON.stringify({
        characterRef: `Full body T-pose, neutral studio lighting, green screen background, character reference sheet style, highly detailed, ${request.userMessage}`,
        actionShot: `Cinematic wide angle shot, dramatic lighting, dynamic camera angle, action scene, cyberpunk city background, ${request.userMessage}`,
        closeUp: `Extreme close-up portrait, emotional expression, dramatic rim lighting, shallow depth of field, ${request.userMessage}`,
      }, null, 2),
    };
  }
  
  return {
    content: `Enhanced prompt: ${request.userMessage}, highly detailed, professional quality, 8K resolution, cinematic lighting`,
  };
}

// ============================================
// 图像生成服务
// ============================================

export interface ImageGenRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  referenceImage?: string; // base64 或 URL
  model?: string;
}

export interface ImageGenResponse {
  imageUrl: string;
  seed?: number;
}

export async function generateImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  const { provider, apiKey } = currentConfig;

  switch (provider) {
    case 'replicate':
      return callReplicateImage(request, apiKey!);
    case 'mock':
    default:
      return mockImageGen(request);
  }
}

async function callReplicateImage(
  request: ImageGenRequest,
  apiKey: string
): Promise<ImageGenResponse> {
  // 使用 SDXL 模型
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
    },
    body: JSON.stringify({
      version: 'stability-ai/sdxl:latest',
      input: {
        prompt: request.prompt,
        negative_prompt: request.negativePrompt || 'low quality, blurry',
        width: request.width || 1024,
        height: request.height || 1024,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.statusText}`);
  }

  const prediction = await response.json();
  
  // 轮询等待结果
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { 'Authorization': `Token ${apiKey}` } }
    );
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error(`Image generation failed: ${result.error}`);
  }

  return {
    imageUrl: result.output[0],
  };
}

async function mockImageGen(request: ImageGenRequest): Promise<ImageGenResponse> {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // 返回占位图
  const width = request.width || 1024;
  const height = request.height || 1024;
  const seed = Math.floor(Math.random() * 1000000);
  
  return {
    imageUrl: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    seed,
  };
}

// ============================================
// 视频生成服务
// ============================================

export interface VideoGenRequest {
  imageUrl: string;
  prompt?: string;
  duration?: number;
  referenceImage?: string;
}

export interface VideoGenResponse {
  videoUrl: string;
}

export async function generateVideo(request: VideoGenRequest): Promise<VideoGenResponse> {
  const { provider, apiKey } = currentConfig;

  switch (provider) {
    case 'replicate':
      return callReplicateVideo(request, apiKey!);
    case 'mock':
    default:
      return mockVideoGen(request);
  }
}

async function callReplicateVideo(
  request: VideoGenRequest,
  apiKey: string
): Promise<VideoGenResponse> {
  // 使用 Stable Video Diffusion
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
    },
    body: JSON.stringify({
      version: 'stability-ai/stable-video-diffusion:latest',
      input: {
        input_image: request.imageUrl,
        motion_bucket_id: 127,
        fps: 24,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.statusText}`);
  }

  const prediction = await response.json();
  
  // 轮询等待结果
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { 'Authorization': `Token ${apiKey}` } }
    );
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error(`Video generation failed: ${result.error}`);
  }

  return {
    videoUrl: result.output,
  };
}

async function mockVideoGen(request: VideoGenRequest): Promise<VideoGenResponse> {
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  // 返回示例视频
  return {
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  };
}

// ============================================
// 图像分析服务
// ============================================

export interface ImageAnalysisRequest {
  imageUrl: string;
}

export interface ImageAnalysisResponse {
  description: string;
}

export async function analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  const { provider, apiKey, baseUrl } = currentConfig;

  switch (provider) {
    case 'openai':
      return callOpenAIVision(request, apiKey!, baseUrl);
    case 'mock':
    default:
      return mockImageAnalysis(request);
  }
}

async function callOpenAIVision(
  request: ImageAnalysisRequest,
  apiKey: string,
  baseUrl?: string
): Promise<ImageAnalysisResponse> {
  const url = baseUrl || 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image in detail for image generation purposes.' },
            { type: 'image_url', image_url: { url: request.imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    description: data.choices[0].message.content,
  };
}

async function mockImageAnalysis(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    description: 'A detailed scene with vibrant colors, professional composition, and cinematic lighting.',
  };
}
