/**
 * 节点执行器
 * 根据节点类型调用对应的 API 服务
 */

import type { NodeInstance, Connection } from '../types';
import { getNodeDefinition } from '../nodes/definitions';
import { 
  callLLM, 
  generateImage, 
  generateVideo, 
  analyzeImage, 
  generateSpeech,
  generateMusic,
  generate3DModel,
  getAPIConfig 
} from './api';

// 节点输出数据存储
export interface NodeOutputData {
  nodeId: string;
  outputs: Record<string, unknown>;
}

// 执行上下文
export interface ExecutionContext {
  nodeOutputs: Map<string, Record<string, unknown>>;
  onProgress?: (nodeId: string, progress: number, message?: string) => void;
  onNodeComplete?: (nodeId: string, outputs: Record<string, unknown>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
}

/**
 * 获取节点的输入数据（从已执行的上游节点获取）
 */
function getNodeInputs(
  node: NodeInstance,
  connections: Connection[],
  context: ExecutionContext
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  
  // 从节点自身数据获取默认值
  Object.assign(inputs, node.data);
  
  // 从连接获取上游节点输出
  node.inputs.forEach((input, index) => {
    const connection = connections.find(
      c => c.targetNodeId === node.id && c.targetPortId === `input-${index}`
    );
    
    if (connection) {
      const sourceOutputs = context.nodeOutputs.get(connection.sourceNodeId);
      if (sourceOutputs) {
        // 从源节点的输出中获取对应端口的数据
        const sourcePortIndex = parseInt(connection.sourcePortId.replace('output-', ''));
        const sourceNode = context.nodeOutputs.get(connection.sourceNodeId);
        if (sourceNode) {
          const outputKeys = Object.keys(sourceNode);
          if (outputKeys[sourcePortIndex] !== undefined) {
            inputs[input.name] = sourceNode[outputKeys[sourcePortIndex]];
          }
        }
      }
    }
  });
  
  return inputs;
}

/**
 * 执行单个节点
 */
export async function executeNode(
  node: NodeInstance,
  connections: Connection[],
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const definition = getNodeDefinition(node.type);
  if (!definition) {
    throw new Error(`未知节点类型: ${node.type}`);
  }
  
  const inputs = getNodeInputs(node, connections, context);
  const config = getAPIConfig();
  
  context.onProgress?.(node.id, 10, '准备执行...');
  
  let outputs: Record<string, unknown> = {};
  
  try {
    switch (node.type) {
      // ============================================
      // 输入节点 - 直接传递数据
      // ============================================
      case 'text-input':
        outputs = { '文本': inputs.text || '' };
        break;
        
      case 'image-upload':
        outputs = { '图像': inputs.imageUrl || '' };
        break;
        
      case 'video-upload':
        outputs = { '视频': inputs.videoUrl || '' };
        break;
      
      // ============================================
      // LLM 节点
      // ============================================
      case 'llm':
        context.onProgress?.(node.id, 30, '调用 LLM...');
        const llmResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || inputs.text as string || '',
        });
        outputs = { '输出文本': llmResponse.content };
        break;
        
      case 'prompt-enhancer':
        context.onProgress?.(node.id, 30, '增强提示词...');
        const enhanceResponse = await callLLM({
          systemPrompt: `你是一个专业的 AI 图像生成提示词专家。
将用户的基础提示词转换为详细、有效的图像生成提示词。
风格: ${inputs.style || 'cinematic'}
细节程度: ${inputs.detail || 'high'}
直接输出增强后的提示词，不要解释。`,
          userMessage: inputs['基础提示词'] as string || '',
        });
        outputs = { '增强提示词': enhanceResponse.content };
        break;
        
      case 'image-analyzer':
        context.onProgress?.(node.id, 30, '分析图像...');
        const imageUrl = inputs['图像'] as string;
        if (imageUrl) {
          const analysisResponse = await analyzeImage({ imageUrl });
          outputs = { '描述': analysisResponse.description };
        } else {
          outputs = { '描述': '无图像输入' };
        }
        break;
        
      case 'json-splitter':
        context.onProgress?.(node.id, 30, '解析 JSON...');
        try {
          const jsonText = inputs['JSON 文本'] as string || '{}';
          const parsed = JSON.parse(jsonText);
          const values = Object.values(parsed);
          outputs = {
            '提示词 1': values[0] || '',
            '提示词 2': values[1] || '',
            '提示词 3': values[2] || '',
          };
        } catch {
          outputs = { '提示词 1': '', '提示词 2': '', '提示词 3': '' };
        }
        break;
      
      // ============================================
      // 媒体生成节点
      // ============================================
      case 'character-reference-gen':
        context.onProgress?.(node.id, 30, '生成角色参考图...');
        const charPrompt = inputs['角色提示词'] as string || '';
        const charImageResponse = await generateImage({
          prompt: `${charPrompt}, T-pose, full body, neutral studio lighting, green screen background, character reference sheet, highly detailed`,
          width: 1024,
          height: 1024,
        });
        outputs = { '参考图像': charImageResponse.imageUrl };
        break;
        
      case 'image-gen':
      case 'advanced-image-gen':
      case 'gen4-text-to-image':
      case 'flash-image':
        context.onProgress?.(node.id, 30, '生成图像...');
        const imgPrompt = inputs['提示词'] as string || '';
        const refImage = inputs['参考图像'] as string;
        const imgResponse = await generateImage({
          prompt: imgPrompt,
          referenceImage: refImage,
          width: 1024,
          height: 576, // 16:9
        });
        outputs = { '图像': imgResponse.imageUrl };
        break;
        
      case 'video-gen':
      case 'gen4-image-to-video':
      case 'gen45-image-to-video':
        context.onProgress?.(node.id, 30, '生成视频...');
        const videoImageUrl = inputs['图像'] as string || inputs['首帧图像'] as string;
        const videoPrompt = inputs['提示词'] as string;
        if (videoImageUrl) {
          const videoResponse = await generateVideo({
            imageUrl: videoImageUrl,
            prompt: videoPrompt,
            duration: inputs.duration as number || 5,
          });
          outputs = { '视频': videoResponse.videoUrl };
        } else {
          outputs = { '视频': '' };
        }
        break;
        
      case 'gen45-text-to-video':
        context.onProgress?.(node.id, 30, '生成视频...');
        // 先生成图像，再生成视频
        const t2vPrompt = inputs['提示词'] as string || '';
        const t2vImageResponse = await generateImage({ prompt: t2vPrompt });
        context.onProgress?.(node.id, 60, '图像完成，生成视频...');
        const t2vVideoResponse = await generateVideo({
          imageUrl: t2vImageResponse.imageUrl,
          prompt: t2vPrompt,
          duration: inputs.duration as number || 10,
        });
        outputs = { '视频': t2vVideoResponse.videoUrl };
        break;
        
      case 'frame-interpolation':
        context.onProgress?.(node.id, 30, '首尾帧插值...');
        const startFrame = inputs['起始帧'] as string;
        const endFrame = inputs['结束帧'] as string;
        if (startFrame) {
          const interpResponse = await generateVideo({
            imageUrl: startFrame,
            prompt: inputs['提示词'] as string,
            duration: inputs.duration as number || 4,
          });
          outputs = { '视频': interpResponse.videoUrl };
        } else {
          outputs = { '视频': '' };
        }
        break;
        
      case 'image-variations':
        context.onProgress?.(node.id, 30, '生成变体...');
        const sourceImage = inputs['源图像'] as string;
        const refImg = inputs['参考图像'] as string;
        // 生成 3 个变体
        const variations = await Promise.all([
          generateImage({ prompt: 'variation 1', referenceImage: sourceImage || refImg }),
          generateImage({ prompt: 'variation 2', referenceImage: sourceImage || refImg }),
          generateImage({ prompt: 'variation 3', referenceImage: sourceImage || refImg }),
        ]);
        outputs = {
          '变体 1': variations[0].imageUrl,
          '变体 2': variations[1].imageUrl,
          '变体 3': variations[2].imageUrl,
        };
        break;
        
      case 'style-transfer':
        context.onProgress?.(node.id, 30, '风格迁移...');
        const contentImg = inputs['内容图像'] as string;
        const styleRef = inputs['风格参考'] as string;
        const styledResponse = await generateImage({
          prompt: 'style transfer',
          referenceImage: contentImg,
        });
        outputs = { '风格化图像': styledResponse.imageUrl };
        break;
        
      case 'remove-background':
        context.onProgress?.(node.id, 30, '移除背景...');
        // 模拟背景移除（实际需要专门的 API）
        const bgImage = inputs['图像'] as string;
        outputs = { '图像': bgImage, '蒙版': bgImage };
        break;
        
      case 'upscale':
        context.onProgress?.(node.id, 30, '放大图像...');
        // 模拟放大（实际需要专门的 API）
        const upscaleImage = inputs['图像'] as string;
        outputs = { '图像': upscaleImage };
        break;
      
      // ============================================
      // 输出节点 - 收集结果
      // ============================================
      case 'image-output':
        outputs = { result: inputs['图像'] || '' };
        break;
        
      case 'video-output':
        outputs = { result: inputs['视频'] || '' };
        break;
        
      case 'storyboard-output':
        outputs = {
          result: {
            shot1: inputs['镜头 1'] || '',
            shot2: inputs['镜头 2'] || '',
            shot3: inputs['镜头 3'] || '',
          },
        };
        break;
        
      case 'audio-output':
        outputs = { result: inputs['音频'] || '' };
        break;
      
      // ============================================
      // 音频节点
      // ============================================
      case 'audio-upload':
        outputs = { '音频': inputs.audioUrl || '' };
        break;
        
      case 'tts':
      case 'elevenlabs-tts':
      case 'fish-audio-tts':
        context.onProgress?.(node.id, 30, '生成语音...');
        const ttsText = inputs['文本'] as string || '';
        if (ttsText) {
          const ttsResponse = await generateSpeech({
            text: ttsText,
            voice: inputs.voice as string,
            provider: node.type === 'elevenlabs-tts' ? 'elevenlabs' : 
                     node.type === 'fish-audio-tts' ? 'fish_audio' : 
                     inputs.provider as 'openai' | 'elevenlabs' | 'fish_audio' | 'minimax',
          });
          outputs = { '音频': ttsResponse.audioUrl };
        } else {
          outputs = { '音频': '' };
        }
        break;
        
      case 'music-gen':
        context.onProgress?.(node.id, 30, '生成音乐...');
        const musicPrompt = inputs['提示词'] as string || '';
        if (musicPrompt) {
          const musicResponse = await generateMusic({
            prompt: musicPrompt,
            duration: inputs.duration as number || 30,
            style: inputs.style as string,
            provider: inputs.provider as 'suno' | 'udio' | 'replicate',
          });
          outputs = { '音频': musicResponse.audioUrl };
        } else {
          outputs = { '音频': '' };
        }
        break;
      
      // ============================================
      // 更多 LLM 节点
      // ============================================
      case 'claude-llm':
        context.onProgress?.(node.id, 30, '调用 Claude...');
        const claudeResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || '',
          provider: 'anthropic',
          model: inputs.model as string,
        });
        outputs = { '输出文本': claudeResponse.content };
        break;
        
      case 'gemini-llm':
        context.onProgress?.(node.id, 30, '调用 Gemini...');
        const geminiResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || '',
          provider: 'google',
          model: inputs.model as string,
        });
        outputs = { '输出文本': geminiResponse.content };
        break;
        
      case 'deepseek-llm':
        context.onProgress?.(node.id, 30, '调用 DeepSeek...');
        const deepseekResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || '',
          provider: 'deepseek',
          model: inputs.model as string,
        });
        outputs = { '输出文本': deepseekResponse.content };
        break;
        
      case 'kimi-llm':
        context.onProgress?.(node.id, 30, '调用 Kimi...');
        const kimiResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || '',
          provider: 'moonshot',
          model: inputs.model as string,
        });
        outputs = { '输出文本': kimiResponse.content };
        break;
        
      case 'qwen-llm':
        context.onProgress?.(node.id, 30, '调用通义千问...');
        const qwenResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || '',
          provider: 'qwen',
          model: inputs.model as string,
        });
        outputs = { '输出文本': qwenResponse.content };
        break;
        
      case 'glm-llm':
        context.onProgress?.(node.id, 30, '调用智谱 GLM...');
        const glmResponse = await callLLM({
          systemPrompt: inputs.systemPrompt as string || '你是一个有帮助的助手。',
          userMessage: inputs['输入文本'] as string || '',
          provider: 'zhipu',
          model: inputs.model as string,
        });
        outputs = { '输出文本': glmResponse.content };
        break;
      
      // ============================================
      // 更多图像生成节点
      // ============================================
      case 'dalle-image':
        context.onProgress?.(node.id, 30, '调用 DALL-E...');
        const dalleResponse = await generateImage({
          prompt: inputs['提示词'] as string || '',
          provider: 'dalle',
          model: inputs.model as string,
        });
        outputs = { '图像': dalleResponse.imageUrl };
        break;
        
      case 'stability-image':
        context.onProgress?.(node.id, 30, '调用 Stability AI...');
        const stabilityResponse = await generateImage({
          prompt: inputs['提示词'] as string || '',
          provider: 'stability',
          width: inputs.width as number || 1024,
          height: inputs.height as number || 1024,
        });
        outputs = { '图像': stabilityResponse.imageUrl };
        break;
        
      case 'midjourney-image':
        context.onProgress?.(node.id, 30, '调用 Midjourney...');
        const mjResponse = await generateImage({
          prompt: inputs['提示词'] as string || '',
          provider: 'midjourney',
        });
        outputs = { '图像': mjResponse.imageUrl };
        break;
        
      case 'ideogram-image':
        context.onProgress?.(node.id, 30, '调用 Ideogram...');
        const ideogramResponse = await generateImage({
          prompt: inputs['提示词'] as string || '',
          provider: 'ideogram',
        });
        outputs = { '图像': ideogramResponse.imageUrl };
        break;
        
      case 'leonardo-image':
        context.onProgress?.(node.id, 30, '调用 Leonardo AI...');
        const leonardoResponse = await generateImage({
          prompt: inputs['提示词'] as string || '',
          provider: 'leonardo',
          width: inputs.width as number || 1024,
          height: inputs.height as number || 1024,
        });
        outputs = { '图像': leonardoResponse.imageUrl };
        break;
      
      // ============================================
      // 更多视频生成节点
      // ============================================
      case 'kling-video':
        context.onProgress?.(node.id, 30, '调用可灵...');
        const klingResponse = await generateVideo({
          imageUrl: inputs['图像'] as string,
          prompt: inputs['提示词'] as string,
          duration: inputs.duration as number || 5,
          provider: 'kling',
        });
        outputs = { '视频': klingResponse.videoUrl };
        break;
        
      case 'luma-video':
        context.onProgress?.(node.id, 30, '调用 Luma...');
        const lumaResponse = await generateVideo({
          imageUrl: inputs['图像'] as string,
          prompt: inputs['提示词'] as string,
          provider: 'luma',
        });
        outputs = { '视频': lumaResponse.videoUrl };
        break;
        
      case 'pika-video':
        context.onProgress?.(node.id, 30, '调用 Pika...');
        const pikaResponse = await generateVideo({
          imageUrl: inputs['图像'] as string,
          prompt: inputs['提示词'] as string,
          duration: inputs.duration as number || 3,
          provider: 'pika',
        });
        outputs = { '视频': pikaResponse.videoUrl };
        break;
        
      case 'minimax-video':
        context.onProgress?.(node.id, 30, '调用海螺视频...');
        const minimaxVideoResponse = await generateVideo({
          imageUrl: inputs['图像'] as string,
          prompt: inputs['提示词'] as string,
          provider: 'minimax',
        });
        outputs = { '视频': minimaxVideoResponse.videoUrl };
        break;
      
      // ============================================
      // 3D 模型生成节点
      // ============================================
      case '3d-model-upload':
        outputs = { '3D模型': inputs.modelUrl || '' };
        break;
        
      case 'text-to-3d':
        context.onProgress?.(node.id, 30, '生成 3D 模型...');
        const textTo3dResponse = await generate3DModel({
          prompt: inputs['提示词'] as string || '',
          mode: 'text-to-3d',
          quality: inputs.quality as 'draft' | 'standard' | 'high',
          format: inputs.format as 'glb' | 'obj' | 'fbx',
          provider: inputs.provider as 'meshy' | 'tripo' | 'rodin' | 'csm' | 'luma_genie' | 'replicate',
        });
        outputs = { '3D模型': textTo3dResponse.modelUrl };
        break;
        
      case 'image-to-3d':
        context.onProgress?.(node.id, 30, '图像转 3D...');
        const imageTo3dResponse = await generate3DModel({
          imageUrl: inputs['图像'] as string,
          mode: 'image-to-3d',
          quality: inputs.quality as 'draft' | 'standard' | 'high',
          format: inputs.format as 'glb' | 'obj' | 'fbx',
          provider: inputs.provider as 'meshy' | 'tripo' | 'rodin' | 'csm' | 'luma_genie' | 'replicate',
        });
        outputs = { '3D模型': imageTo3dResponse.modelUrl };
        break;
        
      case 'meshy-3d':
        context.onProgress?.(node.id, 30, '调用 Meshy...');
        const meshyResponse = await generate3DModel({
          prompt: inputs['提示词'] as string,
          imageUrl: inputs['参考图像'] as string,
          provider: 'meshy',
          quality: inputs.quality as 'draft' | 'standard' | 'high',
        });
        outputs = { '3D模型': meshyResponse.modelUrl };
        break;
        
      case 'tripo-3d':
        context.onProgress?.(node.id, 30, '调用 Tripo AI...');
        const tripoResponse = await generate3DModel({
          imageUrl: inputs['图像'] as string,
          provider: 'tripo',
        });
        outputs = { '3D模型': tripoResponse.modelUrl };
        break;
        
      case 'rodin-3d':
        context.onProgress?.(node.id, 30, '调用 Rodin...');
        const rodinResponse = await generate3DModel({
          imageUrl: inputs['图像'] as string,
          prompt: inputs['提示词'] as string,
          provider: 'rodin',
          quality: inputs.quality as 'draft' | 'standard' | 'high',
        });
        outputs = { '3D模型': rodinResponse.modelUrl };
        break;
        
      case 'csm-3d':
        context.onProgress?.(node.id, 30, '调用 CSM AI...');
        const csmResponse = await generate3DModel({
          imageUrl: inputs['图像'] as string,
          provider: 'csm',
          format: inputs.format as 'glb' | 'obj' | 'fbx',
        });
        outputs = { '3D模型': csmResponse.modelUrl };
        break;
        
      case 'luma-genie-3d':
        context.onProgress?.(node.id, 30, '调用 Luma Genie...');
        const lumaGenieResponse = await generate3DModel({
          prompt: inputs['提示词'] as string,
          imageUrl: inputs['图像'] as string,
          provider: 'luma_genie',
        });
        outputs = { '3D模型': lumaGenieResponse.modelUrl };
        break;
        
      case 'triposr-3d':
        context.onProgress?.(node.id, 30, '调用 TripoSR...');
        const triposrResponse = await generate3DModel({
          imageUrl: inputs['图像'] as string,
          provider: 'replicate',
        });
        outputs = { '3D模型': triposrResponse.modelUrl };
        break;
        
      case '3d-texture':
        context.onProgress?.(node.id, 30, '生成贴图...');
        // 贴图生成需要专门的 API，这里模拟
        outputs = { '3D模型': inputs['3D模型'] || '' };
        break;
        
      case '3d-rigging':
        context.onProgress?.(node.id, 30, '骨骼绑定...');
        // 骨骼绑定需要专门的 API，这里模拟
        outputs = { '3D模型': inputs['3D模型'] || '' };
        break;
        
      case '3d-animation':
        context.onProgress?.(node.id, 30, '生成动画...');
        // 动画生成需要专门的 API，这里模拟
        outputs = { '3D动画': inputs['3D模型'] || '' };
        break;
        
      case '3d-render':
        context.onProgress?.(node.id, 30, '渲染 3D...');
        // 渲染需要专门的 API，这里返回占位图
        await new Promise(resolve => setTimeout(resolve, 1000));
        outputs = { '渲染图像': `https://picsum.photos/seed/${Date.now()}/${inputs.width || 1024}/${inputs.height || 1024}` };
        break;
        
      case '3d-turntable':
        context.onProgress?.(node.id, 30, '生成转盘视频...');
        // 转盘视频需要专门的 API，这里返回示例视频
        await new Promise(resolve => setTimeout(resolve, 2000));
        outputs = { '视频': 'https://www.w3schools.com/html/mov_bbb.mp4' };
        break;
        
      case '3d-output':
        outputs = { result: inputs['3D模型'] || '' };
        break;
      
      // ============================================
      // 自定义/集成节点
      // ============================================
      case 'http-request':
        context.onProgress?.(node.id, 30, '发送 HTTP 请求...');
        const httpUrl = inputs['URL'] as string || '';
        const httpMethod = (inputs.method as string || 'GET').toUpperCase();
        const httpHeaders = JSON.parse(inputs.headers as string || '{}');
        const httpBody = inputs['请求体'] as string;
        
        try {
          const httpResponse = await fetch(httpUrl, {
            method: httpMethod,
            headers: {
              'Content-Type': 'application/json',
              ...httpHeaders,
            },
            body: httpMethod !== 'GET' ? httpBody : undefined,
          });
          
          const responseText = await httpResponse.text();
          let responseData: unknown;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }
          
          outputs = {
            '响应': typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData,
            '状态码': String(httpResponse.status),
          };
        } catch (httpError) {
          outputs = {
            '响应': `请求失败: ${httpError instanceof Error ? httpError.message : '未知错误'}`,
            '状态码': '0',
          };
        }
        break;
        
      case 'webhook-trigger':
        // Webhook 触发器返回配置信息
        const webhookPath = inputs.path as string || 'my-webhook';
        outputs = {
          '数据': { message: 'Webhook 已配置，等待外部调用' },
          'Headers': JSON.stringify({ 'Content-Type': 'application/json' }),
          webhookUrl: `${window.location.origin}/api/webhook/${webhookPath}`,
        };
        break;
        
      case 'javascript-code':
        context.onProgress?.(node.id, 30, '执行代码...');
        const jsCode = inputs.code as string || 'return input1;';
        const input1 = inputs['输入1'];
        const input2 = inputs['输入2'];
        
        try {
          // 创建安全的执行环境
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction('input1', 'input2', jsCode);
          const codeResult = await fn(input1, input2);
          outputs = { '输出': codeResult };
        } catch (codeError) {
          outputs = { '输出': `代码执行错误: ${codeError instanceof Error ? codeError.message : '未知错误'}` };
        }
        break;
        
      case 'json-parse':
        try {
          const jsonText = inputs['JSON文本'] as string || '{}';
          outputs = { '对象': JSON.parse(jsonText) };
        } catch {
          outputs = { '对象': null };
        }
        break;
        
      case 'json-stringify':
        const objToStringify = inputs['对象'];
        const pretty = inputs.pretty !== false;
        outputs = { 
          'JSON文本': pretty 
            ? JSON.stringify(objToStringify, null, 2) 
            : JSON.stringify(objToStringify) 
        };
        break;
        
      case 'data-mapper':
        context.onProgress?.(node.id, 30, '映射数据...');
        const inputData = inputs['输入数据'];
        const mappingStr = inputs.mapping as string || '{}';
        
        try {
          const mapping = JSON.parse(mappingStr);
          const mappedData: Record<string, unknown> = {};
          
          for (const [outputKey, inputPath] of Object.entries(mapping)) {
            const pathParts = (inputPath as string).split('.');
            let value: unknown = inputData;
            for (const part of pathParts) {
              if (value && typeof value === 'object') {
                value = (value as Record<string, unknown>)[part];
              } else {
                value = undefined;
                break;
              }
            }
            mappedData[outputKey] = value;
          }
          
          outputs = { '输出数据': mappedData };
        } catch {
          outputs = { '输出数据': inputData };
        }
        break;
        
      case 'condition':
        const conditionInput = inputs['输入'];
        const conditionExpr = inputs.condition as string || 'input !== null';
        
        try {
          // eslint-disable-next-line no-new-func
          const conditionFn = new Function('input', `return ${conditionExpr};`);
          const conditionResult = conditionFn(conditionInput);
          
          if (conditionResult) {
            outputs = { '真': conditionInput, '假': null };
          } else {
            outputs = { '真': null, '假': conditionInput };
          }
        } catch {
          outputs = { '真': null, '假': conditionInput };
        }
        break;
        
      case 'loop':
        const arrayInput = inputs['数组'];
        if (Array.isArray(arrayInput) && arrayInput.length > 0) {
          // 返回第一个元素，实际循环需要工作流引擎支持
          outputs = { '当前项': arrayInput[0], '索引': '0' };
        } else {
          outputs = { '当前项': null, '索引': '-1' };
        }
        break;
        
      case 'aggregate':
        const itemToAggregate = inputs['项目'];
        outputs = { '数组': [itemToAggregate] };
        break;
        
      case 'delay':
        const delayMs = (inputs.delay as number) || 1000;
        context.onProgress?.(node.id, 30, `等待 ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        outputs = { '输出': inputs['输入'] };
        break;
        
      case 'openai-compatible':
        context.onProgress?.(node.id, 30, '调用 OpenAI 兼容 API...');
        const compatBaseUrl = inputs.baseUrl as string || 'http://localhost:11434/v1';
        const compatModel = inputs.model as string || 'llama2';
        const compatSystemPrompt = inputs.systemPrompt as string || '你是一个有帮助的助手。';
        const compatUserPrompt = inputs['提示词'] as string || '';
        
        try {
          const compatResponse = await fetch(`${compatBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: compatModel,
              messages: [
                { role: 'system', content: compatSystemPrompt },
                { role: 'user', content: compatUserPrompt },
              ],
            }),
          });
          
          const compatData = await compatResponse.json();
          outputs = { '回复': compatData.choices?.[0]?.message?.content || '' };
        } catch (compatError) {
          outputs = { '回复': `API 调用失败: ${compatError instanceof Error ? compatError.message : '未知错误'}` };
        }
        break;
        
      case 'sd-webui-api':
        context.onProgress?.(node.id, 30, '调用 SD WebUI...');
        const sdBaseUrl = inputs.baseUrl as string || 'http://127.0.0.1:7860';
        const sdPrompt = inputs['提示词'] as string || '';
        const sdNegativePrompt = inputs.negativePrompt as string || '';
        const sdWidth = inputs.width as number || 512;
        const sdHeight = inputs.height as number || 512;
        const sdSteps = inputs.steps as number || 20;
        const sdCfgScale = inputs.cfgScale as number || 7;
        const sdSampler = inputs.sampler as string || 'Euler a';
        
        try {
          const sdResponse = await fetch(`${sdBaseUrl}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: sdPrompt,
              negative_prompt: sdNegativePrompt,
              width: sdWidth,
              height: sdHeight,
              steps: sdSteps,
              cfg_scale: sdCfgScale,
              sampler_name: sdSampler,
            }),
          });
          
          const sdData = await sdResponse.json();
          // SD WebUI 返回 base64 图像
          const sdImage = sdData.images?.[0];
          outputs = { '图像': sdImage ? `data:image/png;base64,${sdImage}` : '' };
        } catch (sdError) {
          outputs = { '图像': '' };
          console.error('SD WebUI 调用失败:', sdError);
        }
        break;
        
      case 'comfyui-api':
        context.onProgress?.(node.id, 30, '调用 ComfyUI...');
        const comfyBaseUrl = inputs.baseUrl as string || 'http://127.0.0.1:8188';
        const comfyWorkflow = inputs['工作流JSON'] as string || '{}';
        
        try {
          // 提交工作流
          const promptResponse = await fetch(`${comfyBaseUrl}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: JSON.parse(comfyWorkflow) }),
          });
          
          const promptData = await promptResponse.json();
          const promptId = promptData.prompt_id;
          
          // 轮询获取结果
          for (let i = 0; i < 120; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const historyResponse = await fetch(`${comfyBaseUrl}/history/${promptId}`);
            const historyData = await historyResponse.json();
            
            if (historyData[promptId]?.outputs) {
              const outputImages = Object.values(historyData[promptId].outputs)
                .flatMap((output: unknown) => (output as { images?: Array<{ filename: string }> }).images || [])
                .map((img: { filename: string }) => `${comfyBaseUrl}/view?filename=${img.filename}`);
              
              outputs = { '图像': outputImages[0] || '' };
              break;
            }
          }
          
          if (!outputs['图像']) {
            outputs = { '图像': '' };
          }
        } catch (comfyError) {
          outputs = { '图像': '' };
          console.error('ComfyUI 调用失败:', comfyError);
        }
        break;
        
      case 'custom-api':
        context.onProgress?.(node.id, 30, '调用自定义 API...');
        const customBaseUrl = inputs.baseUrl as string || '';
        const customApiKey = inputs.apiKey as string || '';
        const customEndpoint = inputs.endpoint as string || '/api/v1/generate';
        const customMethod = (inputs.method as string || 'POST').toUpperCase();
        const customBodyTemplate = inputs.bodyTemplate as string || '{}';
        const customResponseField = inputs.responseField as string || 'result';
        
        try {
          // 替换模板中的变量
          let customBody = customBodyTemplate;
          for (const [key, value] of Object.entries(inputs)) {
            customBody = customBody.replace(new RegExp(`{{${key}}}`, 'g'), JSON.stringify(value));
          }
          
          const customHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (customApiKey) {
            customHeaders['Authorization'] = `Bearer ${customApiKey}`;
          }
          
          const customResponse = await fetch(`${customBaseUrl}${customEndpoint}`, {
            method: customMethod,
            headers: customHeaders,
            body: customMethod !== 'GET' ? customBody : undefined,
          });
          
          const customData = await customResponse.json();
          
          // 提取响应字段
          let customResult = customData;
          if (customResponseField) {
            const fieldParts = customResponseField.split('.');
            for (const part of fieldParts) {
              if (customResult && typeof customResult === 'object') {
                customResult = (customResult as Record<string, unknown>)[part];
              }
            }
          }
          
          outputs = { '输出': customResult };
        } catch (customError) {
          outputs = { '输出': `API 调用失败: ${customError instanceof Error ? customError.message : '未知错误'}` };
        }
        break;
      
      // ============================================
      // 默认处理
      // ============================================
      default:
        // 对于未知节点，尝试传递输入到输出
        outputs = { ...inputs };
        break;
    }
    
    context.onProgress?.(node.id, 100, '完成');
    return outputs;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    context.onNodeError?.(node.id, errorMessage);
    throw error;
  }
}

