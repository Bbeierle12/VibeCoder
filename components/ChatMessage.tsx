import React from 'react';
import { Message, Role } from '../types';
import { Bot, User } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === Role.MODEL;

  return (
    <div className={clsx(
      "flex w-full gap-4 px-4 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
      // Model messages don't get a background in M3 typically, but distinct formatting helps. 
      // We'll use a slight surface tint for model.
      isModel ? "bg-md-sys-color-surface-container-low" : "bg-transparent"
    )}>
      <div className="flex-shrink-0 mt-1">
        <div className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
          isModel 
            ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container" 
            : "bg-md-sys-color-primary text-md-sys-color-on-primary"
        )}>
          {isModel ? <Bot size={20} /> : <User size={20} />}
        </div>
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-md-sys-color-on-surface">
            {isModel ? 'VibeCoder' : 'You'}
          </span>
          <span className="text-xs text-md-sys-color-on-surface-variant opacity-70">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="prose prose-invert prose-p:text-md-sys-color-on-surface prose-headings:text-md-sys-color-on-surface prose-strong:text-md-sys-color-on-surface max-w-none leading-relaxed">
          {message.content.replace(/```html[\s\S]*?```/g, (match) => {
              return `\n> *Generated Code (View in Canvas)*\n`;
          })}
        </div>
      </div>
    </div>
  );
};