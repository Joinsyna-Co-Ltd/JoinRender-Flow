import React, { useMemo } from 'react';
import { useWorkflowStore } from '../store';

interface ConnectionsProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const Connections: React.FC<ConnectionsProps> = ({ containerRef }) => {
  const { nodes, connections, connectionState, canvas } = useWorkflowStore();
  
  const getPortPosition = (
    nodeId: string, 
    portId: string, 
    direction: 'input' | 'output'
  ): { x: number; y: number } | null => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    const ports = direction === 'input' ? node.inputs : node.outputs;
    const portIndex = ports.findIndex(p => p.id === portId);
    if (portIndex === -1) return null;
    
    const nodeWidth = 220;
    const headerHeight = 48;
    const portRowHeight = 24;
    const portStartOffset = 8;
    
    const inputPortsCount = node.inputs.length;
    
    let y: number;
    if (direction === 'input') {
      y = node.position.y + headerHeight + portStartOffset + portIndex * portRowHeight + 12;
    } else {
      // 估算内容高度
      const contentHeight = getContentHeight(node.type);
      y = node.position.y + headerHeight + portStartOffset + inputPortsCount * portRowHeight + contentHeight + portIndex * portRowHeight + 12;
    }
    
    const x = direction === 'input' ? node.position.x : node.position.x + nodeWidth;
    
    return { x, y };
  };
  
  const connectionPaths = useMemo(() => {
    return connections.map(conn => {
      const sourcePos = getPortPosition(conn.sourceNodeId, conn.sourcePortId, 'output');
      const targetPos = getPortPosition(conn.targetNodeId, conn.targetPortId, 'input');
      
      if (!sourcePos || !targetPos) return null;
      
      const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
      const sourcePort = sourceNode?.outputs.find(p => p.id === conn.sourcePortId);
      
      return {
        id: conn.id,
        path: createBezierPath(sourcePos, targetPos),
        type: sourcePort?.type || 'any',
      };
    }).filter(Boolean);
  }, [connections, nodes]);
  
  // 临时连接线
  const tempConnectionPath = useMemo(() => {
    if (!connectionState.isConnecting || !connectionState.mousePosition) return null;
    
    const sourcePos = getPortPosition(
      connectionState.sourceNodeId!,
      connectionState.sourcePortId!,
      'output'
    );
    
    if (!sourcePos) return null;
    
    const mouseX = (connectionState.mousePosition.x - canvas.offset.x) / canvas.zoom;
    const mouseY = (connectionState.mousePosition.y - canvas.offset.y) / canvas.zoom;
    
    return {
      path: createBezierPath(sourcePos, { x: mouseX, y: mouseY }),
      type: connectionState.sourcePortType || 'any',
    };
  }, [connectionState, canvas, nodes]);
  
  return (
    <svg className="connections-layer">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {connectionPaths.map(conn => conn && (
        <path
          key={conn.id}
          d={conn.path}
          className={`connection-line ${conn.type}`}
          filter="url(#glow)"
        />
      ))}
      
      {tempConnectionPath && (
        <path
          d={tempConnectionPath.path}
          className={`connection-line connection-line-temp ${tempConnectionPath.type}`}
        />
      )}
    </svg>
  );
};

function createBezierPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const dx = Math.abs(end.x - start.x);
  const controlOffset = Math.min(dx * 0.5, 120);
  
  const cp1x = start.x + controlOffset;
  const cp1y = start.y;
  const cp2x = end.x - controlOffset;
  const cp2y = end.y;
  
  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

function getContentHeight(nodeType: string): number {
  switch (nodeType) {
    case 'text-input':
    case 'llm':
      return 100;
    case 'image-upload':
    case 'video-upload':
      return 80;
    case 'character-reference-gen':
    case 'image-gen':
    case 'gen4-image':
      return 70;
    case 'gen45-video':
    case 'video-gen':
      return 90;
    case 'image-output':
    case 'video-output':
      return 80;
    case 'storyboard-output':
      return 60;
    default:
      return 20;
  }
}