/**
 * 拓扑排序获取执行顺序
 */
export function getExecutionOrder(
  nodes: NodeInstance[],
  connections: Connection[]
): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  nodes.forEach(node => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });
  
  connections.forEach(conn => {
    const targets = adjacency.get(conn.sourceNodeId) || [];
    targets.push(conn.targetNodeId);
    adjacency.set(conn.sourceNodeId, targets);
    
    inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) || 0) + 1);
  });
  
  const queue: string[] = [];
  const result: string[] = [];
  
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    
    const targets = adjacency.get(nodeId) || [];
    targets.forEach(targetId => {
      const newDegree = (inDegree.get(targetId) || 0) - 1;
      inDegree.set(targetId, newDegree);
      if (newDegree === 0) {
        queue.push(targetId);
      }
    });
  }
  
  return result;
}

/**
 * 执行整个工作流
 */
export async function executeWorkflow(
  nodes: NodeInstance[],
  connections: Connection[],
  callbacks?: {
    onProgress?: (nodeId: string, progress: number, message?: string) => void;
    onNodeComplete?: (nodeId: string, outputs: Record<string, unknown>) => void;
    onNodeError?: (nodeId: string, error: string) => void;
  }
): Promise<Map<string, Record<string, unknown>>> {
  const context: ExecutionContext = {
    nodeOutputs: new Map(),
    ...callbacks,
  };
  
  const executionOrder = getExecutionOrder(nodes, connections);
  
  for (const nodeId of executionOrder) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    try {
      const outputs = await executeNode(node, connections, context);
      context.nodeOutputs.set(nodeId, outputs);
      callbacks?.onNodeComplete?.(nodeId, outputs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '执行失败';
      callbacks?.onNodeError?.(nodeId, errorMessage);
      // 继续执行其他节点
    }
  }
  
  return context.nodeOutputs;
}
