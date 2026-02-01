/**
 * AI API 服务 - 全模型支持
 * 
 * 支持的服务商：
 * - OpenAI (GPT, DALL-E, Whisper, TTS)
 * - Anthropic (Claude)
 * - Google (Gemini)
 * - Stability AI (Stable Diffusion)
 * - Replicate (各类开源模型)
 * - Runway (Gen-3, Gen-4)
 * - Pika Labs (视频生成)
 * - Kling AI (可灵视频)
 * - MiniMax (海螺AI)
 * - ElevenLabs (语音合成)
 * - Fish Audio (语音合成)
 * - Suno (音乐生成)
 * - Udio (音乐生成)
 * - Meshy (3D生成)
 * - Tripo AI (3D生成)
 * - Rodin (3D生成)
 * - CSM AI (3D生成)
 * - Luma Genie (3D生成)
 * - 本地 Ollama
 * - 本地 ComfyUI
 */

// ============================================
// 配置类型定义
// ============================================

export interface APIConfigFile {
  // 文本模型
  openai?: { apiKey: string; baseUrl?: string };
  anthropic?: { apiKey: string };
  google?: { apiKey: string };
  deepseek?: { apiKey: string };
  moonshot?: { apiKey: string };  // Kimi
  zhipu?: { apiKey: string };     // 智谱 GLM
  qwen?: { apiKey: string };      // 通义千问
  baichuan?: { apiKey: string };  // 百川
  minimax?: { apiKey: string };   // MiniMax
  
  // 图像模型
  stability?: { apiKey: string };
  midjourney?: { apiKey: string; baseUrl?: string };
  dalle?: { apiKey: string };     // 使用 OpenAI key
  ideogram?: { apiKey: string };
  leonardo?: { apiKey: string };
  
  // 视频模型
  runway?: { apiKey: string };
  pika?: { apiKey: string };
  kling?: { apiKey: string };     // 可灵
  luma?: { apiKey: string };      // Luma Dream Machine
  minimax_video?: { apiKey: string }; // 海螺视频
  
  // 音频模型
  elevenlabs?: { apiKey: string };
  fish_audio?: { apiKey: string };
  openai_tts?: { apiKey: string }; // 使用 OpenAI key
  openai_whisper?: { apiKey: string }; // 使用 OpenAI key
  
  // 音乐模型
  suno?: { apiKey: string };
  udio?: { apiKey: string };
  
  // 3D 模型
  meshy?: { apiKey: string };
  tripo?: { apiKey: string };
  rodin?: { apiKey: string };
  csm?: { apiKey: string };
  luma_genie?: { apiKey: string };
  
  // 通用
  replicate?: { apiKey: string };
  
  // 本地
  ollama?: { baseUrl?: string };
  comfyui?: { baseUrl?: string };
}

// 运行时配置存储
let apiConfig: APIConfigFile = {};

// ============================================
// 配置管理
// ============================================

export async function initAPIConfig() {
  // 从配置文件加载
  try {
    const response = await fetch('/api.config.json');
    if (response.ok) {
      apiConfig = await response.json();
      console.log('已加载 API 配置文件');
    }
  } catch (e) {
    console.warn('无法加载 api.config.json:', e);
  }
  
  // 从 localStorage 补充
  try {
    const saved = localStorage.getItem('joinrender-api-config-v2');
    if (saved) {
      const localConfig = JSON.parse(saved);
      apiConfig = { ...apiConfig, ...localConfig };
    }
  } catch (e) {
    console.warn('无法加载本地配置:', e);
  }
}

export function saveAPIConfig(config: Partial<APIConfigFile>) {
  apiConfig = { ...apiConfig, ...config };
  localStorage.setItem('joinrender-api-config-v2', JSON.stringify(apiConfig));
}

export function getAPIConfig(): APIConfigFile {
  return { ...apiConfig };
}

// 获取特定服务的 API Key
function getKey(service: keyof APIConfigFile): string | undefined {
  const config = apiConfig[service];
  if (config && typeof config === 'object' && 'apiKey' in config) {
    return config.apiKey;
  }
  return undefined;
}

// ============================================
// 通用 Replicate 调用
// ============================================

async function callReplicate(
  model: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const apiKey = getKey('replicate');
  if (!apiKey) throw new Error('未配置 Replicate API Key');
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
    },
    body: JSON.stringify({ version: model, input }),
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
    throw new Error(`Replicate error: ${result.error}`);
  }
  
  return result.output;
}

// ============================================
// 文本生成 (LLM)
// ============================================

export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  provider?: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot' | 'zhipu' | 'qwen' | 'baichuan' | 'minimax' | 'ollama';
}

