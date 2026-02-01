import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  NodeInstance,
  Connection,
  CanvasState,
  DragState,
  ConnectionState,
  NodeExecutionState,
  NodeDefinition,
  Port,
} from '../types';
import { getNodeDefinitions, getNodeDefinition } from '../nodes/definitions';
import { executeWorkflow } from '../services/executor';

interface WorkflowStore {
  // 节点和连接
  nodes: NodeInstance[];
  connections: Connection[];
  
  // 画布状态
  canvas: CanvasState;
  
  // 拖拽状态
  drag: DragState;
  
  // 连接状态
  connectionState: ConnectionState;
  
  // 执行状态
  executionStates: NodeExecutionState[];
  isRunning: boolean;
  
  // 节点输出数据
  nodeOutputs: Map<string, Record<string, unknown>>;
  
  // 选中的节点
  selectedNodeIds: string[];
  
  // 节点操作
  addNode: (type: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  
  // 连接操作
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  removeConnection: (connectionId: string) => void;
  
  // 画布操作
  setZoom: (zoom: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  
  // 拖拽操作
  startDrag: (nodeId: string, startPosition: { x: number; y: number }) => void;
  updateDrag: (position: { x: number; y: number }) => void;
  endDrag: () => void;
  
  // 连接操作
  startConnection: (nodeId: string, portId: string, portType: string) => void;
  updateConnectionMouse: (position: { x: number; y: number }) => void;
  endConnection: (targetNodeId?: string, targetPortId?: string) => void;
  cancelConnection: () => void;
  
  // 选择操作
  selectNode: (nodeId: string, multi?: boolean) => void;
  clearSelection: () => void;
  
  // 执行操作
  runAll: () => Promise<void>;
  setNodeExecutionState: (state: NodeExecutionState) => void;
  clearExecutionStates: () => void;
  getNodeOutput: (nodeId: string) => Record<string, unknown> | undefined;
  
  // 工作流操作
  clearWorkflow: () => void;
  loadWorkflow: (nodes: NodeInstance[], connections: Connection[]) => void;
}

function createNodeInstance(definition: NodeDefinition, position: { x: number; y: number }): NodeInstance {
  return {
    id: uuidv4(),
    type: definition.type,
    position,
    data: { ...definition.defaultData },
    inputs: definition.inputs.map((input, index) => ({
      id: `input-${index}`,
      name: input.name,
      type: input.type,
      direction: 'input' as const,
      connected: false,
      isReferenceInput: input.isReferenceInput,
      widget: input.widget,
    })),
    outputs: definition.outputs.map((output, index) => ({
      id: `output-${index}`,
      name: output.name,
      type: output.type,
      direction: 'output' as const,
      connected: false,
    })),
  };
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  connections: [],
  canvas: { zoom: 1, offset: { x: 0, y: 0 } },
  drag: { isDragging: false, nodeId: null, startPosition: null },
  connectionState: {
    isConnecting: false,
    sourceNodeId: null,
    sourcePortId: null,
    sourcePortType: null,
    mousePosition: null,
  },
  executionStates: [],
  isRunning: false,
  nodeOutputs: new Map(),
  selectedNodeIds: [],

  addNode: (type, position) => {
    const definition = getNodeDefinition(type);
    if (!definition) {
      console.warn(`未找到节点定义: ${type}`);
      return;
    }
    
    const node = createNodeInstance(definition, position);
    set(state => ({ nodes: [...state.nodes, node] }));
  },

  removeNode: (nodeId) => {
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      connections: state.connections.filter(
        c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
      ),
      selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId),
    }));
  },

  updateNodePosition: (nodeId, position) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, position } : n
      ),
    }));
  },

  updateNodeData: (nodeId, data) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  addConnection: (connection) => {
    const { nodes, connections } = get();
    
    // 检查是否已存在相同的连接
    const exists = connections.some(
      c =>
        c.sourceNodeId === connection.sourceNodeId &&
        c.sourcePortId === connection.sourcePortId &&
        c.targetNodeId === connection.targetNodeId &&
        c.targetPortId === connection.targetPortId
    );
    if (exists) return;
    
    // 检查目标端口是否已有连接（一个输入只能有一个连接）
    const targetHasConnection = connections.some(
      c =>
        c.targetNodeId === connection.targetNodeId &&
        c.targetPortId === connection.targetPortId
    );
    
    let newConnections = connections;
    if (targetHasConnection) {
      // 移除旧连接
      newConnections = connections.filter(
        c =>
          !(c.targetNodeId === connection.targetNodeId &&
            c.targetPortId === connection.targetPortId)
      );
    }
    
    const newConnection: Connection = {
      id: uuidv4(),
      ...connection,
    };
    
    // 更新端口连接状态
    const updatedNodes = nodes.map(node => {
      if (node.id === connection.sourceNodeId) {
        return {
          ...node,
          outputs: node.outputs.map(p =>
            p.id === connection.sourcePortId ? { ...p, connected: true } : p
          ),
        };
      }
      if (node.id === connection.targetNodeId) {
        return {
          ...node,
          inputs: node.inputs.map(p =>
            p.id === connection.targetPortId ? { ...p, connected: true } : p
          ),
        };
      }
      return node;
    });
    
    set({
      connections: [...newConnections, newConnection],
      nodes: updatedNodes,
    });
  },

  removeConnection: (connectionId) => {
    const { nodes, connections } = get();
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return;
    
    // 更新端口连接状态
    const updatedNodes = nodes.map(node => {
      if (node.id === connection.sourceNodeId) {
        const hasOtherConnections = connections.some(
          c => c.id !== connectionId && 
               c.sourceNodeId === node.id && 
               c.sourcePortId === connection.sourcePortId
        );
        if (!hasOtherConnections) {
          return {
            ...node,
            outputs: node.outputs.map(p =>
              p.id === connection.sourcePortId ? { ...p, connected: false } : p
            ),
          };
        }
      }
      if (node.id === connection.targetNodeId) {
        return {
          ...node,
          inputs: node.inputs.map(p =>
            p.id === connection.targetPortId ? { ...p, connected: false } : p
          ),
        };
      }
      return node;
    });
    
    set({
      connections: connections.filter(c => c.id !== connectionId),
      nodes: updatedNodes,
    });
  },

  setZoom: (zoom) => {
    set(state => ({ canvas: { ...state.canvas, zoom: Math.max(0.1, Math.min(2, zoom)) } }));
  },

  setOffset: (offset) => {
    set(state => ({ canvas: { ...state.canvas, offset } }));
  },

  startDrag: (nodeId, startPosition) => {
    set({ drag: { isDragging: true, nodeId, startPosition } });
  },

  updateDrag: (position) => {
    const { drag, canvas } = get();
    if (!drag.isDragging || !drag.nodeId || !drag.startPosition) return;
    
    const dx = (position.x - drag.startPosition.x) / canvas.zoom;
    const dy = (position.y - drag.startPosition.y) / canvas.zoom;
    
    const node = get().nodes.find(n => n.id === drag.nodeId);
    if (!node) return;
    
    get().updateNodePosition(drag.nodeId, {
      x: node.position.x + dx,
      y: node.position.y + dy,
    });
    
    set({ drag: { ...drag, startPosition: position } });
  },

  endDrag: () => {
    set({ drag: { isDragging: false, nodeId: null, startPosition: null } });
  },

  startConnection: (nodeId, portId, portType) => {
    set({
      connectionState: {
        isConnecting: true,
        sourceNodeId: nodeId,
        sourcePortId: portId,
        sourcePortType: portType as Port['type'],
        mousePosition: null,
      },
    });
  },

  updateConnectionMouse: (position) => {
    set(state => ({
      connectionState: { ...state.connectionState, mousePosition: position },
    }));
  },

  endConnection: (targetNodeId, targetPortId) => {
    const { connectionState } = get();
    if (
      connectionState.isConnecting &&
      connectionState.sourceNodeId &&
      connectionState.sourcePortId &&
      targetNodeId &&
      targetPortId
    ) {
      get().addConnection({
        sourceNodeId: connectionState.sourceNodeId,
        sourcePortId: connectionState.sourcePortId,
        targetNodeId,
        targetPortId,
      });
    }
    get().cancelConnection();
  },

  cancelConnection: () => {
    set({
      connectionState: {
        isConnecting: false,
        sourceNodeId: null,
        sourcePortId: null,
        sourcePortType: null,
        mousePosition: null,
      },
    });
  },

  selectNode: (nodeId, multi = false) => {
    set(state => ({
      selectedNodeIds: multi
        ? state.selectedNodeIds.includes(nodeId)
          ? state.selectedNodeIds.filter(id => id !== nodeId)
          : [...state.selectedNodeIds, nodeId]
        : [nodeId],
    }));
  },

  clearSelection: () => {
    set({ selectedNodeIds: [] });
  },

  // 运行全部 - 一键执行整个工作流
  runAll: async () => {
    const { nodes, connections } = get();
    if (nodes.length === 0) return;
    
    set({ isRunning: true, nodeOutputs: new Map() });
    get().clearExecutionStates();
    
    try {
      const outputs = await executeWorkflow(nodes, connections, {
        onProgress: (nodeId, progress, message) => {
          get().setNodeExecutionState({
            nodeId,
            status: 'running',
            progress,
            message,
          });
        },
        onNodeComplete: (nodeId, nodeOutputs) => {
          get().setNodeExecutionState({
            nodeId,
            status: 'completed',
            progress: 100,
          });
          // 更新节点输出
          set(state => {
            const newOutputs = new Map(state.nodeOutputs);
            newOutputs.set(nodeId, nodeOutputs);
            return { nodeOutputs: newOutputs };
          });
        },
        onNodeError: (nodeId, error) => {
          get().setNodeExecutionState({
            nodeId,
            status: 'error',
            progress: 0,
            error,
          });
        },
      });
    } catch (error) {
      console.error('工作流执行失败:', error);
    }
    
    set({ isRunning: false });
  },

  setNodeExecutionState: (state) => {
    set(s => ({
      executionStates: [
        ...s.executionStates.filter(e => e.nodeId !== state.nodeId),
        state,
      ],
    }));
  },

  clearExecutionStates: () => {
    set({ executionStates: [] });
  },
  
  getNodeOutput: (nodeId) => {
    return get().nodeOutputs.get(nodeId);
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      connections: [],
      selectedNodeIds: [],
      executionStates: [],
    });
  },

  loadWorkflow: (nodes, connections) => {
    set({ nodes, connections, selectedNodeIds: [], executionStates: [] });
  },
}));
