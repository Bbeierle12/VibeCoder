// Canvas Types for Infinite Canvas System

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  offset: Point;      // Pan offset (canvas coordinates)
  zoom: number;       // Zoom level (1 = 100%)
}

export interface CanvasItemData {
  id: string;
  type: 'code-preview' | 'text-note' | 'image' | 'shape' | 'ai-generation';
  position: Point;    // Position on canvas grid
  size: Size;         // Size in grid units
  content: string;    // HTML code, text, image URL, etc.
  title?: string;
  locked?: boolean;
  zIndex?: number;
  metadata?: Record<string, any>;
  // Mindmap connection fields
  sourceMessageId?: string;   // ID of the chat message that generated this item
  parentItemId?: string;      // ID of the parent item (for branching/refinements)
}

// Chat node displayed on canvas (represents a chat message)
export interface ChatNodeData {
  id: string;
  messageId: string;          // Reference to the Message.id
  role: 'user' | 'model';
  content: string;            // Truncated message preview
  fullContent: string;        // Full message content
  position: Point;
  timestamp: number;
  isCollapsed?: boolean;
}

// Connection between nodes (chat->item or item->item)
export interface CanvasConnection {
  id: string;
  fromId: string;             // ChatNodeData.id or CanvasItemData.id
  fromType: 'chat' | 'item';
  toId: string;               // CanvasItemData.id
  toType: 'item';
  connectionType: 'generated' | 'refined' | 'branched';
  color?: string;
}

export interface CanvasState {
  items: CanvasItemData[];
  chatNodes: ChatNodeData[];
  connections: CanvasConnection[];
  viewport: Viewport;
  selectedItemId: string | null;
  selectedChatNodeId: string | null;
  gridSize: number;   // Pixels per grid unit
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface DragState {
  isDragging: boolean;
  dragType: 'item' | 'canvas' | 'resize' | null;
  startPoint: Point;
  currentPoint: Point;
  itemId: string | null;
  resizeHandle?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
}

export const DEFAULT_CANVAS_STATE: CanvasState = {
  items: [],
  chatNodes: [],
  connections: [],
  viewport: { offset: { x: 0, y: 0 }, zoom: 1 },
  selectedItemId: null,
  selectedChatNodeId: null,
  gridSize: 20,
  showGrid: true,
  snapToGrid: true,
};

export const ZOOM_LIMITS = {
  min: 0.1,
  max: 3,
  step: 0.1,
};

export const GRID_COLORS = {
  light: {
    lines: 'rgba(0, 0, 0, 0.08)',
    dots: 'rgba(0, 0, 0, 0.15)',
    majorLines: 'rgba(0, 0, 0, 0.15)',
  },
  dark: {
    lines: 'rgba(255, 255, 255, 0.06)',
    dots: 'rgba(255, 255, 255, 0.12)',
    majorLines: 'rgba(255, 255, 255, 0.1)',
  },
  cyberpunk: {
    lines: 'rgba(88, 101, 242, 0.08)',
    dots: 'rgba(88, 101, 242, 0.2)',
    majorLines: 'rgba(237, 100, 166, 0.15)',
  },
};