export interface LLMResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const provider = request.provider || detectLLMProvider();
  
  switch (provider) {
    case 'openai':
      return callOpenAI(request);
    case 'anthropic':
      return callAnthropic(request);
    case 'google':
      return callGemini(request);
    case 'deepseek':
      return callDeepSeek(request);
    case 'moonshot':
      return callMoonshot(request);
    case 'zhipu':
      return callZhipu(request);
    case 'qwen':
      return callQwen(request);
    case 'minimax':
      return callMiniMaxLLM(request);
    case 'ollama':
      return callOllama(request);
    default:
      return mockLLM(request);
  }
}

function detectLLMProvider(): string {
  if (getKey('openai')) return 'openai';
  if (getKey('anthropic')) return 'anthropic';
  if (getKey('google')) return 'google';
  if (getKey('deepseek')) return 'deepseek';
  if (getKey('moonshot')) return 'moonshot';
  if (getKey('zhipu')) return 'zhipu';
  if (getKey('qwen')) return 'qwen';
  if (getKey('minimax')) return 'minimax';
  if (apiConfig.ollama) return 'ollama';
  return 'mock';
}

// OpenAI GPT
async function callOpenAI(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('openai');
  if (!apiKey) throw new Error('未配置 OpenAI API Key');
  
  const baseUrl = apiConfig.openai?.baseUrl || 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(baseUrl, {
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

  if (!response.ok) throw new Error(`OpenAI error: ${await response.text()}`);
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
    },
  };
}

// Anthropic Claude
async function callAnthropic(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new Error('未配置 Anthropic API Key');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: request.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic error: ${await response.text()}`);
  
  const data = await response.json();
  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
    },
  };
}

// Google Gemini
async function callGemini(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('google');
  if (!apiKey) throw new Error('未配置 Google API Key');
  
  const model = request.model || 'gemini-1.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${request.systemPrompt}\n\n${request.userMessage}` }]
        }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini error: ${await response.text()}`);
  
  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
  };
}

// DeepSeek
async function callDeepSeek(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('deepseek');
  if (!apiKey) throw new Error('未配置 DeepSeek API Key');
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek error: ${await response.text()}`);
  
  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// Moonshot (Kimi)
