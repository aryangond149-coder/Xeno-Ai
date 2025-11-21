import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole, MessageType } from '../types';
import { Bot, User, ZoomIn, Copy, ScanText, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: ChatMessage;
  onImageClick: (data: { url: string, isGenerated: boolean, prompt?: string }) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onImageClick }) => {
  const isUser = message.role === MessageRole.USER;
  const isGenerated = !isUser && message.type === MessageType.IMAGE;
  
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only trigger for text messages or text parts
    if (message.text) {
        e.preventDefault();
        setShowMenu(true);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (message.text) {
          navigator.clipboard.writeText(message.text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          setShowMenu(false);
      }
  };

  const handleSelectText = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (textRef.current) {
          const range = document.createRange();
          range.selectNodeContents(textRef.current);
          const selection = window.getSelection();
          if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
          }
          setShowMenu(false);
      }
  };

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 mb-6 relative ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 select-none
        ${isUser 
            ? 'bg-gradient-to-br from-purple-500 to-blue-600' 
            : 'bg-gradient-to-br from-[#00E0FF] to-blue-600 shadow-[0_0_10px_rgba(0,224,255,0.4)]'}
      `}>
        {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] lg:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'} relative`}>
        
        {/* Context Menu for Text */}
        <AnimatePresence>
            {showMenu && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`
                        absolute z-20 bg-[#0D0221] border border-white/20 shadow-xl rounded-xl p-1 flex flex-col gap-1 min-w-[140px] backdrop-blur-md
                        ${isUser ? 'right-0 -top-20' : 'left-0 -top-20'}
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 w-full p-2 hover:bg-white/10 rounded-lg text-sm text-white transition-colors text-left"
                    >
                        {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14} />}
                        <span>Copy Text</span>
                    </button>
                    <button 
                        onClick={handleSelectText}
                        className="flex items-center gap-2 w-full p-2 hover:bg-white/10 rounded-lg text-sm text-white transition-colors text-left"
                    >
                        <ScanText size={14} />
                        <span>Select Text</span>
                    </button>
                    
                    {/* Tiny arrow pointing down */}
                    <div className={`absolute -bottom-1.5 w-3 h-3 bg-[#0D0221] border-b border-r border-white/20 rotate-45 ${isUser ? 'right-4' : 'left-4'}`}></div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Image content if present */}
        {message.imageUrl && (
            <div 
                className="mb-2 relative group cursor-pointer rounded-xl overflow-hidden border-2 border-white/10 select-none" 
                onClick={() => onImageClick({ 
                    url: message.imageUrl!, 
                    isGenerated: isGenerated,
                    prompt: message.originalPrompt 
                })}
            >
                <img src={message.imageUrl} alt="Content" className="max-w-full h-auto max-h-80 rounded-lg object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white" size={24} />
                </div>
                {isGenerated && (
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-[#00E0FF]">
                        Generated by Xeno AI 🎨
                    </div>
                )}
            </div>
        )}

        {/* Text Content */}
        {message.text && (
            <div 
                className={`
                    p-4 rounded-2xl shadow-lg text-sm md:text-base leading-relaxed select-text cursor-text
                    ${isUser 
                        ? 'bg-[#4316A1] text-white rounded-tr-sm border border-white/10' 
                        : 'bg-white/10 backdrop-blur-md text-gray-100 rounded-tl-sm border border-white/5'}
                `}
                onContextMenu={handleContextMenu}
            >
                {message.isGenerating ? (
                     <div className="flex gap-1 items-center h-6">
                        <span className="w-2 h-2 bg-[#00E0FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-[#00E0FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-[#00E0FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                     </div>
                ) : (
                    <div className="markdown-content" ref={textRef}>
                         <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                )}
            </div>
        )}
        
        {/* Timestamp */}
        <span className="text-[10px] text-white/30 mt-1 px-1 select-none">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

export default MessageBubble;