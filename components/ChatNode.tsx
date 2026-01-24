import React, { useState } from 'react';
import { clsx } from 'clsx';
import { MessageSquare, User, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatNodeData, Point } from '../types/canvas';

interface ChatNodeProps {
  node: ChatNodeData;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange?: (position: Point) => void;
  zoom: number;
}

export const ChatNode: React.FC<ChatNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onPositionChange,
  zoom,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = node.role === 'user';

  // Truncate content for preview
  const previewContent = node.content.length > 100
    ? node.content.substring(0, 100) + '...'
    : node.content;

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      data-chat-node={node.id}
      className={clsx(
        "absolute select-none transition-shadow duration-200",
        "rounded-2xl shadow-elevation-2",
        isSelected && "ring-2 ring-md-sys-color-primary ring-offset-2 ring-offset-md-sys-color-surface"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: 280,
        minHeight: 80,
        zIndex: isSelected ? 100 : 10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Header */}
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-t-2xl cursor-move",
          isUser
            ? "bg-md-sys-color-primary-container"
            : "bg-md-sys-color-secondary-container"
        )}
      >
        <div className={clsx(
          "w-6 h-6 rounded-full flex items-center justify-center",
          isUser
            ? "bg-md-sys-color-primary text-md-sys-color-on-primary"
            : "bg-md-sys-color-secondary text-md-sys-color-on-secondary"
        )}>
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </div>
        <span className={clsx(
          "text-xs font-medium flex-1",
          isUser
            ? "text-md-sys-color-on-primary-container"
            : "text-md-sys-color-on-secondary-container"
        )}>
          {isUser ? 'You' : 'Claude'}
        </span>
        <span className={clsx(
          "text-xs opacity-60",
          isUser
            ? "text-md-sys-color-on-primary-container"
            : "text-md-sys-color-on-secondary-container"
        )}>
          {formatTime(node.timestamp)}
        </span>
      </div>

      {/* Content */}
      <div className="bg-md-sys-color-surface-container px-3 py-2 rounded-b-2xl">
        <p className="text-sm text-md-sys-color-on-surface leading-relaxed">
          {isExpanded ? node.fullContent : previewContent}
        </p>

        {/* Expand/collapse button for long messages */}
        {node.fullContent.length > 100 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={clsx(
              "mt-2 flex items-center gap-1 text-xs",
              "text-md-sys-color-primary hover:text-md-sys-color-primary/80",
              "transition-colors"
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Show more
              </>
            )}
          </button>
        )}
      </div>

      {/* Connection indicator dot */}
      <div
        className={clsx(
          "absolute -bottom-1 left-1/2 -translate-x-1/2",
          "w-3 h-3 rounded-full",
          "bg-md-sys-color-primary border-2 border-md-sys-color-surface"
        )}
      />
    </div>
  );
};