async function callMoonshot(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('moonshot');
  if (!apiKey) throw new Error('未配置 Moonshot API Key');
  
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Moonshot error: ${await response.text()}`);
  
  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// 智谱 GLM
async function callZhipu(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('zhipu');
  if (!apiKey) throw new Error('未配置智谱 API Key');
  
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'glm-4-flash',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error(`智谱 error: ${await response.text()}`);
  
  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// 通义千问
async function callQwen(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('qwen');
  if (!apiKey) throw new Error('未配置通义千问 API Key');
  
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'qwen-turbo',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error(`通义千问 error: ${await response.text()}`);
  
  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// MiniMax
async function callMiniMaxLLM(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = getKey('minimax');
  if (!apiKey) throw new Error('未配置 MiniMax API Key');
  
  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'abab6.5s-chat',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error(`MiniMax error: ${await response.text()}`);
  
  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// Ollama (本地)
async function callOllama(request: LLMRequest): Promise<LLMResponse> {
  const baseUrl = apiConfig.ollama?.baseUrl || 'http://localhost:11434/api/generate';
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model || 'llama3.2',
      prompt: `${request.systemPrompt}\n\nUser: ${request.userMessage}\n\nAssistant:`,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
  
  const data = await response.json();
  return { content: data.response };
}

// Mock LLM
async function mockLLM(request: LLMRequest): Promise<LLMResponse> {
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  if (request.systemPrompt.toLowerCase().includes('json')) {
    return {
      content: JSON.stringify({
        prompt1: `Cinematic shot, ${request.userMessage}, highly detailed, 8K`,
        prompt2: `Portrait, ${request.userMessage}, dramatic lighting`,
        prompt3: `Wide angle, ${request.userMessage}, professional quality`,
      }, null, 2),
    };
  }
  
  return {
    content: `Enhanced: ${request.userMessage}, highly detailed, professional quality, 8K resolution`,
  };
}

// ============================================
// 图像生成
// ============================================

export interface ImageGenRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  referenceImage?: string;
  model?: string;
  provider?: 'dalle' | 'stability' | 'midjourney' | 'ideogram' | 'leonardo' | 'replicate' | 'comfyui';
}

export interface ImageGenResponse {
  imageUrl: string;
  seed?: number;
}

export async function generateImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  const provider = request.provider || detectImageProvider();
  
  switch (provider) {
    case 'dalle':
      return callDALLE(request);
    case 'stability':
      return callStabilityImage(request);
    case 'midjourney':
      return callMidjourney(request);
    case 'ideogram':
      return callIdeogram(request);
    case 'leonardo':
      return callLeonardo(request);
    case 'replicate':
      return callReplicateImage(request);
    case 'comfyui':
      return callComfyUIImage(request);
    default:
      return mockImageGen(request);
  }
}

function detectImageProvider(): string {
  if (getKey('dalle') || getKey('openai')) return 'dalle';
  if (getKey('stability')) return 'stability';
  if (getKey('midjourney')) return 'midjourney';
  if (getKey('ideogram')) return 'ideogram';
  if (getKey('leonardo')) return 'leonardo';
  if (getKey('replicate')) return 'replicate';
  if (apiConfig.comfyui) return 'comfyui';
  return 'mock';
}

// OpenAI DALL-E 3
async function callDALLE(request: ImageGenRequest): Promise<ImageGenResponse> {
  const apiKey = getKey('dalle') || getKey('openai');
  if (!apiKey) throw new Error('未配置 OpenAI API Key');
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'dall-e-3',
      prompt: request.prompt,
      n: 1,
      size: `${request.width || 1024}x${request.height || 1024}`,
      quality: 'hd',
    }),
  });

  if (!response.ok) throw new Error(`DALL-E error: ${await response.text()}`);
  
  const data = await response.json();
  return { imageUrl: data.data[0].url };
}

// Stability AI
async function callStabilityImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  const apiKey = getKey('stability');
  if (!apiKey) throw new Error('未配置 Stability API Key');
  
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [
        { text: request.prompt, weight: 1 },
        { text: request.negativePrompt || 'low quality, blurry', weight: -1 },
      ],
      cfg_scale: 7,
      width: request.width || 1024,
      height: request.height || 1024,
      samples: 1,
    }),
  });

  if (!response.ok) throw new Error(`Stability error: ${await response.text()}`);
  
  const data = await response.json();
  return { imageUrl: `data:image/png;base64,${data.artifacts[0].base64}` };
}

// Midjourney (通过第三方 API)
async function callMidjourney(request: ImageGenRequest): Promise<ImageGenResponse> {
  const apiKey = getKey('midjourney');
  const baseUrl = apiConfig.midjourney?.baseUrl;
  if (!apiKey || !baseUrl) throw new Error('未配置 Midjourney API');
  
  // 使用通用的 Midjourney API 代理格式
  const response = await fetch(`${baseUrl}/imagine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt: request.prompt }),
  });

  if (!response.ok) throw new Error(`Midjourney error: ${await response.text()}`);
  
  const data = await response.json();
  return { imageUrl: data.imageUrl || data.url };
}

// Ideogram
async function callIdeogram(request: ImageGenRequest): Promise<ImageGenResponse> {
  const apiKey = getKey('ideogram');
  if (!apiKey) throw new Error('未配置 Ideogram API Key');
  
  const response = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
    },
    body: JSON.stringify({
      image_request: {
        prompt: request.prompt,
        aspect_ratio: 'ASPECT_16_9',
        model: request.model || 'V_2',
      },
    }),
  });

  if (!response.ok) throw new Error(`Ideogram error: ${await response.text()}`);
  
  const data = await response.json();
  return { imageUrl: data.data[0].url };
}

// Leonardo AI
async function callLeonardo(request: ImageGenRequest): Promise<ImageGenResponse> {
  const apiKey = getKey('leonardo');
  if (!apiKey) throw new Error('未配置 Leonardo API Key');
  
  // 创建生成任务
  const createResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      width: request.width || 1024,
      height: request.height || 1024,
      num_images: 1,
    }),
  });

  if (!createResponse.ok) throw new Error(`Leonardo error: ${await createResponse.text()}`);
  
  const createData = await createResponse.json();
  const generationId = createData.sdGenerationJob.generationId;
  
  // 轮询获取结果
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pollResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.generations_by_pk?.generated_images?.length > 0) {
      return { imageUrl: pollData.generations_by_pk.generated_images[0].url };
    }
  }
  
  throw new Error('Leonardo 生成超时');
}

// Replicate 图像
async function callReplicateImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  const model = request.model || 'stability-ai/sdxl:latest';
  const output = await callReplicate(model, {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || 'low quality, blurry',
    width: request.width || 1024,
    height: request.height || 1024,
  });
  
  return { imageUrl: Array.isArray(output) ? output[0] : output as string };
}

