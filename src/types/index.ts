// 节点编辑器类型定义

// 端口类型 - 支持 ComfyUI 的所有类型
export type PortType = 
  | 'image' 
  | 'video' 
  | 'text' 
  | 'audio'
  | 'model3d'
  | 'any'
  // ComfyUI 类型
  | 'latent'
  | 'model'
  | 'clip'
  | 'vae'
  | 'conditioning'
  | 'mask'
  | 'control_net'
  | 'int'
  | 'float'
  | 'boolean'
  | 'combo';

// 端口方向
export type PortDirection = 'input' | 'output';

// Widget 配置（用于节点内的输入控件）
export interface WidgetConfig {
  type: 'text' | 'number' | 'slider' | 'combo' | 'toggle' | 'textarea';
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

// 端口定义
export interface Port {
  id: string;
  name: string;
  type: PortType;
  direction: PortDirection;
  connected?: boolean;
  // Reference Image 标记 - 用于角色一致性
  isReferenceInput?: boolean;
  // Widget 配置
  widget?: WidgetConfig;
}

// 节点类别
export type NodeCategory = 
  | 'input' 
  | 'llm' 
  | 'media' 
  | 'audio'
  | '3d'
  | 'output'
  // ComfyUI 类别
  | 'loaders'
  | 'sampling'
  | 'conditioning'
  | 'latent'
  | 'image'
  | 'mask'
  | 'controlnet'
  | 'ipadapter'
  | 'custom';

// 节点类型定义
export interface NodeDefinition {
  type: string;
  name: string;
  category: NodeCategory;
  color: string;
  icon: string;
  inputs: Omit<Port, 'id' | 'direction'>[];
  outputs: Omit<Port, 'id' | 'direction'>[];
  defaultData?: Record<string, unknown>;
  description?: string;
  // 插件相关
  isCustom?: boolean;
  pluginId?: string;
  comfyClass?: string;
}

// 节点实例
export interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  inputs: Port[];
  outputs: Port[];
  size?: { width: number; height: number };
  collapsed?: boolean;
}

// 连接线
export interface Connection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  type?: PortType;
}

// 工作流
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: NodeInstance[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
}

// 画布状态
export interface CanvasState {
  zoom: number;
  offset: { x: number; y: number };
}

// 拖拽状态
export interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startPosition: { x: number; y: number } | null;
}

// 连接状态
export interface ConnectionState {
  isConnecting: boolean;
  sourceNodeId: string | null;
  sourcePortId: string | null;
  sourcePortType: PortType | null;
  mousePosition: { x: number; y: number } | null;
}

// 执行状态
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error';

export interface NodeExecutionState {
  nodeId: string;
  status: ExecutionStatus;
  progress?: number;
  result?: unknown;
  error?: string;
  message?: string;
}

// 工作流模板
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: NodeInstance[];
  connections: Connection[];
}

// ============================================
// ComfyUI 相关类型
// ============================================

// ComfyUI 节点定义
export interface ComfyUINodeDefinition {
  name: string;
  display_name: string;
  category: string;
  input: {
    required?: Record<string, ComfyUIInputSpec>;
    optional?: Record<string, ComfyUIInputSpec>;
  };
  output: string[];
  output_name?: string[];
  description?: string;
}

// ComfyUI 输入规格
export type ComfyUIInputSpec = 
  | [string]  // 简单类型
  | [string, { default?: unknown; min?: number; max?: number; step?: number }]  // 带配置的类型
  | [string[]]  // 下拉选项
  | [string[], { default?: string }];  // 带默认值的下拉选项

// ComfyUI 工作流格式
export interface ComfyUIWorkflow {
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyUINode[];
  links: ComfyUILink[];
  groups?: ComfyUIGroup[];
}

export interface ComfyUINode {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags?: Record<string, unknown>;
  order?: number;
  mode?: number;
  inputs?: { name: string; type: string; link: number | null }[];
  outputs?: { name: string; type: string; links: number[] | null; slot_index?: number }[];
  properties?: Record<string, unknown>;
  widgets_values?: unknown[];
}

export interface ComfyUILink {
  0: number;  // link_id
  1: number;  // source_node_id
  2: number;  // source_slot
  3: number;  // target_node_id
  4: number;  // target_slot
  5: string;  // type
}

export interface ComfyUIGroup {
  title: string;
  bounding: [number, number, number, number];
  color?: string;
}

// 插件定义
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
  nodes: ComfyUINodeDefinition[];
}
