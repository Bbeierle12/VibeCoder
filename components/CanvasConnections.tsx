import React, { useMemo } from 'react';
import { CanvasConnection, ChatNodeData, CanvasItemData, Point } from '../types/canvas';

interface CanvasConnectionsProps {
  connections: CanvasConnection[];
  chatNodes: ChatNodeData[];
  items: CanvasItemData[];
  theme: 'light' | 'dark' | 'cyberpunk';
}

// Get the center point of a node/item for connection anchoring
const getNodeCenter = (
  id: string,
  type: 'chat' | 'item',
  chatNodes: ChatNodeData[],
  items: CanvasItemData[]
): Point | null => {
  if (type === 'chat') {
    const node = chatNodes.find(n => n.id === id);
    if (!node) return null;
    // Chat nodes have fixed size of 280x80 (approximate)
    return {
      x: node.position.x + 140,
      y: node.position.y + 40,
    };
  } else {
    const item = items.find(i => i.id === id);
    if (!item) return null;
    return {
      x: item.position.x + item.size.width / 2,
      y: item.position.y + item.size.height / 2,
    };
  }
};

// Get connection anchor points (edge of node rather than center)
const getAnchorPoints = (
  fromId: string,
  fromType: 'chat' | 'item',
  toId: string,
  chatNodes: ChatNodeData[],
  items: CanvasItemData[]
): { from: Point; to: Point } | null => {
  const fromCenter = getNodeCenter(fromId, fromType, chatNodes, items);
  const toCenter = getNodeCenter(toId, 'item', chatNodes, items);

  if (!fromCenter || !toCenter) return null;

  // Get source node dimensions
  let fromWidth = 280, fromHeight = 80; // Default chat node size
  if (fromType === 'item') {
    const item = items.find(i => i.id === fromId);
    if (item) {
      fromWidth = item.size.width;
      fromHeight = item.size.height;
    }
  }

  // Get target item dimensions
  const toItem = items.find(i => i.id === toId);
  const toWidth = toItem?.size.width || 400;
  const toHeight = toItem?.size.height || 300;

  // Calculate angle between centers
  const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);

  // Calculate edge intersection points
  const fromEdge = getEdgePoint(fromCenter, fromWidth, fromHeight, angle);
  const toEdge = getEdgePoint(toCenter, toWidth, toHeight, angle + Math.PI);

  return { from: fromEdge, to: toEdge };
};

// Get point on edge of rectangle given angle from center
const getEdgePoint = (center: Point, width: number, height: number, angle: number): Point => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Calculate intersection with rectangle edges
  const halfW = width / 2;
  const halfH = height / 2;

  let x: number, y: number;

  if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
    // Intersects left or right edge
    x = cos > 0 ? halfW : -halfW;
    y = x * sin / cos;
  } else {
    // Intersects top or bottom edge
    y = sin > 0 ? halfH : -halfH;
    x = y * cos / sin;
  }

  return {
    x: center.x + x,
    y: center.y + y,
  };
};

// Generate bezier curve path
const generateBezierPath = (from: Point, to: Point): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control point offset based on distance
  const curvature = Math.min(distance * 0.4, 150);

  // Prefer vertical flow (top to bottom)
  const cp1 = {
    x: from.x,
    y: from.y + curvature,
  };
  const cp2 = {
    x: to.x,
    y: to.y - curvature,
  };

  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
};

// Get color based on connection type and theme
const getConnectionColor = (
  type: CanvasConnection['connectionType'],
  theme: 'light' | 'dark' | 'cyberpunk'
): string => {
  const colors = {
    light: {
      generated: '#6366f1', // Indigo
      refined: '#8b5cf6',   // Purple
      branched: '#ec4899',  // Pink
    },
    dark: {
      generated: '#818cf8', // Lighter indigo
      refined: '#a78bfa',   // Lighter purple
      branched: '#f472b6',  // Lighter pink
    },
    cyberpunk: {
      generated: '#00f5ff', // Cyan
      refined: '#ff00ff',   // Magenta
      branched: '#ffff00',  // Yellow
    },
  };

  return colors[theme][type];
};

export const CanvasConnections: React.FC<CanvasConnectionsProps> = ({
  connections,
  chatNodes,
  items,
  theme,
}) => {
  const paths = useMemo(() => {
    return connections.map(conn => {
      const anchors = getAnchorPoints(
        conn.fromId,
        conn.fromType,
        conn.toId,
        chatNodes,
        items
      );

      if (!anchors) return null;

      const path = generateBezierPath(anchors.from, anchors.to);
      const color = conn.color || getConnectionColor(conn.connectionType, theme);

      return {
        id: conn.id,
        path,
        color,
        type: conn.connectionType,
      };
    }).filter(Boolean);
  }, [connections, chatNodes, items, theme]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Arrow marker for connection ends */}
        <marker
          id="arrow-generated"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={getConnectionColor('generated', theme)} />
        </marker>
        <marker
          id="arrow-refined"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={getConnectionColor('refined', theme)} />
        </marker>
        <marker
          id="arrow-branched"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={getConnectionColor('branched', theme)} />
        </marker>

        {/* Glow filter for cyberpunk theme */}
        {theme === 'cyberpunk' && (
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {paths.map(pathData => pathData && (
        <g key={pathData.id}>
          {/* Shadow/glow layer */}
          <path
            d={pathData.path}
            fill="none"
            stroke={pathData.color}
            strokeWidth={theme === 'cyberpunk' ? 4 : 3}
            strokeOpacity={0.2}
            strokeLinecap="round"
            filter={theme === 'cyberpunk' ? 'url(#glow)' : undefined}
          />
          {/* Main path */}
          <path
            d={pathData.path}
            fill="none"
            stroke={pathData.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={pathData.type === 'branched' ? '8,4' : undefined}
            markerEnd={`url(#arrow-${pathData.type})`}
          />
        </g>
      ))}
    </svg>
  );
};