// ComfyUI (本地)
async function callComfyUIImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  const baseUrl = apiConfig.comfyui?.baseUrl || 'http://localhost:8188';
  
  // 简化的 ComfyUI 工作流
  const workflow = {
    prompt: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" } },
      "5": { "class_type": "EmptyLatentImage", "inputs": { "width": request.width || 1024, "height": request.height || 1024, "batch_size": 1 } },
      "6": { "class_type": "CLIPTextEncode", "inputs": { "text": request.prompt, "clip": ["4", 1] } },
      "7": { "class_type": "CLIPTextEncode", "inputs": { "text": request.negativePrompt || "low quality", "clip": ["4", 1] } },
      "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
      "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] } }
    }
  };
  
  const response = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) throw new Error(`ComfyUI error: ${response.statusText}`);
  
  const data = await response.json();
  // 需要轮询获取结果
  return { imageUrl: `${baseUrl}/view?filename=${data.prompt_id}_00001_.png` };
}

// Mock 图像
async function mockImageGen(request: ImageGenRequest): Promise<ImageGenResponse> {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  const seed = Math.floor(Math.random() * 1000000);
  return {
    imageUrl: `https://picsum.photos/seed/${seed}/${request.width || 1024}/${request.height || 1024}`,
    seed,
  };
}

// ============================================
// 视频生成
// ============================================

export interface VideoGenRequest {
  prompt?: string;
  imageUrl?: string;
  startFrame?: string;
  endFrame?: string;
  duration?: number;
  model?: string;
  provider?: 'runway' | 'pika' | 'kling' | 'luma' | 'minimax' | 'replicate';
}

export interface VideoGenResponse {
  videoUrl: string;
}

export async function generateVideo(request: VideoGenRequest): Promise<VideoGenResponse> {
  const provider = request.provider || detectVideoProvider();
  
  switch (provider) {
    case 'runway':
      return callRunway(request);
    case 'pika':
      return callPika(request);
    case 'kling':
      return callKling(request);
    case 'luma':
      return callLuma(request);
    case 'minimax':
      return callMiniMaxVideo(request);
    case 'replicate':
      return callReplicateVideo(request);
    default:
      return mockVideoGen();
  }
}

function detectVideoProvider(): string {
  if (getKey('runway')) return 'runway';
  if (getKey('pika')) return 'pika';
  if (getKey('kling')) return 'kling';
  if (getKey('luma')) return 'luma';
  if (getKey('minimax_video')) return 'minimax';
  if (getKey('replicate')) return 'replicate';
  return 'mock';
}

// Runway Gen-3/Gen-4
async function callRunway(request: VideoGenRequest): Promise<VideoGenResponse> {
  const apiKey = getKey('runway');
  if (!apiKey) throw new Error('未配置 Runway API Key');
  
  const response = await fetch('https://api.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'gen3a_turbo',
      promptImage: request.imageUrl,
      promptText: request.prompt,
      duration: request.duration || 5,
    }),
  });

  if (!response.ok) throw new Error(`Runway error: ${await response.text()}`);
  
  const data = await response.json();
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.runwayml.com/v1/tasks/${data.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.status === 'SUCCEEDED') {
      return { videoUrl: pollData.output[0] };
    }
    if (pollData.status === 'FAILED') {
      throw new Error(`Runway 生成失败: ${pollData.error}`);
    }
  }
  
  throw new Error('Runway 生成超时');
}

// Pika Labs
async function callPika(request: VideoGenRequest): Promise<VideoGenResponse> {
  const apiKey = getKey('pika');
  if (!apiKey) throw new Error('未配置 Pika API Key');
  
  const response = await fetch('https://api.pika.art/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      image: request.imageUrl,
      duration: request.duration || 3,
    }),
  });

  if (!response.ok) throw new Error(`Pika error: ${await response.text()}`);
  
  const data = await response.json();
  return { videoUrl: data.video_url };
}

// 可灵 Kling
async function callKling(request: VideoGenRequest): Promise<VideoGenResponse> {
  const apiKey = getKey('kling');
  if (!apiKey) throw new Error('未配置可灵 API Key');
  
  const response = await fetch('https://api.klingai.com/v1/videos/image2video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_name: request.model || 'kling-v1',
      image: request.imageUrl,
      prompt: request.prompt,
      duration: String(request.duration || 5),
    }),
  });

  if (!response.ok) throw new Error(`可灵 error: ${await response.text()}`);
  
  const data = await response.json();
  const taskId = data.data.task_id;
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.data.task_status === 'succeed') {
      return { videoUrl: pollData.data.task_result.videos[0].url };
    }
    if (pollData.data.task_status === 'failed') {
      throw new Error('可灵生成失败');
    }
  }
  
  throw new Error('可灵生成超时');
}

