import type { 
  Plugin, 
  NodeDefinition, 
  ComfyUINodeDefinition, 
  ComfyUIWorkflow,
  NodeInstance,
  Connection,
  PortType,
  WidgetConfig,
  NodeCategory,
} from '../types';
import { setCustomNodeDefinitions } from '../nodes/definitions';

/**
 * 插件管理器
 * 负责管理 ComfyUI 插件和自定义节点
 */
class PluginManagerClass {
  private plugins: Map<string, Plugin> = new Map();
  private customNodes: Map<string, NodeDefinition> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * 注册插件
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
    if (plugin.enabled) {
      plugin.nodes.forEach(comfyNode => {
        const nodeDefinition = this.convertComfyNodeToInternal(comfyNode, plugin.id);
        this.customNodes.set(nodeDefinition.type, nodeDefinition);
      });
    }
    
    this.updateNodeDefinitions();
    this.notifyListeners();
  }

  /**
   * 注销插件
   */
  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.nodes.forEach(comfyNode => {
        this.customNodes.delete(`comfy-${comfyNode.name}`);
      });
      this.plugins.delete(pluginId);
      this.updateNodeDefinitions();
      this.notifyListeners();
    }
  }

  /**
   * 启用/禁用插件
   */
  togglePlugin(pluginId: string, enabled: boolean): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = enabled;
      
      if (enabled) {
        plugin.nodes.forEach(comfyNode => {
          const nodeDefinition = this.convertComfyNodeToInternal(comfyNode, plugin.id);
          this.customNodes.set(nodeDefinition.type, nodeDefinition);
        });
      } else {
        plugin.nodes.forEach(comfyNode => {
          this.customNodes.delete(`comfy-${comfyNode.name}`);
        });
      }
      
      this.updateNodeDefinitions();
      this.notifyListeners();
    }
  }

  /**
   * 获取所有插件
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取所有自定义节点
   */
  getCustomNodes(): NodeDefinition[] {
    return Array.from(this.customNodes.values());
  }

  /**
   * 获取节点定义
   */
  getNodeDefinition(type: string): NodeDefinition | undefined {
    return this.customNodes.get(type);
  }

  /**
   * 将 ComfyUI 节点转换为内部格式
   */
  private convertComfyNodeToInternal(
    comfyNode: ComfyUINodeDefinition, 
    pluginId: string
  ): NodeDefinition {
    const inputs: NodeDefinition['inputs'] = [];
    const defaultData: Record<string, unknown> = {};

    // 处理必需输入
    if (comfyNode.input.required) {
      Object.entries(comfyNode.input.required).forEach(([name, spec]) => {
        const { portType, widget, defaultValue } = this.parseComfyInput(name, spec);
        
        if (widget) {
          // 有 widget 的输入
          inputs.push({
            name,
            type: portType,
            widget,
          });
          if (defaultValue !== undefined) {
            defaultData[name] = defaultValue;
          }
        } else {
          // 纯连接输入
          inputs.push({
            name,
            type: portType,
          });
        }
      });
    }

    // 处理可选输入
    if (comfyNode.input.optional) {
      Object.entries(comfyNode.input.optional).forEach(([name, spec]) => {
        const { portType, widget, defaultValue } = this.parseComfyInput(name, spec);
        
        inputs.push({
          name,
          type: portType,
          widget,
        });
        
        if (defaultValue !== undefined) {
          defaultData[name] = defaultValue;
        }
      });
    }

    // 处理输出
    const outputs: NodeDefinition['outputs'] = comfyNode.output.map((type, index) => ({
      name: comfyNode.output_name?.[index] || type,
      type: this.mapComfyType(type),
    }));

    // 映射类别
    const category = this.mapComfyCategory(comfyNode.category);

    return {
      type: `comfy-${comfyNode.name}`,
      name: comfyNode.display_name || comfyNode.name,
      category,
      color: this.getCategoryColor(category),
      icon: this.getCategoryIcon(category),
      inputs,
      outputs,
      defaultData,
      description: comfyNode.description,
      isCustom: true,
      pluginId,
      comfyClass: comfyNode.name,
    };
  }

  /**
   * 解析 ComfyUI 输入规格
   */
  private parseComfyInput(name: string, spec: unknown): {
    portType: PortType;
    widget?: WidgetConfig;
    defaultValue?: unknown;
  } {
    if (!Array.isArray(spec) || spec.length === 0) {
      return { portType: 'any' };
    }

    const firstElement = spec[0];
    const config = spec[1] as Record<string, unknown> | undefined;

    // 下拉选项
    if (Array.isArray(firstElement)) {
      return {
        portType: 'combo',
        widget: {
          type: 'combo',
          options: firstElement as string[],
          default: config?.default ?? firstElement[0],
        },
        defaultValue: config?.default ?? firstElement[0],
      };
    }

    // 字符串类型
    const typeStr = firstElement as string;
    const portType = this.mapComfyType(typeStr);

    // 根据类型决定 widget
    if (typeStr === 'INT') {
      return {
        portType: 'int',
        widget: {
          type: 'number',
          default: config?.default ?? 0,
          min: config?.min as number,
          max: config?.max as number,
          step: config?.step ?? 1,
        },
        defaultValue: config?.default ?? 0,
      };
    }

    if (typeStr === 'FLOAT') {
      return {
        portType: 'float',
        widget: {
          type: 'slider',
          default: config?.default ?? 0,
          min: config?.min ?? 0,
          max: config?.max ?? 1,
          step: config?.step ?? 0.01,
        },
        defaultValue: config?.default ?? 0,
      };
    }

    if (typeStr === 'STRING') {
      const isMultiline = config?.multiline === true;
      return {
        portType: 'text',
        widget: {
          type: isMultiline ? 'textarea' : 'text',
          default: config?.default ?? '',
        },
        defaultValue: config?.default ?? '',
      };
    }

    if (typeStr === 'BOOLEAN') {
      return {
        portType: 'boolean',
        widget: {
          type: 'toggle',
          default: config?.default ?? false,
        },
        defaultValue: config?.default ?? false,
      };
    }

    // 其他类型（纯连接）
    return { portType };
  }

  /**
   * 映射 ComfyUI 类型到内部类型
   */
  private mapComfyType(comfyType: string): PortType {
    const typeMap: Record<string, PortType> = {
      'IMAGE': 'image',
      'LATENT': 'latent',
      'MODEL': 'model',
      'CLIP': 'clip',
      'VAE': 'vae',
      'CONDITIONING': 'conditioning',
      'MASK': 'mask',
      'CONTROL_NET': 'control_net',
      'INT': 'int',
      'FLOAT': 'float',
      'STRING': 'text',
      'BOOLEAN': 'boolean',
    };
    return typeMap[comfyType] || 'any';
  }

  /**
   * 映射 ComfyUI 类别
   */
  private mapComfyCategory(comfyCategory: string): NodeCategory {
    const lowerCategory = comfyCategory.toLowerCase();
    
    if (lowerCategory.includes('loader')) return 'loaders';
    if (lowerCategory.includes('sampl')) return 'sampling';
    if (lowerCategory.includes('condition')) return 'conditioning';
    if (lowerCategory.includes('latent')) return 'latent';
    if (lowerCategory.includes('image')) return 'image';
    if (lowerCategory.includes('mask')) return 'mask';
    if (lowerCategory.includes('controlnet')) return 'controlnet';
    if (lowerCategory.includes('ipadapter')) return 'ipadapter';
    
    return 'custom';
  }

  /**
   * 获取类别颜色
   */
  private getCategoryColor(category: NodeCategory): string {
    const colors: Record<string, string> = {
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
    return colors[category] || '#64748b';
  }

  /**
   * 获取类别图标
   */
  private getCategoryIcon(category: NodeCategory): string {
    const icons: Record<string, string> = {
      loaders: '📦',
      sampling: '🎲',
      conditioning: '📝',
      latent: '🔮',
      image: '🖼️',
      mask: '🎭',
      controlnet: '🎛️',
      ipadapter: '🔗',
      custom: '⚙️',
    };
    return icons[category] || '⚙️';
  }

  /**
   * 导入 ComfyUI 工作流
   */
  importComfyWorkflow(workflow: ComfyUIWorkflow): {
    nodes: NodeInstance[];
    connections: Connection[];
  } {
    const nodeIdMap = new Map<number, string>();
    const nodes: NodeInstance[] = [];
    const connections: Connection[] = [];

    // 转换节点
    workflow.nodes.forEach(comfyNode => {
      const nodeId = `node-${comfyNode.id}`;
      nodeIdMap.set(comfyNode.id, nodeId);

      // 查找节点定义
      let definition = this.customNodes.get(`comfy-${comfyNode.type}`);
      
      // 如果没有找到，创建一个通用节点
      if (!definition) {
        definition = {
          type: `comfy-${comfyNode.type}`,
          name: comfyNode.type,
          category: 'custom',
          color: '#64748b',
          icon: '⚙️',
          inputs: comfyNode.inputs?.map(input => ({
            name: input.name,
            type: this.mapComfyType(input.type),
          })) || [],
          outputs: comfyNode.outputs?.map(output => ({
            name: output.name,
            type: this.mapComfyType(output.type),
          })) || [],
          isCustom: true,
          comfyClass: comfyNode.type,
        };
      }

      // 创建节点实例
      const node: NodeInstance = {
        id: nodeId,
        type: definition.type,
        position: { x: comfyNode.pos[0], y: comfyNode.pos[1] },
        data: {},
        inputs: definition.inputs.map((input, index) => ({
          id: `input-${index}`,
          name: input.name,
          type: input.type,
          direction: 'input' as const,
          connected: false,
          widget: input.widget,
        })),
        outputs: definition.outputs.map((output, index) => ({
          id: `output-${index}`,
          name: output.name,
          type: output.type,
          direction: 'output' as const,
          connected: false,
        })),
        size: { width: comfyNode.size[0], height: comfyNode.size[1] },
      };

      // 设置 widget 值
      if (comfyNode.widgets_values && definition.inputs) {
        let widgetIndex = 0;
        definition.inputs.forEach((input, index) => {
          if (input.widget && widgetIndex < comfyNode.widgets_values!.length) {
            node.data[input.name] = comfyNode.widgets_values![widgetIndex];
            widgetIndex++;
          }
        });
      }

      nodes.push(node);
    });

    // 转换连接
    workflow.links.forEach(link => {
      const [linkId, sourceNodeId, sourceSlot, targetNodeId, targetSlot, type] = link;
      
      const sourceId = nodeIdMap.get(sourceNodeId);
      const targetId = nodeIdMap.get(targetNodeId);
      
      if (sourceId && targetId) {
        connections.push({
          id: `link-${linkId}`,
          sourceNodeId: sourceId,
          sourcePortId: `output-${sourceSlot}`,
          targetNodeId: targetId,
          targetPortId: `input-${targetSlot}`,
          type: this.mapComfyType(type),
        });
      }
    });

    return { nodes, connections };
  }

  /**
   * 导出为 ComfyUI 工作流格式
   */
  exportToComfyWorkflow(
    nodes: NodeInstance[], 
    connections: Connection[]
  ): ComfyUIWorkflow {
    const nodeIdMap = new Map<string, number>();
    let nodeIdCounter = 1;
    let linkIdCounter = 1;

    const comfyNodes: ComfyUIWorkflow['nodes'] = [];
    const comfyLinks: ComfyUIWorkflow['links'] = [];

    // 转换节点
    nodes.forEach(node => {
      const comfyId = nodeIdCounter++;
      nodeIdMap.set(node.id, comfyId);

      const comfyNode: ComfyUIWorkflow['nodes'][0] = {
        id: comfyId,
        type: node.type.replace('comfy-', ''),
        pos: [node.position.x, node.position.y],
        size: [node.size?.width || 220, node.size?.height || 150],
        inputs: node.inputs.map(input => ({
          name: input.name,
          type: input.type.toUpperCase(),
          link: null,
        })),
        outputs: node.outputs.map((output, index) => ({
          name: output.name,
          type: output.type.toUpperCase(),
          links: null,
          slot_index: index,
        })),
        widgets_values: Object.values(node.data),
      };

      comfyNodes.push(comfyNode);
    });

    // 转换连接
    connections.forEach(conn => {
      const sourceComfyId = nodeIdMap.get(conn.sourceNodeId);
      const targetComfyId = nodeIdMap.get(conn.targetNodeId);
      
      if (sourceComfyId && targetComfyId) {
        const sourceSlot = parseInt(conn.sourcePortId.replace('output-', ''));
        const targetSlot = parseInt(conn.targetPortId.replace('input-', ''));
        
        const linkId = linkIdCounter++;
        
        comfyLinks.push([
          linkId,
          sourceComfyId,
          sourceSlot,
          targetComfyId,
          targetSlot,
          conn.type?.toUpperCase() || '*',
        ]);

        // 更新节点的连接信息
        const sourceNode = comfyNodes.find(n => n.id === sourceComfyId);
        const targetNode = comfyNodes.find(n => n.id === targetComfyId);
        
        if (sourceNode?.outputs?.[sourceSlot]) {
          if (!sourceNode.outputs[sourceSlot].links) {
            sourceNode.outputs[sourceSlot].links = [];
          }
          sourceNode.outputs[sourceSlot].links!.push(linkId);
        }
        
        if (targetNode?.inputs?.[targetSlot]) {
          targetNode.inputs[targetSlot].link = linkId;
        }
      }
    });

    return {
      last_node_id: nodeIdCounter - 1,
      last_link_id: linkIdCounter - 1,
      nodes: comfyNodes,
      links: comfyLinks,
    };
  }

  /**
   * 从 JSON 加载插件
   */
  loadPluginFromJSON(jsonStr: string): Plugin | null {
    try {
      const data = JSON.parse(jsonStr);
      
      if (data.nodes && Array.isArray(data.nodes)) {
        const plugin: Plugin = {
          id: data.id || `plugin-${Date.now()}`,
          name: data.name || '未命名插件',
          version: data.version || '1.0.0',
          description: data.description,
          author: data.author,
          enabled: true,
          nodes: data.nodes,
        };
        
        this.registerPlugin(plugin);
        return plugin;
      }
      
      return null;
    } catch (error) {
      console.error('加载插件失败:', error);
      return null;
    }
  }

  /**
   * 更新节点定义
   */
  private updateNodeDefinitions(): void {
    setCustomNodeDefinitions(this.getCustomNodes());
  }

  /**
   * 订阅变化
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const PluginManager = new PluginManagerClass();
