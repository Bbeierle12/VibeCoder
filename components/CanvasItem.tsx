import React, { useRef, useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { GripVertical, Maximize2, Minimize2, X, RefreshCw, Code, Eye } from 'lucide-react';
import { CanvasItemData } from '../types/canvas';

interface CanvasItemProps {
  item: CanvasItemData;
  isSelected: boolean;
  onSelect: () => void;
  onContentChange: (content: string) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  zoom: number;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({
  item,
  isSelected,
  onSelect,
  onContentChange,
  onSizeChange,
  zoom,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [localCode, setLocalCode] = useState(item.content);
  const [iframeKey, setIframeKey] = useState(0);

  // Sync local code with item content
  useEffect(() => {
    setLocalCode(item.content);
  }, [item.content]);

  // Update iframe when content changes
  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current && localCode) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(localCode);
        doc.close();
      }
    }
  }, [localCode, iframeKey, viewMode]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: item.size.width,
      height: item.size.height,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - e.clientX) / zoom;
      const deltaY = (moveEvent.clientY - e.clientY) / zoom;
      
      let newWidth = item.size.width;
      let newHeight = item.size.height;
      
      if (handle.includes('e')) newWidth = Math.max(200, resizeStart.width + deltaX);
      if (handle.includes('w')) newWidth = Math.max(200, resizeStart.width - deltaX);
      if (handle.includes('s')) newHeight = Math.max(150, resizeStart.height + deltaY);
      if (handle.includes('n')) newHeight = Math.max(150, resizeStart.height - deltaY);
      
      onSizeChange({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [item.size, onSizeChange, zoom, resizeStart]);

  const handleRefresh = useCallback(() => {
    setIframeKey(prev => prev + 1);
  }, []);

  const handleCodeSave = useCallback(() => {
    onContentChange(localCode);
    setViewMode('preview');
    handleRefresh();
  }, [localCode, onContentChange, handleRefresh]);

  return (
    <div
      data-canvas-item={item.id}
      className={clsx(
        "absolute pointer-events-auto rounded-xl overflow-hidden shadow-elevation-2 transition-shadow",
        "bg-md-sys-color-surface-container border",
        isSelected 
          ? "border-md-sys-color-primary shadow-[0_0_0_2px_var(--md-sys-color-primary)]" 
          : "border-md-sys-color-outline-variant/30 hover:border-md-sys-color-outline-variant",
        item.locked && "opacity-70"
      )}
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        height: item.size.height,
        zIndex: item.zIndex || 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-8 px-2 bg-md-sys-color-surface-container-high border-b border-md-sys-color-outline-variant/20 cursor-move select-none">
        <div className="flex items-center gap-1.5">
          <GripVertical size={14} className="text-md-sys-color-on-surface-variant/50" />
          <span className="text-xs font-medium text-md-sys-color-on-surface truncate max-w-[120px]">
            {item.title || 'Preview'}
          </span>
        </div>
        
        <div className="flex items-center gap-0.5">
          <button
            className={clsx(
              "p-1 rounded transition-colors",
              viewMode === 'preview' 
                ? "bg-md-sys-color-primary/20 text-md-sys-color-primary" 
                : "text-md-sys-color-on-surface-variant hover:bg-md-sys-color-on-surface/10"
            )}
            onClick={(e) => { e.stopPropagation(); setViewMode('preview'); }}
            title="Preview"
          >
            <Eye size={12} />
          </button>
          <button
            className={clsx(
              "p-1 rounded transition-colors",
              viewMode === 'code' 
                ? "bg-md-sys-color-primary/20 text-md-sys-color-primary" 
                : "text-md-sys-color-on-surface-variant hover:bg-md-sys-color-on-surface/10"
            )}
            onClick={(e) => { e.stopPropagation(); setViewMode('code'); }}
            title="Code"
          >
            <Code size={12} />
          </button>
          {viewMode === 'preview' && (
            <button
              className="p-1 rounded text-md-sys-color-on-surface-variant hover:bg-md-sys-color-on-surface/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative" style={{ height: `calc(100% - 32px)` }}>
        {item.type === 'code-preview' && viewMode === 'preview' ? (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            title={item.title || 'Preview'}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
          />
        ) : item.type === 'code-preview' && viewMode === 'code' ? (
          <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
            <textarea
              className="flex-1 w-full p-3 bg-transparent text-[#d4d4d4] font-mono text-xs resize-none focus:outline-none leading-5"
              value={localCode}
              onChange={(e) => setLocalCode(e.target.value)}
              spellCheck={false}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter HTML code..."
              aria-label="Code editor"
            />
            <div className="flex justify-end gap-2 p-2 border-t border-[#333]">
              <button
                className="px-3 py-1 text-xs bg-md-sys-color-primary text-md-sys-color-on-primary rounded-full hover:opacity-90 transition-opacity"
                onClick={(e) => { e.stopPropagation(); handleCodeSave(); }}
              >
                Apply & Preview
              </button>
            </div>
          </div>
        ) : item.type === 'text-note' ? (
          <textarea
            className="w-full h-full p-3 bg-transparent text-md-sys-color-on-surface text-sm resize-none focus:outline-none"
            value={localCode}
            onChange={(e) => {
              setLocalCode(e.target.value);
              onContentChange(e.target.value);
            }}
            placeholder="Add notes..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-md-sys-color-on-surface-variant/50">
            No content
          </div>
        )}
      </div>

      {/* Resize handles (only when selected) */}
      {isSelected && !item.locked && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-md-sys-color-primary rounded-full cursor-se-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div
            className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-md-sys-color-primary rounded-full cursor-sw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-md-sys-color-primary rounded-full cursor-ne-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-md-sys-color-primary rounded-full cursor-nw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          
          {/* Edge handles */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-8 bg-md-sys-color-primary/50 rounded-full cursor-e-resize hover:bg-md-sys-color-primary transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-md-sys-color-primary/50 rounded-full cursor-w-resize hover:bg-md-sys-color-primary transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-2 bg-md-sys-color-primary/50 rounded-full cursor-s-resize hover:bg-md-sys-color-primary transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-md-sys-color-primary/50 rounded-full cursor-n-resize hover:bg-md-sys-color-primary transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
        </>
      )}
    </div>
  );
};