// Luma Dream Machine
async function callLuma(request: VideoGenRequest): Promise<VideoGenResponse> {
  const apiKey = getKey('luma');
  if (!apiKey) throw new Error('未配置 Luma API Key');
  
  const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      keyframes: request.imageUrl ? {
        frame0: { type: 'image', url: request.imageUrl }
      } : undefined,
    }),
  });

  if (!response.ok) throw new Error(`Luma error: ${await response.text()}`);
  
  const data = await response.json();
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${data.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.state === 'completed') {
      return { videoUrl: pollData.assets.video };
    }
    if (pollData.state === 'failed') {
      throw new Error(`Luma 生成失败: ${pollData.failure_reason}`);
    }
  }
  
  throw new Error('Luma 生成超时');
}

// MiniMax 海螺视频
async function callMiniMaxVideo(request: VideoGenRequest): Promise<VideoGenResponse> {
  const apiKey = getKey('minimax_video') || getKey('minimax');
  if (!apiKey) throw new Error('未配置 MiniMax API Key');
  
  const response = await fetch('https://api.minimax.chat/v1/video_generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'video-01',
      prompt: request.prompt,
      first_frame_image: request.imageUrl,
    }),
  });

  if (!response.ok) throw new Error(`MiniMax error: ${await response.text()}`);
  
  const data = await response.json();
  const taskId = data.task_id;
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.minimax.chat/v1/query/video_generation?task_id=${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.status === 'Success') {
      return { videoUrl: pollData.file_id };
    }
    if (pollData.status === 'Failed') {
      throw new Error('MiniMax 视频生成失败');
    }
  }
  
  throw new Error('MiniMax 视频生成超时');
}

// Replicate 视频
async function callReplicateVideo(request: VideoGenRequest): Promise<VideoGenResponse> {
  const model = request.model || 'stability-ai/stable-video-diffusion:latest';
  const output = await callReplicate(model, {
    input_image: request.imageUrl,
    motion_bucket_id: 127,
    fps: 24,
  });
  
  return { videoUrl: output as string };
}

// Mock 视频
async function mockVideoGen(): Promise<VideoGenResponse> {
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  return { videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' };
}

// ============================================
// 音频生成 (TTS 语音合成)
// ============================================

export interface TTSRequest {
  text: string;
  voice?: string;
  model?: string;
  provider?: 'openai' | 'elevenlabs' | 'fish_audio' | 'minimax';
}

export interface TTSResponse {
  audioUrl: string;
}

export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
  const provider = request.provider || detectTTSProvider();
  
  switch (provider) {
    case 'openai':
      return callOpenAITTS(request);
    case 'elevenlabs':
      return callElevenLabs(request);
    case 'fish_audio':
      return callFishAudio(request);
    case 'minimax':
      return callMiniMaxTTS(request);
    default:
      return mockTTS();
  }
}

function detectTTSProvider(): string {
  if (getKey('openai_tts') || getKey('openai')) return 'openai';
  if (getKey('elevenlabs')) return 'elevenlabs';
  if (getKey('fish_audio')) return 'fish_audio';
  if (getKey('minimax')) return 'minimax';
  return 'mock';
}

// OpenAI TTS
async function callOpenAITTS(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getKey('openai_tts') || getKey('openai');
  if (!apiKey) throw new Error('未配置 OpenAI API Key');
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || 'tts-1-hd',
      input: request.text,
      voice: request.voice || 'alloy',
    }),
  });

  if (!response.ok) throw new Error(`OpenAI TTS error: ${await response.text()}`);
  
  const blob = await response.blob();
  return { audioUrl: URL.createObjectURL(blob) };
}

// ElevenLabs
async function callElevenLabs(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getKey('elevenlabs');
  if (!apiKey) throw new Error('未配置 ElevenLabs API Key');
  
  const voiceId = request.voice || '21m00Tcm4TlvDq8ikWAM'; // Rachel
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: request.text,
      model_id: request.model || 'eleven_multilingual_v2',
    }),
  });

  if (!response.ok) throw new Error(`ElevenLabs error: ${await response.text()}`);
  
  const blob = await response.blob();
  return { audioUrl: URL.createObjectURL(blob) };
}

// Fish Audio
async function callFishAudio(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getKey('fish_audio');
  if (!apiKey) throw new Error('未配置 Fish Audio API Key');
  
  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text: request.text,
      reference_id: request.voice,
    }),
  });

  if (!response.ok) throw new Error(`Fish Audio error: ${await response.text()}`);
  
  const blob = await response.blob();
  return { audioUrl: URL.createObjectURL(blob) };
}

