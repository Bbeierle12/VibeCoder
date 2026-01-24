import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  ZoomIn, ZoomOut, Maximize2, Grid3X3, Lock, Unlock,
  Plus, MousePointer2, Hand, Trash2, Copy, RotateCcw,
  Layers, Eye, EyeOff, GitBranch
} from 'lucide-react';
import { Button } from './Button';
import {
  CanvasState, CanvasItemData, ChatNodeData, CanvasConnection, Viewport, Point, DragState,
  DEFAULT_CANVAS_STATE, ZOOM_LIMITS, GRID_COLORS
} from '../types/canvas';
import { CanvasItem } from './CanvasItem';
import { ChatNode } from './ChatNode';
import { CanvasConnections } from './CanvasConnections';
import { generateId } from '../utils/helpers';
import { Theme } from '../types';

interface InfiniteCanvasProps {
  theme: Theme;
  initialItems?: CanvasItemData[];
  chatNodes?: ChatNodeData[];
  connections?: CanvasConnection[];
  onItemsChange?: (items: CanvasItemData[]) => void;
  onChatNodesChange?: (nodes: ChatNodeData[]) => void;
  onConnectionsChange?: (connections: CanvasConnection[]) => void;
  onAddGeneratedCode?: (code: string, position: Point) => void;
  showConnections?: boolean;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  theme = 'dark',
  initialItems = [],
  chatNodes: externalChatNodes = [],
  connections: externalConnections = [],
  onItemsChange,
  onChatNodesChange,
  onConnectionsChange,
  onAddGeneratedCode,
  showConnections = true,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    ...DEFAULT_CANVAS_STATE,
    items: initialItems,
    chatNodes: externalChatNodes,
    connections: externalConnections,
  });
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    itemId: null,
  });

  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [isPanning, setIsPanning] = useState(false);

  const { viewport, items, chatNodes, connections, selectedItemId, selectedChatNodeId, gridSize, showGrid, snapToGrid } = canvasState;

  // Get grid colors based on theme
  const gridColors = GRID_COLORS[theme] || GRID_COLORS.dark;

  // Sync external chatNodes and connections
  useEffect(() => {
    setCanvasState(prev => ({
      ...prev,
      chatNodes: externalChatNodes,
      connections: externalConnections,
    }));
  }, [externalChatNodes, externalConnections]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (screenX - rect.left - viewport.offset.x) / viewport.zoom,
      y: (screenY - rect.top - viewport.offset.y) / viewport.zoom,
    };
  }, [viewport]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    return {
      x: canvasX * viewport.zoom + viewport.offset.x,
      y: canvasY * viewport.zoom + viewport.offset.y,
    };
  }, [viewport]);

  // Snap position to grid
  const snapToGridPosition = useCallback((pos: Point): Point => {
    if (!snapToGrid) return pos;
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setCanvasState(prev => {
      const newZoom = Math.max(ZOOM_LIMITS.min, Math.min(ZOOM_LIMITS.max, prev.viewport.zoom + delta));
      
      // Zoom towards cursor/center
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && centerX !== undefined && centerY !== undefined) {
        const zoomRatio = newZoom / prev.viewport.zoom;
        const offsetX = centerX - rect.left;
        const offsetY = centerY - rect.top;
        
        return {
          ...prev,
          viewport: {
            zoom: newZoom,
            offset: {
              x: offsetX - (offsetX - prev.viewport.offset.x) * zoomRatio,
              y: offsetY - (offsetY - prev.viewport.offset.y) * zoomRatio,
            },
          },
        };
      }
      
      return {
        ...prev,
        viewport: { ...prev.viewport, zoom: newZoom },
      };
    });
  }, []);

  // Handle wheel for zoom/pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? -ZOOM_LIMITS.step : ZOOM_LIMITS.step;
      handleZoom(delta, e.clientX, e.clientY);
    } else {
      // Pan
      setCanvasState(prev => ({
        ...prev,
        viewport: {
          ...prev.viewport,
          offset: {
            x: prev.viewport.offset.x - e.deltaX,
            y: prev.viewport.offset.y - e.deltaY,
          },
        },
      }));
    }
  }, [handleZoom]);

  // Start dragging (item or canvas)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    const target = e.target as HTMLElement;
    const itemElement = target.closest('[data-canvas-item]');
    
    if (itemElement && tool === 'select') {
      // Start dragging item
      const itemId = itemElement.getAttribute('data-canvas-item');
      const item = items.find(i => i.id === itemId);
      
      if (item && !item.locked) {
        setDragState({
          isDragging: true,
          dragType: 'item',
          startPoint: screenToCanvas(e.clientX, e.clientY),
          currentPoint: screenToCanvas(e.clientX, e.clientY),
          itemId: itemId,
        });
        
        setCanvasState(prev => ({ ...prev, selectedItemId: itemId }));
      }
    } else if (tool === 'pan' || e.button === 1 || (e.button === 0 && !itemElement)) {
      // Start panning canvas
      setIsPanning(true);
      setDragState({
        isDragging: true,
        dragType: 'canvas',
        startPoint: { x: e.clientX, y: e.clientY },
        currentPoint: { x: e.clientX, y: e.clientY },
        itemId: null,
      });
      
      // Deselect if clicking on empty canvas
      if (!itemElement) {
        setCanvasState(prev => ({ ...prev, selectedItemId: null, selectedChatNodeId: null }));
      }
    }
  }, [tool, items, screenToCanvas]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging) return;
    
    if (dragState.dragType === 'item' && dragState.itemId) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      const deltaX = canvasPos.x - dragState.startPoint.x;
      const deltaY = canvasPos.y - dragState.startPoint.y;
      
      setCanvasState(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === dragState.itemId) {
            const newPos = snapToGridPosition({
              x: item.position.x + deltaX,
              y: item.position.y + deltaY,
            });
            return { ...item, position: newPos };
          }
          return item;
        }),
      }));
      
      setDragState(prev => ({
        ...prev,
        startPoint: canvasPos,
        currentPoint: canvasPos,
      }));
    } else if (dragState.dragType === 'canvas') {
      const deltaX = e.clientX - dragState.currentPoint.x;
      const deltaY = e.clientY - dragState.currentPoint.y;
      
      setCanvasState(prev => ({
        ...prev,
        viewport: {
          ...prev.viewport,
          offset: {
            x: prev.viewport.offset.x + deltaX,
            y: prev.viewport.offset.y + deltaY,
          },
        },
      }));
      
      setDragState(prev => ({
        ...prev,
        currentPoint: { x: e.clientX, y: e.clientY },
      }));
    }
  }, [dragState, screenToCanvas, snapToGridPosition]);

  // End dragging
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      itemId: null,
    });
    setIsPanning(false);
    
    // Notify parent of changes
    if (onItemsChange) {
      onItemsChange(canvasState.items);
    }
  }, [canvasState.items, onItemsChange]);

  // Add new item to canvas
  const addItem = useCallback((type: CanvasItemData['type'], content: string = '') => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Place in center of current view
    const centerCanvas = screenToCanvas(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    
    const snappedPos = snapToGridPosition(centerCanvas);
    
    const newItem: CanvasItemData = {
      id: generateId(),
      type,
      position: snappedPos,
      size: { width: 400, height: 300 },
      content,
      title: type === 'code-preview' ? 'Preview' : type === 'text-note' ? 'Note' : 'Item',
    };
    
    setCanvasState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      selectedItemId: newItem.id,
    }));
  }, [screenToCanvas, snapToGridPosition]);

  // Delete selected item
  const deleteSelectedItem = useCallback(() => {
    if (!selectedItemId) return;
    
    setCanvasState(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== selectedItemId),
      selectedItemId: null,
    }));
  }, [selectedItemId]);

  // Duplicate selected item
  const duplicateSelectedItem = useCallback(() => {
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;
    
    const newItem: CanvasItemData = {
      ...item,
      id: generateId(),
      position: {
        x: item.position.x + gridSize * 2,
        y: item.position.y + gridSize * 2,
      },
    };
    
    setCanvasState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      selectedItemId: newItem.id,
    }));
  }, [items, selectedItemId, gridSize]);

  // Reset view to origin
  const resetView = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      viewport: { offset: { x: 0, y: 0 }, zoom: 1 },
    }));
  }, []);

  // Fit all items in view
  const fitToView = useCallback(() => {
    if (items.length === 0) {
      resetView();
      return;
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Find bounds of all items
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
      minX = Math.min(minX, item.position.x);
      minY = Math.min(minY, item.position.y);
      maxX = Math.max(maxX, item.position.x + item.size.width);
      maxY = Math.max(maxY, item.position.y + item.size.height);
    });
    
    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    
    const zoom = Math.min(
      rect.width / contentWidth,
      rect.height / contentHeight,
      1
    );
    
    setCanvasState(prev => ({
      ...prev,
      viewport: {
        zoom: Math.max(ZOOM_LIMITS.min, zoom),
        offset: {
          x: (rect.width - contentWidth * zoom) / 2 - minX * zoom + 50,
          y: (rect.height - contentHeight * zoom) / 2 - minY * zoom + 50,
        },
      },
    }));
  }, [items, resetView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedItem();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        duplicateSelectedItem();
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetView();
      } else if (e.key === '1' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fitToView();
      } else if (e.key === ' ') {
        e.preventDefault();
        setTool(prev => prev === 'pan' ? 'select' : 'pan');
      } else if (e.key === 'Escape') {
        setCanvasState(prev => ({ ...prev, selectedItemId: null }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedItem, duplicateSelectedItem, resetView, fitToView]);

  // Update item content
  const updateItemContent = useCallback((itemId: string, content: string) => {
    setCanvasState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, content } : item
      ),
    }));
  }, []);

  // Update item size
  const updateItemSize = useCallback((itemId: string, size: { width: number; height: number }) => {
    setCanvasState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, size } : item
      ),
    }));
  }, []);

  // Generate grid dots that are part of the canvas coordinate system
  const generateGridDots = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return [];
    
    // Calculate visible area in canvas coordinates
    const visibleLeft = -viewport.offset.x / viewport.zoom;
    const visibleTop = -viewport.offset.y / viewport.zoom;
    const visibleRight = visibleLeft + rect.width / viewport.zoom;
    const visibleBottom = visibleTop + rect.height / viewport.zoom;
    
    // Add padding to render dots just outside the viewport for smooth scrolling
    const padding = gridSize * 5;
    const startX = Math.floor((visibleLeft - padding) / gridSize) * gridSize;
    const startY = Math.floor((visibleTop - padding) / gridSize) * gridSize;
    const endX = Math.ceil((visibleRight + padding) / gridSize) * gridSize;
    const endY = Math.ceil((visibleBottom + padding) / gridSize) * gridSize;
    
    const dots: { x: number; y: number; isMajor: boolean }[] = [];
    const majorInterval = gridSize * 5;
    
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        const isMajor = x % majorInterval === 0 && y % majorInterval === 0;
        dots.push({ x, y, isMajor });
      }
    }
    
    return dots;
  }, [viewport, gridSize]);

  // Memoize the grid dots
  const gridDots = useMemo(() => generateGridDots(), [generateGridDots]);

  return (
    <div className="relative flex flex-col h-full w-full bg-md-sys-color-surface overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 p-2 bg-md-sys-color-surface-container/90 backdrop-blur-md rounded-2xl border border-md-sys-color-outline-variant/30 shadow-elevation-2">
        <Button
          variant={tool === 'select' ? 'tonal' : 'icon'}
          size="sm"
          onClick={() => setTool('select')}
          title="Select (V)"
        >
          <MousePointer2 size={18} />
        </Button>
        <Button
          variant={tool === 'pan' ? 'tonal' : 'icon'}
          size="sm"
          onClick={() => setTool('pan')}
          title="Pan (Space)"
        >
          <Hand size={18} />
        </Button>
        
        <div className="w-px h-6 bg-md-sys-color-outline-variant/30 mx-1" />
        
        <Button
          variant="icon"
          size="sm"
          onClick={() => addItem('code-preview')}
          title="Add Preview Frame"
        >
          <Plus size={18} />
        </Button>
        
        <div className="w-px h-6 bg-md-sys-color-outline-variant/30 mx-1" />
        
        <Button
          variant="icon"
          size="sm"
          onClick={() => handleZoom(ZOOM_LIMITS.step)}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </Button>
        <span className="text-xs font-medium text-md-sys-color-on-surface-variant min-w-[3rem] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <Button
          variant="icon"
          size="sm"
          onClick={() => handleZoom(-ZOOM_LIMITS.step)}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </Button>
        
        <div className="w-px h-6 bg-md-sys-color-outline-variant/30 mx-1" />
        
        <Button
          variant="icon"
          size="sm"
          onClick={fitToView}
          title="Fit to View (Ctrl+1)"
        >
          <Maximize2 size={18} />
        </Button>
        <Button
          variant="icon"
          size="sm"
          onClick={resetView}
          title="Reset View (Ctrl+0)"
        >
          <RotateCcw size={18} />
        </Button>
        
        <div className="w-px h-6 bg-md-sys-color-outline-variant/30 mx-1" />
        
        <Button
          variant={showGrid ? 'tonal' : 'icon'}
          size="sm"
          onClick={() => setCanvasState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
          title="Toggle Grid"
        >
          <Grid3X3 size={18} />
        </Button>
        <Button
          variant={snapToGrid ? 'tonal' : 'icon'}
          size="sm"
          onClick={() => setCanvasState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
          title="Snap to Grid"
        >
          {snapToGrid ? <Lock size={18} /> : <Unlock size={18} />}
        </Button>
      </div>

      {/* Selection toolbar */}
      {selectedItemId && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 p-2 bg-md-sys-color-surface-container/90 backdrop-blur-md rounded-2xl border border-md-sys-color-outline-variant/30 shadow-elevation-2">
          <Button
            variant="icon"
            size="sm"
            onClick={duplicateSelectedItem}
            title="Duplicate (Ctrl+D)"
          >
            <Copy size={18} />
          </Button>
          <Button
            variant="icon"
            size="sm"
            onClick={deleteSelectedItem}
            title="Delete (Del)"
            className="text-md-sys-color-error hover:bg-md-sys-color-error/10"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={clsx(
          "flex-1 relative overflow-hidden",
          tool === 'pan' || isPanning ? 'cursor-grab' : 'cursor-default',
          isPanning && 'cursor-grabbing'
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transformed layer - grid and items move together */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Grid dots - rendered in canvas coordinates */}
          {showGrid && (
            <svg 
              className="absolute pointer-events-none" 
              style={{ 
                left: 0, 
                top: 0, 
                width: '100%', 
                height: '100%',
                overflow: 'visible' 
              }}
            >
              {gridDots.map((dot, i) => (
                <circle
                  key={`${dot.x}-${dot.y}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.isMajor ? 2 : 1}
                  fill={dot.isMajor ? gridColors.majorLines : gridColors.dots}
                />
              ))}
            </svg>
          )}
          
          {/* Connection lines */}
          {showConnections && connections.length > 0 && (
            <CanvasConnections
              connections={connections}
              chatNodes={chatNodes}
              items={items}
              theme={theme}
            />
          )}

          {/* Chat nodes */}
          {chatNodes.map(node => (
            <ChatNode
              key={node.id}
              node={node}
              isSelected={node.id === selectedChatNodeId}
              onSelect={() => setCanvasState(prev => ({
                ...prev,
                selectedChatNodeId: node.id,
                selectedItemId: null,
              }))}
              zoom={viewport.zoom}
            />
          ))}

          {/* Items */}
          {items.map(item => (
            <CanvasItem
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              onSelect={() => setCanvasState(prev => ({
                ...prev,
                selectedItemId: item.id,
                selectedChatNodeId: null,
              }))}
              onContentChange={(content) => updateItemContent(item.id, content)}
              onSizeChange={(size) => updateItemSize(item.id, size)}
              zoom={viewport.zoom}
            />
          ))}
        </div>
        
        {/* Empty state */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-md-sys-color-on-surface-variant/50">
              <Layers size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Infinite Canvas</p>
              <p className="text-sm">Click <Plus size={14} className="inline mx-1" /> to add a preview frame</p>
              <p className="text-xs mt-2 opacity-60">Scroll to pan • Ctrl+Scroll to zoom • Space to toggle pan tool</p>
            </div>
          </div>
        )}
      </div>

      {/* Minimap / position indicator */}
      <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-md-sys-color-surface-container/80 backdrop-blur-md rounded-full border border-md-sys-color-outline-variant/30 text-xs font-mono text-md-sys-color-on-surface-variant">
        {Math.round(-viewport.offset.x / viewport.zoom)}, {Math.round(-viewport.offset.y / viewport.zoom)}
      </div>
    </div>
  );
};
