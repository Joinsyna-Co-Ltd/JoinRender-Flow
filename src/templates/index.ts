import type { WorkflowTemplate } from '../types';

/**
 * 角色创建器工作流模板
 * 
 * 核心工作流逻辑：
 * 1. 输入 → 小说角色描述
 * 2. LLM 节点 → 转换为 JSON 格式 Prompt
 * 3. 角色参考（定海神针） → 生成标准证件照 T-Pose
 * 4. 动作生成 → 并发生成多个镜头，强制引用参考图
 * 5. 视频生成 → 转视频
 */
export const characterCreatorTemplate: WorkflowTemplate = {
  id: 'character-creator',
  name: '角色创建器',
  description: '角色一致性流水线：从小说描述到多镜头视频，脸完全不崩',
  icon: '👤',
  
  nodes: [
    // 步骤 1: 文本输入 - 小说角色描述
    {
      id: 'input-1',
      type: 'text-input',
      position: { x: 50, y: 200 },
      data: {
        text: '赛博朋克风格的年轻男性黑客，短发，戴着发光的AR眼镜，穿着黑色皮夹克，眼神锐利而自信。',
      },
      inputs: [],
      outputs: [{ id: 'output-0', name: '文本', type: 'text', direction: 'output' }],
    },
    
    // 步骤 2: LLM 节点 - 转换为 JSON 格式
    {
      id: 'llm-1',
      type: 'llm',
      position: { x: 300, y: 150 },
      data: {
        systemPrompt: `角色：科幻电影导演
任务：将用户的小说片段转换为3个不同的视觉提示词
输出格式：JSON
1. 角色参考提示词（全身，中性光照，绿色背景）
2. 动作镜头提示词（电影级光照，动态角度）
3. 特写镜头提示词（特写，情感表达）`,
      },
      inputs: [{ id: 'input-0', name: '输入文本', type: 'text', direction: 'input' }],
      outputs: [{ id: 'output-0', name: '输出文本', type: 'text', direction: 'output' }],
    },
    
    // 步骤 2.5: JSON 分离器 - 分离提示词
    {
      id: 'splitter-1',
      type: 'json-splitter',
      position: { x: 550, y: 150 },
      data: {},
      inputs: [{ id: 'input-0', name: 'JSON 文本', type: 'text', direction: 'input' }],
      outputs: [
        { id: 'output-0', name: '提示词 1', type: 'text', direction: 'output' },
        { id: 'output-1', name: '提示词 2', type: 'text', direction: 'output' },
        { id: 'output-2', name: '提示词 3', type: 'text', direction: 'output' },
      ],
    },
    
    // 步骤 3: 角色参考 - 定海神针
    {
      id: 'ref-1',
      type: 'character-reference-gen',
      position: { x: 800, y: 50 },
      data: {
        pose: 'T-Pose',
        lighting: 'neutral',
        background: 'green',
        style: 'full-body',
      },
      inputs: [{ id: 'input-0', name: '角色提示词', type: 'text', direction: 'input' }],
      outputs: [{ id: 'output-0', name: '参考图像', type: 'image', direction: 'output' }],
    },
    
    // 步骤 4a: 动作镜头 1
    {
      id: 'gen-1',
      type: 'image-gen',
      position: { x: 800, y: 200 },
      data: {
        model: 'sd-xl',
        aspectRatio: '16:9',
      },
      inputs: [
        { id: 'input-0', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-1', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '图像', type: 'image', direction: 'output' }],
    },
    
    // 步骤 4b: 动作镜头 2 - 特写
    {
      id: 'gen-2',
      type: 'image-gen',
      position: { x: 800, y: 350 },
      data: {
        model: 'sd-xl',
        aspectRatio: '16:9',
      },
      inputs: [
        { id: 'input-0', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-1', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '图像', type: 'image', direction: 'output' }],
    },
    
    // 步骤 5a: 视频生成 - 动作视频
    {
      id: 'video-1',
      type: 'video-gen',
      position: { x: 1100, y: 150 },
      data: {
        duration: 5,
        motion: 'auto',
      },
      inputs: [
        { id: 'input-0', name: '图像', type: 'image', direction: 'input' },
        { id: 'input-1', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-2', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '视频', type: 'video', direction: 'output' }],
    },
    
    // 步骤 5b: 视频生成 - 特写视频
    {
      id: 'video-2',
      type: 'video-gen',
      position: { x: 1100, y: 350 },
      data: {
        duration: 3,
        motion: 'subtle',
      },
      inputs: [
        { id: 'input-0', name: '图像', type: 'image', direction: 'input' },
        { id: 'input-1', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-2', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '视频', type: 'video', direction: 'output' }],
    },
    
    // 输出 1
    {
      id: 'output-1',
      type: 'video-output',
      position: { x: 1400, y: 150 },
      data: { format: 'mp4', quality: 'high' },
      inputs: [{ id: 'input-0', name: '视频', type: 'video', direction: 'input' }],
      outputs: [],
    },
    
    // 输出 2
    {
      id: 'output-2',
      type: 'video-output',
      position: { x: 1400, y: 350 },
      data: { format: 'mp4', quality: 'high' },
      inputs: [{ id: 'input-0', name: '视频', type: 'video', direction: 'input' }],
      outputs: [],
    },
  ],
  
  connections: [
    // 输入 → LLM
    { id: 'c1', sourceNodeId: 'input-1', sourcePortId: 'output-0', targetNodeId: 'llm-1', targetPortId: 'input-0' },
    // LLM → JSON 分离器
    { id: 'c2', sourceNodeId: 'llm-1', sourcePortId: 'output-0', targetNodeId: 'splitter-1', targetPortId: 'input-0' },
    // JSON 分离器 → 角色参考 (提示词 1)
    { id: 'c3', sourceNodeId: 'splitter-1', sourcePortId: 'output-0', targetNodeId: 'ref-1', targetPortId: 'input-0' },
    // JSON 分离器 → 图像生成 1 (提示词 2)
    { id: 'c4', sourceNodeId: 'splitter-1', sourcePortId: 'output-1', targetNodeId: 'gen-1', targetPortId: 'input-0' },
    // JSON 分离器 → 图像生成 2 (提示词 3)
    { id: 'c5', sourceNodeId: 'splitter-1', sourcePortId: 'output-2', targetNodeId: 'gen-2', targetPortId: 'input-0' },
    // 角色参考 → 图像生成 1 (锁定一致性！)
    { id: 'c6', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'gen-1', targetPortId: 'input-1' },
    // 角色参考 → 图像生成 2 (锁定一致性！)
    { id: 'c7', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'gen-2', targetPortId: 'input-1' },
    // 图像生成 1 → 视频 1
    { id: 'c8', sourceNodeId: 'gen-1', sourcePortId: 'output-0', targetNodeId: 'video-1', targetPortId: 'input-0' },
    // 图像生成 2 → 视频 2
    { id: 'c9', sourceNodeId: 'gen-2', sourcePortId: 'output-0', targetNodeId: 'video-2', targetPortId: 'input-0' },
    // 角色参考 → 视频 1 (锁定一致性！)
    { id: 'c10', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'video-1', targetPortId: 'input-2' },
    // 角色参考 → 视频 2 (锁定一致性！)
    { id: 'c11', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'video-2', targetPortId: 'input-2' },
    // 视频 1 → 输出 1
    { id: 'c12', sourceNodeId: 'video-1', sourcePortId: 'output-0', targetNodeId: 'output-1', targetPortId: 'input-0' },
    // 视频 2 → 输出 2
    { id: 'c13', sourceNodeId: 'video-2', sourcePortId: 'output-0', targetNodeId: 'output-2', targetPortId: 'input-0' },
  ],
};

/**
 * 科幻宇宙生成器模板
 */
export const sciFiUniverseTemplate: WorkflowTemplate = {
  id: 'sci-fi-universe',
  name: '科幻宇宙生成器',
  description: '从小说片段到角色一致的多镜头视频',
  icon: '🚀',
  
  nodes: [
    // 输入
    {
      id: 'input-1',
      type: 'text-input',
      position: { x: 50, y: 250 },
      data: {
        text: '在霓虹闪烁的未来都市中，一位身穿破旧机械外骨骼的女性战士站在摩天大楼顶端。她有着银白色的短发，左眼是发光的机械义眼，脸上有一道从额头延伸到脸颊的伤疤。',
      },
      inputs: [],
      outputs: [{ id: 'output-0', name: '文本', type: 'text', direction: 'output' }],
    },
    
    // LLM
    {
      id: 'llm-1',
      type: 'llm',
      position: { x: 300, y: 200 },
      data: {
        systemPrompt: `角色：科幻电影导演
任务：将用户的小说片段转换为3个不同的视觉提示词
输出格式：JSON，包含 characterRef, actionShot, closeUp 三个键

characterRef: 全身 T-pose，中性工作室光照，纯绿色背景，角色参考表风格，高度细节
actionShot: 电影级广角镜头，戏剧性光照，动态摄像机角度，动作场景，赛博朋克城市背景
closeUp: 极致特写肖像，情感表达，戏剧性轮廓光，浅景深`,
      },
      inputs: [{ id: 'input-0', name: '输入文本', type: 'text', direction: 'input' }],
      outputs: [{ id: 'output-0', name: '输出文本', type: 'text', direction: 'output' }],
    },
    
    // JSON 分离器
    {
      id: 'splitter-1',
      type: 'json-splitter',
      position: { x: 550, y: 200 },
      data: {},
      inputs: [{ id: 'input-0', name: 'JSON 文本', type: 'text', direction: 'input' }],
      outputs: [
        { id: 'output-0', name: '提示词 1', type: 'text', direction: 'output' },
        { id: 'output-1', name: '提示词 2', type: 'text', direction: 'output' },
        { id: 'output-2', name: '提示词 3', type: 'text', direction: 'output' },
      ],
    },
    
    // 角色参考 - 定海神针
    {
      id: 'ref-1',
      type: 'character-reference-gen',
      position: { x: 800, y: 50 },
      data: {
        pose: 'T-Pose',
        lighting: 'neutral',
        background: 'green',
      },
      inputs: [{ id: 'input-0', name: '角色提示词', type: 'text', direction: 'input' }],
      outputs: [{ id: 'output-0', name: '参考图像', type: 'image', direction: 'output' }],
    },
    
    // 动作镜头
    {
      id: 'gen-action',
      type: 'advanced-image-gen',
      position: { x: 800, y: 200 },
      data: { aspectRatio: '21:9', style: 'cinematic' },
      inputs: [
        { id: 'input-0', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-1', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '图像', type: 'image', direction: 'output' }],
    },
    
    // 特写镜头
    {
      id: 'gen-closeup',
      type: 'advanced-image-gen',
      position: { x: 800, y: 350 },
      data: { aspectRatio: '1:1', style: 'portrait' },
      inputs: [
        { id: 'input-0', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-1', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '图像', type: 'image', direction: 'output' }],
    },
    
    // 视频生成 - 动作
    {
      id: 'video-action',
      type: 'video-gen',
      position: { x: 1100, y: 150 },
      data: { duration: 5, motion: 'dynamic' },
      inputs: [
        { id: 'input-0', name: '图像', type: 'image', direction: 'input' },
        { id: 'input-1', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-2', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '视频', type: 'video', direction: 'output' }],
    },
    
    // 视频生成 - 特写
    {
      id: 'video-closeup',
      type: 'video-gen',
      position: { x: 1100, y: 350 },
      data: { duration: 3, motion: 'subtle' },
      inputs: [
        { id: 'input-0', name: '图像', type: 'image', direction: 'input' },
        { id: 'input-1', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-2', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '视频', type: 'video', direction: 'output' }],
    },
    
    // 分镜板输出
    {
      id: 'storyboard-1',
      type: 'storyboard-output',
      position: { x: 1100, y: 500 },
      data: { layout: 'horizontal' },
      inputs: [
        { id: 'input-0', name: '镜头 1', type: 'image', direction: 'input' },
        { id: 'input-1', name: '镜头 2', type: 'image', direction: 'input' },
        { id: 'input-2', name: '镜头 3', type: 'image', direction: 'input' },
      ],
      outputs: [],
    },
    
    // 视频输出
    {
      id: 'output-1',
      type: 'video-output',
      position: { x: 1400, y: 150 },
      data: { format: 'mp4', quality: 'high' },
      inputs: [{ id: 'input-0', name: '视频', type: 'video', direction: 'input' }],
      outputs: [],
    },
    {
      id: 'output-2',
      type: 'video-output',
      position: { x: 1400, y: 350 },
      data: { format: 'mp4', quality: 'high' },
      inputs: [{ id: 'input-0', name: '视频', type: 'video', direction: 'input' }],
      outputs: [],
    },
  ],
  
  connections: [
    { id: 'c1', sourceNodeId: 'input-1', sourcePortId: 'output-0', targetNodeId: 'llm-1', targetPortId: 'input-0' },
    { id: 'c2', sourceNodeId: 'llm-1', sourcePortId: 'output-0', targetNodeId: 'splitter-1', targetPortId: 'input-0' },
    { id: 'c3', sourceNodeId: 'splitter-1', sourcePortId: 'output-0', targetNodeId: 'ref-1', targetPortId: 'input-0' },
    { id: 'c4', sourceNodeId: 'splitter-1', sourcePortId: 'output-1', targetNodeId: 'gen-action', targetPortId: 'input-0' },
    { id: 'c5', sourceNodeId: 'splitter-1', sourcePortId: 'output-2', targetNodeId: 'gen-closeup', targetPortId: 'input-0' },
    // 关键：参考图像锁定
    { id: 'c6', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'gen-action', targetPortId: 'input-1' },
    { id: 'c7', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'gen-closeup', targetPortId: 'input-1' },
    { id: 'c8', sourceNodeId: 'gen-action', sourcePortId: 'output-0', targetNodeId: 'video-action', targetPortId: 'input-0' },
    { id: 'c9', sourceNodeId: 'gen-closeup', sourcePortId: 'output-0', targetNodeId: 'video-closeup', targetPortId: 'input-0' },
    // 视频生成也要锁定参考
    { id: 'c10', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'video-action', targetPortId: 'input-2' },
    { id: 'c11', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'video-closeup', targetPortId: 'input-2' },
    { id: 'c12', sourceNodeId: 'video-action', sourcePortId: 'output-0', targetNodeId: 'output-1', targetPortId: 'input-0' },
    { id: 'c13', sourceNodeId: 'video-closeup', sourcePortId: 'output-0', targetNodeId: 'output-2', targetPortId: 'input-0' },
    // 分镜板
    { id: 'c14', sourceNodeId: 'ref-1', sourcePortId: 'output-0', targetNodeId: 'storyboard-1', targetPortId: 'input-0' },
    { id: 'c15', sourceNodeId: 'gen-action', sourcePortId: 'output-0', targetNodeId: 'storyboard-1', targetPortId: 'input-1' },
    { id: 'c16', sourceNodeId: 'gen-closeup', sourcePortId: 'output-0', targetNodeId: 'storyboard-1', targetPortId: 'input-2' },
  ],
};

/**
 * 简单图像生成模板
 */
export const simpleImageTemplate: WorkflowTemplate = {
  id: 'simple-image',
  name: '简单图像生成',
  description: '最简单的文生图工作流',
  icon: '🖼️',
  
  nodes: [
    {
      id: 'input-1',
      type: 'text-input',
      position: { x: 100, y: 200 },
      data: { text: '美丽的海边日落，电影级光照，8K' },
      inputs: [],
      outputs: [{ id: 'output-0', name: '文本', type: 'text', direction: 'output' }],
    },
    {
      id: 'gen-1',
      type: 'advanced-image-gen',
      position: { x: 400, y: 200 },
      data: { aspectRatio: '16:9', style: 'cinematic' },
      inputs: [
        { id: 'input-0', name: '提示词', type: 'text', direction: 'input' },
        { id: 'input-1', name: '参考图像', type: 'image', direction: 'input', isReferenceInput: true },
      ],
      outputs: [{ id: 'output-0', name: '图像', type: 'image', direction: 'output' }],
    },
    {
      id: 'output-1',
      type: 'image-output',
      position: { x: 700, y: 200 },
      data: { format: 'png', quality: 90 },
      inputs: [{ id: 'input-0', name: '图像', type: 'image', direction: 'input' }],
      outputs: [],
    },
  ],
  
  connections: [
    { id: 'c1', sourceNodeId: 'input-1', sourcePortId: 'output-0', targetNodeId: 'gen-1', targetPortId: 'input-0' },
    { id: 'c2', sourceNodeId: 'gen-1', sourcePortId: 'output-0', targetNodeId: 'output-1', targetPortId: 'input-0' },
  ],
};

// 所有模板
export const workflowTemplates: WorkflowTemplate[] = [
  characterCreatorTemplate,
  sciFiUniverseTemplate,
  simpleImageTemplate,
];