// MiniMax TTS
async function callMiniMaxTTS(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getKey('minimax');
  if (!apiKey) throw new Error('未配置 MiniMax API Key');
  
  const response = await fetch('https://api.minimax.chat/v1/t2a_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'speech-01-turbo',
      text: request.text,
      voice_setting: {
        voice_id: request.voice || 'male-qn-qingse',
      },
    }),
  });

  if (!response.ok) throw new Error(`MiniMax TTS error: ${await response.text()}`);
  
  const data = await response.json();
  // 解码 base64 音频
  const audioData = atob(data.data.audio);
  const audioArray = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    audioArray[i] = audioData.charCodeAt(i);
  }
  const blob = new Blob([audioArray], { type: 'audio/mp3' });
  return { audioUrl: URL.createObjectURL(blob) };
}

// Mock TTS
async function mockTTS(): Promise<TTSResponse> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' };
}

// ============================================
// 语音识别 (STT)
// ============================================

export interface STTRequest {
  audioFile: File | Blob;
  language?: string;
  provider?: 'openai';
}

export interface STTResponse {
  text: string;
}

export async function transcribeAudio(request: STTRequest): Promise<STTResponse> {
  const provider = request.provider || (getKey('openai_whisper') || getKey('openai') ? 'openai' : 'mock');
  
  if (provider === 'openai') {
    return callWhisper(request);
  }
  
  return mockSTT();
}

// OpenAI Whisper
async function callWhisper(request: STTRequest): Promise<STTResponse> {
  const apiKey = getKey('openai_whisper') || getKey('openai');
  if (!apiKey) throw new Error('未配置 OpenAI API Key');
  
  const formData = new FormData();
  formData.append('file', request.audioFile);
  formData.append('model', 'whisper-1');
  if (request.language) {
    formData.append('language', request.language);
  }
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error(`Whisper error: ${await response.text()}`);
  
  const data = await response.json();
  return { text: data.text };
}

// Mock STT
async function mockSTT(): Promise<STTResponse> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { text: '这是一段模拟的语音识别结果。' };
}

// ============================================
// 音乐生成
// ============================================

export interface MusicGenRequest {
  prompt: string;
  duration?: number;
  style?: string;
  provider?: 'suno' | 'udio' | 'replicate';
}

export interface MusicGenResponse {
  audioUrl: string;
  title?: string;
}

export async function generateMusic(request: MusicGenRequest): Promise<MusicGenResponse> {
  const provider = request.provider || detectMusicProvider();
  
  switch (provider) {
    case 'suno':
      return callSuno(request);
    case 'udio':
      return callUdio(request);
    case 'replicate':
      return callReplicateMusic(request);
    default:
      return mockMusic();
  }
}

function detectMusicProvider(): string {
  if (getKey('suno')) return 'suno';
  if (getKey('udio')) return 'udio';
  if (getKey('replicate')) return 'replicate';
  return 'mock';
}

// Suno
async function callSuno(request: MusicGenRequest): Promise<MusicGenResponse> {
  const apiKey = getKey('suno');
  if (!apiKey) throw new Error('未配置 Suno API Key');
  
  const response = await fetch('https://api.suno.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      duration: request.duration || 30,
      style: request.style,
    }),
  });

  if (!response.ok) throw new Error(`Suno error: ${await response.text()}`);
  
  const data = await response.json();
  return { audioUrl: data.audio_url, title: data.title };
}

// Udio
async function callUdio(request: MusicGenRequest): Promise<MusicGenResponse> {
  const apiKey = getKey('udio');
  if (!apiKey) throw new Error('未配置 Udio API Key');
  
  const response = await fetch('https://api.udio.com/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      duration: request.duration || 30,
    }),
  });

  if (!response.ok) throw new Error(`Udio error: ${await response.text()}`);
  
  const data = await response.json();
  return { audioUrl: data.audio_url };
}

// Replicate 音乐 (MusicGen)
async function callReplicateMusic(request: MusicGenRequest): Promise<MusicGenResponse> {
  const output = await callReplicate('meta/musicgen:latest', {
    prompt: request.prompt,
    duration: request.duration || 8,
  });
  
  return { audioUrl: output as string };
}

// Mock 音乐
async function mockMusic(): Promise<MusicGenResponse> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    title: 'Mock Generated Music',
  };
}

// ============================================
// 图像分析 (Vision)
// ============================================

export interface ImageAnalysisRequest {
  imageUrl: string;
  prompt?: string;
  provider?: 'openai' | 'anthropic' | 'google';
}

