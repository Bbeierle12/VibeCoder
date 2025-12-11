import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChatSession, Message, Role } from '../types';
import { MessageSquare, Search, Trash2, Clock, Plus, X, Send, Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { clsx } from 'clsx';

interface HistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onClose: () => void;
  // Chat props
  messages?: Message[];
  onSendMessage?: (message: string) => void;
  isThinking?: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onClose,
  messages = [],
  onSendMessage,
  isThinking = false,
}) => {
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    return sessions.filter(session => 
      session.title.toLowerCase().includes(search.toLowerCase()) ||
      session.messages.some(m => m.content.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sessions, search]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !onSendMessage) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <>
      {/* Modal Scrim for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Navigation Drawer */}
      <div className={clsx(
        "fixed md:relative inset-y-0 left-0 z-40 w-[340px] bg-md-sys-color-surface-container-low md:bg-md-sys-color-surface md:border-r border-md-sys-color-outline-variant transform transition-transform duration-300 ease-in-out flex flex-col rounded-r-[16px] md:rounded-none shadow-elevation-2 md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:hidden"
      )}>
        {/* Header Section */}
        <div className="p-3 flex flex-col gap-3 border-b border-md-sys-color-outline-variant/30">
          <div className="flex items-center justify-between pl-2">
            <span className="text-sm font-medium text-md-sys-color-on-surface-variant uppercase tracking-wider">Projects</span>
            <Button variant="icon" size="sm" onClick={onClose} className="md:hidden">
              <X size={20} />
            </Button>
          </div>

          <Button variant="filled" onClick={onNewChat} className="w-full justify-start gap-3 h-12 rounded-[16px] shadow-none hover:shadow-elevation-1">
            <Plus size={20} /> 
            <span className="font-semibold text-sm">New Project</span>
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-md-sys-color-on-surface-variant" size={18} />
            <input
              type="text"
              placeholder="Search history"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-md-sys-color-surface-container-high border-none rounded-full py-2 pl-10 pr-4 text-sm text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant focus:outline-none focus:ring-2 focus:ring-md-sys-color-primary transition-all"
            />
          </div>
        </div>

        {/* Collapsible History Section */}
        <div className={clsx(
          "border-b border-md-sys-color-outline-variant/30 transition-all duration-300 overflow-hidden",
          isHistoryExpanded ? "max-h-[200px]" : "max-h-[100px]"
        )}>
          <button 
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-md-sys-color-on-surface-variant uppercase tracking-wider hover:bg-md-sys-color-surface-container-high/50 transition-colors"
          >
            <span>History ({sessions.length})</span>
            {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div className="overflow-y-auto custom-scrollbar px-2 pb-2" style={{ maxHeight: isHistoryExpanded ? '160px' : '60px' }}>
            {filteredSessions.length === 0 ? (
              <div className="flex items-center justify-center py-3 text-md-sys-color-on-surface-variant opacity-60">
                <Clock size={16} className="mr-2" />
                <p className="text-xs">No projects yet</p>
              </div>
            ) : (
              filteredSessions.slice(0, isHistoryExpanded ? undefined : 2).map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={clsx(
                    "group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden text-sm",
                    currentSessionId === session.id
                      ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                      : "hover:bg-md-sys-color-surface-container-high text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface"
                  )}
                >
                   <MessageSquare size={14} className="shrink-0 opacity-70" />
                   <span className="flex-1 truncate text-xs">{session.title}</span>
                   <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-md-sys-color-on-surface-variant hover:text-md-sys-color-error transition-opacity"
                      title="Delete project"
                    >
                      <Trash2 size={12} />
                    </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-md-sys-color-outline-variant/20">
            <span className="text-xs font-medium text-md-sys-color-primary uppercase tracking-wider">AI Chat</span>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-md-sys-color-on-surface-variant/50 text-center px-4">
                <Bot size={32} className="mb-2 opacity-40" />
                <p className="text-xs">Ask me to generate UI components for your canvas</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    "flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200",
                    msg.role === Role.USER ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    msg.role === Role.MODEL 
                      ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container" 
                      : "bg-md-sys-color-primary text-md-sys-color-on-primary"
                  )}>
                    {msg.role === Role.MODEL ? <Bot size={12} /> : <User size={12} />}
                  </div>
                  <div className={clsx(
                    "flex-1 px-3 py-2 rounded-2xl text-xs leading-relaxed",
                    msg.role === Role.USER 
                      ? "bg-md-sys-color-primary text-md-sys-color-on-primary rounded-br-sm" 
                      : "bg-md-sys-color-surface-container-high text-md-sys-color-on-surface rounded-bl-sm"
                  )}>
                    {msg.content.replace(/```html[\s\S]*?```/g, '✨ Code generated - check canvas!')}
                  </div>
                </div>
              ))
            )}
            {isThinking && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container flex items-center justify-center">
                  <Bot size={12} />
                </div>
                <div className="flex items-center gap-1 px-3 py-2 bg-md-sys-color-surface-container-high rounded-2xl rounded-bl-sm">
                  <div className="w-1.5 h-1.5 bg-md-sys-color-primary rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-md-sys-color-primary rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-md-sys-color-primary rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-md-sys-color-outline-variant/30">
            <div className="relative flex items-end gap-2 p-1 bg-md-sys-color-surface-container-high rounded-2xl border border-md-sys-color-outline-variant/30 focus-within:border-md-sys-color-primary focus-within:ring-1 focus-within:ring-md-sys-color-primary/30 transition-all">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputResize}
                onKeyDown={handleKeyDown}
                placeholder="Describe your UI..."
                className="flex-1 max-h-[120px] min-h-[36px] w-full bg-transparent text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant text-sm px-3 py-2 focus:outline-none resize-none"
                rows={1}
              />
              <Button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking}
                variant="filled"
                size="sm"
                className="mb-1 mr-1 w-8 h-8 min-w-[32px] min-h-[32px] p-0"
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-2 border-t border-md-sys-color-outline-variant/30">
           <p className="text-center text-[10px] text-md-sys-color-on-surface-variant opacity-50 font-medium">
             VibeCoder v2.0 • Infinite Canvas
           </p>
        </div>
      </div>
    </>
  );
};