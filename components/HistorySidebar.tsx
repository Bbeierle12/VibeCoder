import React, { useMemo, useState } from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Search, Trash2, Clock, Plus, X, Menu } from 'lucide-react';
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
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onClose
}) => {
  const [search, setSearch] = useState('');

  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    return sessions.filter(session => 
      session.title.toLowerCase().includes(search.toLowerCase()) ||
      session.messages.some(m => m.content.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sessions, search]);

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
        "fixed md:relative inset-y-0 left-0 z-40 w-[300px] bg-md-sys-color-surface-container-low md:bg-md-sys-color-surface md:border-r border-md-sys-color-outline-variant transform transition-transform duration-300 ease-in-out flex flex-col rounded-r-[16px] md:rounded-none shadow-elevation-2 md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:hidden"
      )}>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pl-2">
            <span className="text-sm font-medium text-md-sys-color-on-surface-variant uppercase tracking-wider">Projects</span>
            <Button variant="icon" size="sm" onClick={onClose} className="md:hidden">
              <X size={20} />
            </Button>
          </div>

          <Button variant="filled" onClick={onNewChat} className="w-full justify-start gap-3 h-14 rounded-[16px] shadow-none hover:shadow-elevation-1">
            <Plus size={24} /> 
            <span className="font-semibold text-base">New Project</span>
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-md-sys-color-on-surface-variant" size={20} />
            <input
              type="text"
              placeholder="Search history"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-md-sys-color-surface-container-high border-none rounded-full py-2.5 pl-10 pr-4 text-sm text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant focus:outline-none focus:ring-2 focus:ring-md-sys-color-primary transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-md-sys-color-on-surface-variant opacity-60">
              <Clock size={32} className="mb-2" />
              <p className="text-sm">No recent projects</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={clsx(
                  "group relative flex items-center gap-3 px-4 py-3 rounded-full cursor-pointer transition-all duration-200 overflow-hidden",
                  currentSessionId === session.id
                    ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "hover:bg-md-sys-color-surface-container-high text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface"
                )}
              >
                 <MessageSquare size={18} className={currentSessionId === session.id ? "opacity-100" : "opacity-70"} />
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs opacity-70 truncate">{new Date(session.lastModified).toLocaleDateString()}</p>
                 </div>
                 <button
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-md-sys-color-on-surface-variant hover:text-md-sys-color-error transition-opacity"
                    title="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-md-sys-color-outline-variant">
           <p className="text-center text-xs text-md-sys-color-on-surface-variant opacity-60 font-medium">
             VibeCoder v2.0 • Material You
           </p>
        </div>
      </div>
    </>
  );
};