export interface ImageAnalysisResponse {
  description: string;
}

export async function analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  const provider = request.provider || detectVisionProvider();
  
  switch (provider) {
    case 'openai':
      return callOpenAIVision(request);
    case 'anthropic':
      return callAnthropicVision(request);
    case 'google':
      return callGeminiVision(request);
    default:
      return mockVision();
  }
}

function detectVisionProvider(): string {
  if (getKey('openai')) return 'openai';
  if (getKey('anthropic')) return 'anthropic';
  if (getKey('google')) return 'google';
  return 'mock';
}

// OpenAI Vision
async function callOpenAIVision(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  const apiKey = getKey('openai');
  if (!apiKey) throw new Error('未配置 OpenAI API Key');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: request.prompt || 'Describe this image in detail.' },
          { type: 'image_url', image_url: { url: request.imageUrl } },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI Vision error: ${await response.text()}`);
  
  const data = await response.json();
  return { description: data.choices[0].message.content };
}

// Anthropic Vision
async function callAnthropicVision(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new Error('未配置 Anthropic API Key');
  
  // 需要将图片转为 base64
  const imageResponse = await fetch(request.imageUrl);
  const imageBlob = await imageResponse.blob();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageBlob);
  });
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: request.prompt || 'Describe this image in detail.' },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic Vision error: ${await response.text()}`);
  
  const data = await response.json();
  return { description: data.content[0].text };
}

