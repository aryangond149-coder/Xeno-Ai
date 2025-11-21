import React, { useState } from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Plus, Trash2, Pin, Moon, Edit2, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onPinSession: (id: string) => void;
  onClearAll: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onPinSession,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Pinned first, then date
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`
          fixed top-0 left-0 h-full w-72 
          bg-[#0D0221]/90 backdrop-blur-xl border-r border-white/10
          z-50 flex flex-col shadow-2xl
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins font-bold text-xl text-white">History</h2>
            <button onClick={onClose} className="md:hidden text-white/60 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input 
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#00E0FF]/50 transition-colors"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <button
                onClick={() => { onNewChat(); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-[#00E0FF] bg-[#00E0FF]/10 hover:bg-[#00E0FF]/20 transition-colors font-medium mb-4"
            >
                <Plus size={18} />
                New Chat
            </button>

            {filteredSessions.map(session => (
                <div 
                    key={session.id}
                    className={`
                        group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                        ${currentSessionId === session.id 
                            ? 'bg-white/10 border-l-2 border-[#00E0FF]' 
                            : 'hover:bg-white/5 text-white/70 hover:text-white border-l-2 border-transparent'}
                    `}
                    onClick={() => { onSelectSession(session.id); onClose(); }}
                >
                    <MessageSquare size={18} className={currentSessionId === session.id ? "text-[#00E0FF]" : ""} />
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{session.title}</p>
                        <p className="text-xs text-white/40 truncate">
                            {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                    </div>
                    
                    {/* Actions (visible on hover or active) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPinSession(session.id); }}
                            className={`p-1.5 rounded hover:bg-white/10 ${session.isPinned ? 'text-[#00E0FF] opacity-100' : 'text-white/50'}`}
                        >
                            <Pin size={14} className={session.isPinned ? "fill-current" : ""} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                            className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-400 text-white/50"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}

            {filteredSessions.length === 0 && (
                <div className="text-center text-white/30 py-8 text-sm">
                    No chats found
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <button 
                onClick={onClearAll}
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/60 text-xs transition-colors"
            >
                <Trash2 size={14} />
                Clear All
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-white/30">
            <span>v1.0.0</span>
            <span className="flex items-center gap-1"><Moon size={10} /> Dark Mode</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;