/**
 * 工作流导入导出服务
 */

import type { NodeInstance, Connection, ComfyUIWorkflow, ComfyUINode, ComfyUILink } from '../types';
import { getNodeDefinition } from '../nodes/definitions';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// 工作流导出
// ============================================

export interface WorkflowData {
  version: string;
  name?: string;
  description?: string;
  nodes: NodeInstance[];
  connections: Connection[];
  savedAt: string;
  canvas?: {
    zoom: number;
    offset: { x: number; y: number };
  };
}

export function exportWorkflow(
  nodes: NodeInstance[],
  connections: Connection[],
  options?: { name?: string; description?: string; canvas?: WorkflowData['canvas'] }
): WorkflowData {
  return {
    version: '1.0.0',
    name: options?.name || `Workflow ${new Date().toLocaleDateString()}`,
    description: options?.description,
    nodes: JSON.parse(JSON.stringify(nodes)), // deep clone
    connections: JSON.parse(JSON.stringify(connections)),
    savedAt: new Date().toISOString(),
    canvas: options?.canvas,
  };
}

export function downloadWorkflow(data: WorkflowData, filename?: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `workflow-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// 工作流导入
// ============================================

export function importWorkflow(jsonString: string): { nodes: NodeInstance[]; connections: Connection[] } {
  const data = JSON.parse(jsonString);
  
  // 检测格式
  if (isComfyUIFormat(data)) {
    return importComfyUIWorkflow(data);
  }
  
  // JoinRender 格式
  if (data.nodes && data.connections) {
    return {
      nodes: data.nodes,
      connections: data.connections,
    };
  }
  
  throw new Error('无法识别的工作流格式');
}

function isComfyUIFormat(data: unknown): data is ComfyUIWorkflow {
  return (
    typeof data === 'object' &&
    data !== null &&
    'last_node_id' in data &&
    'nodes' in data &&
    'links' in data
  );
}

// ============================================
// ComfyUI 工作流导入
// ============================================

// ComfyUI 类型到 JoinRender 类型的映射
const comfyTypeMap: Record<string, string> = {
  'MODEL': 'model',
  'CLIP': 'clip',
  'VAE': 'vae',
  'LATENT': 'latent',
  'IMAGE': 'image',
  'MASK': 'mask',
  'CONDITIONING': 'conditioning',
  'CONTROL_NET': 'control_net',
  'INT': 'int',
  'FLOAT': 'float',
  'STRING': 'text',
  'BOOLEAN': 'boolean',
};

// ComfyUI 节点类型到 JoinRender 类型的映射
const comfyNodeTypeMap: Record<string, string> = {
  'CheckpointLoaderSimple': 'checkpoint-loader',
  'KSampler': 'ksampler',
  'CLIPTextEncode': 'clip-text-encode',
  'VAEDecode': 'vae-decode',
  'VAEEncode': 'vae-encode',
  'EmptyLatentImage': 'empty-latent',
  'SaveImage': 'image-output',
  'LoadImage': 'image-upload',
  'PreviewImage': 'image-output',
};

export function importComfyUIWorkflow(
  workflow: ComfyUIWorkflow
): { nodes: NodeInstance[]; connections: Connection[] } {
  const nodes: NodeInstance[] = [];
  const connections: Connection[] = [];
  
  // ID 映射表
  const nodeIdMap = new Map<number, string>();
  
  // 转换节点
  for (const comfyNode of workflow.nodes) {
    const nodeId = uuidv4();
    nodeIdMap.set(comfyNode.id, nodeId);
    
    const nodeType = comfyNodeTypeMap[comfyNode.type] || `comfy-${comfyNode.type.toLowerCase()}`;
    const definition = getNodeDefinition(nodeType);
    
    // 构建输入端口
    const inputs = (comfyNode.inputs || []).map((input, index) => ({
      id: `input-${index}`,
      name: input.name,
      type: (comfyTypeMap[input.type] || 'any') as any,
      direction: 'input' as const,
      connected: input.link !== null,
    }));
    
    // 构建输出端口
    const outputs = (comfyNode.outputs || []).map((output, index) => ({
      id: `output-${index}`,
      name: output.name,
      type: (comfyTypeMap[output.type] || 'any') as any,
      direction: 'output' as const,
      connected: output.links !== null && output.links.length > 0,
    }));
    
    // 构建节点数据
    const data: Record<string, unknown> = {};
    if (comfyNode.widgets_values) {
      // 尝试从定义中获取 widget 名称
      if (definition) {
        definition.inputs.forEach((input, index) => {
          if (input.widget && comfyNode.widgets_values && comfyNode.widgets_values[index] !== undefined) {
            data[input.name] = comfyNode.widgets_values[index];
          }
        });
      } else {
        // 没有定义时，使用通用命名
        comfyNode.widgets_values.forEach((value, index) => {
          data[`param_${index}`] = value;
        });
      }
    }
    
    const node: NodeInstance = {
      id: nodeId,
      type: nodeType,
      position: { x: comfyNode.pos[0], y: comfyNode.pos[1] },
      data,
      inputs,
      outputs,
      size: comfyNode.size ? { width: comfyNode.size[0], height: comfyNode.size[1] } : undefined,
    };
    
    nodes.push(node);
  }
  
  // 转换连接
  for (const link of workflow.links) {
    const [linkId, sourceNodeId, sourceSlot, targetNodeId, targetSlot, type] = link;
    
    const sourceId = nodeIdMap.get(sourceNodeId);
    const targetId = nodeIdMap.get(targetNodeId);
    
    if (sourceId && targetId) {
      connections.push({
        id: uuidv4(),
        sourceNodeId: sourceId,
        sourcePortId: `output-${sourceSlot}`,
        targetNodeId: targetId,
        targetPortId: `input-${targetSlot}`,
        type: (comfyTypeMap[type] || 'any') as any,
      });
    }
  }
  
  return { nodes, connections };
}

// ============================================
// ComfyUI 工作流导出
// ============================================

export function exportToComfyUIWorkflow(
  nodes: NodeInstance[],
  connections: Connection[]
): ComfyUIWorkflow {
  const comfyNodes: ComfyUINode[] = [];
  const comfyLinks: ComfyUILink[] = [];
  
  // ID 映射表
  const nodeIdMap = new Map<string, number>();
  let nodeIdCounter = 1;
  let linkIdCounter = 1;
  
  // 反向类型映射
  const reverseTypeMap: Record<string, string> = {};
  for (const [comfy, join] of Object.entries(comfyTypeMap)) {
    reverseTypeMap[join] = comfy;
  }
  
  // 反向节点类型映射
  const reverseNodeTypeMap: Record<string, string> = {};
  for (const [comfy, join] of Object.entries(comfyNodeTypeMap)) {
    reverseNodeTypeMap[join] = comfy;
  }
  
  // 转换节点
  for (const node of nodes) {
    const comfyId = nodeIdCounter++;
    nodeIdMap.set(node.id, comfyId);
    
    // 获取 ComfyUI 类型名
    let comfyType = reverseNodeTypeMap[node.type];
    if (!comfyType) {
      // 尝试从 comfy- 前缀恢复
      if (node.type.startsWith('comfy-')) {
        comfyType = node.type.replace('comfy-', '').replace(/-/g, '');
        // 首字母大写
        comfyType = comfyType.charAt(0).toUpperCase() + comfyType.slice(1);
      } else {
        comfyType = node.type;
      }
    }
    
    const comfyNode: ComfyUINode = {
      id: comfyId,
      type: comfyType,
      pos: [node.position.x, node.position.y],
      size: node.size ? [node.size.width, node.size.height] : [200, 100],
      inputs: node.inputs.map(input => ({
        name: input.name,
        type: reverseTypeMap[input.type] || 'STRING',
        link: null, // 后面填充
      })),
      outputs: node.outputs.map((output, index) => ({
        name: output.name,
        type: reverseTypeMap[output.type] || 'STRING',
        links: [],
        slot_index: index,
      })),
      widgets_values: Object.values(node.data),
    };
    
    comfyNodes.push(comfyNode);
  }
  
  // 转换连接
  for (const conn of connections) {
    const sourceComfyId = nodeIdMap.get(conn.sourceNodeId);
    const targetComfyId = nodeIdMap.get(conn.targetNodeId);
    
    if (sourceComfyId === undefined || targetComfyId === undefined) continue;
    
    const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
    const targetNode = nodes.find(n => n.id === conn.targetNodeId);
    if (!sourceNode || !targetNode) continue;
    
    const sourceSlot = sourceNode.outputs.findIndex(o => o.id === conn.sourcePortId);
    const targetSlot = targetNode.inputs.findIndex(i => i.id === conn.targetPortId);
    if (sourceSlot === -1 || targetSlot === -1) continue;
    
    const sourceOutput = sourceNode.outputs[sourceSlot];
    const linkId = linkIdCounter++;
    
    // 创建连接
    const link: ComfyUILink = [
      linkId,
      sourceComfyId,
      sourceSlot,
      targetComfyId,
      targetSlot,
      reverseTypeMap[sourceOutput.type] || 'STRING',
    ];
    comfyLinks.push(link);
    
    // 更新节点的连接信息
    const comfySourceNode = comfyNodes.find(n => n.id === sourceComfyId);
    const comfyTargetNode = comfyNodes.find(n => n.id === targetComfyId);
    
    if (comfySourceNode?.outputs?.[sourceSlot]) {
      comfySourceNode.outputs[sourceSlot].links = comfySourceNode.outputs[sourceSlot].links || [];
      comfySourceNode.outputs[sourceSlot].links!.push(linkId);
    }
    
    if (comfyTargetNode?.inputs?.[targetSlot]) {
      comfyTargetNode.inputs[targetSlot].link = linkId;
    }
  }
  
  return {
    last_node_id: nodeIdCounter - 1,
    last_link_id: linkIdCounter - 1,
    nodes: comfyNodes,
    links: comfyLinks,
  };
}

// ============================================
// 工作流验证
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWorkflow(
  nodes: NodeInstance[],
  connections: Connection[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 检查是否有节点
  if (nodes.length === 0) {
    warnings.push('工作流为空');
    return { valid: true, errors, warnings };
  }
  
  // 检查孤立节点
  const connectedNodeIds = new Set<string>();
  for (const conn of connections) {
    connectedNodeIds.add(conn.sourceNodeId);
    connectedNodeIds.add(conn.targetNodeId);
  }
  
  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
      warnings.push(`节点 "${node.type}" 未连接到其他节点`);
    }
  }
  
  // 检查循环依赖
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const outgoing = connections.filter(c => c.sourceNodeId === nodeId);
    for (const conn of outgoing) {
      if (!visited.has(conn.targetNodeId)) {
        if (hasCycle(conn.targetNodeId)) return true;
      } else if (recursionStack.has(conn.targetNodeId)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push('工作流存在循环依赖');
        break;
      }
    }
  }
  
  // 检查必需的输入是否已连接
  for (const node of nodes) {
    const definition = getNodeDefinition(node.type);
    if (definition) {
      for (const input of node.inputs) {
        const defInput = definition.inputs.find(i => i.name === input.name);
        // 如果输入没有 widget（不能手动输入值）且未连接，则是错误
        if (!input.widget && !input.connected) {
          const hasConnection = connections.some(
            c => c.targetNodeId === node.id && c.targetPortId === input.id
          );
          if (!hasConnection) {
            warnings.push(`节点 "${definition.name}" 的输入 "${input.name}" 未连接`);
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