// Gemini Vision
async function callGeminiVision(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  const apiKey = getKey('google');
  if (!apiKey) throw new Error('未配置 Google API Key');
  
  // 获取图片 base64
  const imageResponse = await fetch(request.imageUrl);
  const imageBlob = await imageResponse.blob();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageBlob);
  });
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: request.prompt || 'Describe this image in detail.' },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ],
        }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini Vision error: ${await response.text()}`);
  
  const data = await response.json();
  return { description: data.candidates[0].content.parts[0].text };
}

// Mock Vision
async function mockVision(): Promise<ImageAnalysisResponse> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { description: 'A detailed scene with vibrant colors, professional composition, and cinematic lighting.' };
}

// ============================================
// 3D 模型生成
// ============================================

export interface Model3DGenRequest {
  prompt?: string;
  imageUrl?: string;
  mode?: 'text-to-3d' | 'image-to-3d';
  format?: 'glb' | 'obj' | 'fbx' | 'usdz';
  quality?: 'draft' | 'standard' | 'high';
  provider?: 'meshy' | 'tripo' | 'rodin' | 'csm' | 'luma_genie' | 'replicate';
}

export interface Model3DGenResponse {
  modelUrl: string;
  thumbnailUrl?: string;
  format?: string;
}

export async function generate3DModel(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  const provider = request.provider || detect3DProvider();
  
  switch (provider) {
    case 'meshy':
      return callMeshy(request);
    case 'tripo':
      return callTripo(request);
    case 'rodin':
      return callRodin(request);
    case 'csm':
      return callCSM(request);
    case 'luma_genie':
      return callLumaGenie(request);
    case 'replicate':
      return callReplicate3D(request);
    default:
      return mock3DGen();
  }
}

function detect3DProvider(): string {
  if (getKey('meshy')) return 'meshy';
  if (getKey('tripo')) return 'tripo';
  if (getKey('rodin')) return 'rodin';
  if (getKey('csm')) return 'csm';
  if (getKey('luma_genie')) return 'luma_genie';
  if (getKey('replicate')) return 'replicate';
  return 'mock';
}

// Meshy AI - 文本/图像转3D
async function callMeshy(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  const apiKey = getKey('meshy');
  if (!apiKey) throw new Error('未配置 Meshy API Key');
  
  const isImageTo3D = request.mode === 'image-to-3d' || request.imageUrl;
  const endpoint = isImageTo3D 
    ? 'https://api.meshy.ai/v2/image-to-3d'
    : 'https://api.meshy.ai/v2/text-to-3d';
  
  const body = isImageTo3D 
    ? { image_url: request.imageUrl, enable_pbr: true }
    : { 
        prompt: request.prompt,
        art_style: 'realistic',
        negative_prompt: 'low quality, blurry',
      };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Meshy error: ${await response.text()}`);
  
  const data = await response.json();
  const taskId = data.result;
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`${endpoint}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.status === 'SUCCEEDED') {
      return {
        modelUrl: pollData.model_urls?.glb || pollData.model_url,
        thumbnailUrl: pollData.thumbnail_url,
        format: 'glb',
      };
    }
    if (pollData.status === 'FAILED') {
      throw new Error(`Meshy 生成失败: ${pollData.message}`);
    }
  }
  
  throw new Error('Meshy 生成超时');
}

// Tripo AI - 图像转3D
async function callTripo(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  const apiKey = getKey('tripo');
  if (!apiKey) throw new Error('未配置 Tripo API Key');
  
  // 创建任务
  const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      type: request.imageUrl ? 'image_to_model' : 'text_to_model',
      file: request.imageUrl ? { type: 'url', url: request.imageUrl } : undefined,
      prompt: request.prompt,
    }),
  });

  if (!response.ok) throw new Error(`Tripo error: ${await response.text()}`);
  
  const data = await response.json();
  const taskId = data.data.task_id;
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.data.status === 'success') {
      return {
        modelUrl: pollData.data.output.model,
        thumbnailUrl: pollData.data.output.rendered_image,
        format: 'glb',
      };
    }
    if (pollData.data.status === 'failed') {
      throw new Error('Tripo 生成失败');
    }
  }
  
  throw new Error('Tripo 生成超时');
}

// Rodin (Hyper3D) - 高质量3D生成
async function callRodin(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  const apiKey = getKey('rodin');
  if (!apiKey) throw new Error('未配置 Rodin API Key');
  
  const response = await fetch('https://hyperhuman.deemos.com/api/v2/rodin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      images: request.imageUrl ? [request.imageUrl] : undefined,
      prompt: request.prompt,
      quality: request.quality || 'standard',
    }),
  });

  if (!response.ok) throw new Error(`Rodin error: ${await response.text()}`);
  
  const data = await response.json();
  const taskId = data.uuid;
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://hyperhuman.deemos.com/api/v2/status/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.status === 'Done') {
      return {
        modelUrl: pollData.output?.glb || pollData.output?.model,
        thumbnailUrl: pollData.output?.thumbnail,
        format: 'glb',
      };
    }
    if (pollData.status === 'Failed') {
      throw new Error('Rodin 生成失败');
    }
  }
  
  throw new Error('Rodin 生成超时');
}

// CSM AI (Common Sense Machines) - 图像转3D
async function callCSM(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  const apiKey = getKey('csm');
  if (!apiKey) throw new Error('未配置 CSM API Key');
  
  const response = await fetch('https://api.csm.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      image_url: request.imageUrl,
      prompt: request.prompt,
      output_format: request.format || 'glb',
    }),
  });

  if (!response.ok) throw new Error(`CSM error: ${await response.text()}`);
  
  const data = await response.json();
  const taskId = data.task_id;
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.csm.ai/v1/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.status === 'completed') {
      return {
        modelUrl: pollData.result.model_url,
        thumbnailUrl: pollData.result.preview_url,
        format: request.format || 'glb',
      };
    }
    if (pollData.status === 'failed') {
      throw new Error('CSM 生成失败');
    }
  }
  
  throw new Error('CSM 生成超时');
}

// Luma Genie - 3D生成
async function callLumaGenie(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  const apiKey = getKey('luma_genie');
  if (!apiKey) throw new Error('未配置 Luma Genie API Key');
  
  const response = await fetch('https://api.lumalabs.ai/genie/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      image_url: request.imageUrl,
    }),
  });

  if (!response.ok) throw new Error(`Luma Genie error: ${await response.text()}`);
  
  const data = await response.json();
  
  // 轮询获取结果
  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`https://api.lumalabs.ai/genie/v1/generations/${data.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    
    const pollData = await pollResponse.json();
    if (pollData.state === 'completed') {
      return {
        modelUrl: pollData.assets.glb,
        thumbnailUrl: pollData.assets.thumbnail,
        format: 'glb',
      };
    }
    if (pollData.state === 'failed') {
      throw new Error(`Luma Genie 生成失败: ${pollData.failure_reason}`);
    }
  }
  
  throw new Error('Luma Genie 生成超时');
}

// Replicate 3D (TripoSR, InstantMesh 等)
async function callReplicate3D(request: Model3DGenRequest): Promise<Model3DGenResponse> {
  // 使用 TripoSR 模型
  const model = 'stability-ai/triposr:latest';
  const output = await callReplicate(model, {
    image: request.imageUrl,
  });
  
  return {
    modelUrl: output as string,
    format: 'glb',
  };
}

// Mock 3D
async function mock3DGen(): Promise<Model3DGenResponse> {
  await new Promise(resolve => setTimeout(resolve, 3000));
  return {
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    thumbnailUrl: 'https://picsum.photos/seed/3d/256/256',
    format: 'glb',
  };
}
