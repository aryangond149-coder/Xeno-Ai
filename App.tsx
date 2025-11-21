import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Menu, Plus, Image as ImageIcon, Send, X, Wand2, Download, Share2, RotateCw } from 'lucide-react';
import StartupScreen from './components/StartupScreen';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import LoginModal from './components/LoginModal';
import { ChatSession, ChatMessage, MessageRole, MessageType } from './types';
import { sendMessageToGemini, generateImageWithGemini, isImageGenerationRequest } from './services/gemini';

// Simple UUID fallback
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
};

interface PreviewData {
    url: string;
    isGenerated: boolean;
    prompt?: string;
}

const App: React.FC = () => {
  const [showStartup, setShowStartup] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showImageGenGuide, setShowImageGenGuide] = useState(false);
  
  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from local storage
  useEffect(() => {
    const stored = localStorage.getItem('xeno_sessions');
    if (stored) {
      setSessions(JSON.parse(stored));
    }
    // Check auth persistence
    const auth = localStorage.getItem('xeno_auth');
    if (auth === 'true') setIsLoggedIn(true);
  }, []);

  // Save sessions
  useEffect(() => {
    localStorage.setItem('xeno_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isTyping]);

  // --- Auth Handlers ---

  const handleLoginSuccess = () => {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      localStorage.setItem('xeno_auth', 'true');
  };

  const requireAuth = (callback: () => void) => {
      if (isLoggedIn) {
          callback();
      } else {
          setShowLoginModal(true);
      }
  };

  // --- Chat Handlers ---

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setShowImageGenGuide(false);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const handlePinSession = (id: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, isPinned: !s.isPinned } : s
    ));
  };

  const handleSessionSelect = (id: string) => {
      requireAuth(() => {
          setCurrentSessionId(id);
          setShowImageGenGuide(false);
          setIsSidebarOpen(false); // Close sidebar on mobile after selection
      });
  };

  const handleImageUploadClick = () => {
      requireAuth(() => {
          fileInputRef.current?.click();
      });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setShowImageGenGuide(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (overrideText?: string, isImageGenMode: boolean = false) => {
    const textToSend = overrideText || input;
    
    if ((!textToSend.trim() && !selectedImage) || !currentSessionId) {
        if (!currentSessionId) {
            const newSession: ChatSession = {
                id: generateId(),
                title: textToSend.substring(0, 30) || 'New Chat',
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
        }
        return; 
    }
    
    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
        const newSession: ChatSession = {
            id: generateId(),
            title: textToSend.substring(0, 20) + '...',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setSessions([newSession, ...sessions]);
        targetSessionId = newSession.id;
        setCurrentSessionId(newSession.id);
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: MessageRole.USER,
      text: textToSend,
      imageUrl: selectedImage || undefined,
      type: MessageType.TEXT,
      timestamp: Date.now()
    };

    setSessions(prev => prev.map(s => {
      if (s.id === targetSessionId) {
        const title = s.messages.length === 0 ? (textToSend.substring(0, 30) || 'Image Analysis') : s.title;
        return {
          ...s,
          title,
          messages: [...s.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setInput('');
    setSelectedImage(null);
    setIsTyping(true);
    setShowImageGenGuide(false);

    try {
        let responseText = '';
        let responseImage = undefined;
        let msgType = MessageType.TEXT;
        let originalPrompt = undefined;

        if (isImageGenMode || isImageGenerationRequest(textToSend)) {
            const generatedImageBase64 = await generateImageWithGemini(textToSend);
            if (generatedImageBase64) {
                responseImage = generatedImageBase64;
                responseText = `Here is the image you asked for! 🎨 \n\nPrompt: "${textToSend}"`;
                msgType = MessageType.IMAGE;
                originalPrompt = textToSend;
            } else {
                responseText = "I tried to generate that image, but my neural canvas is blurry right now. Please try again.";
            }
        } else {
            const currentSessionData = sessions.find(s => s.id === targetSessionId);
            const history = currentSessionData ? currentSessionData.messages : [];
            responseText = await sendMessageToGemini(history, textToSend, userMsg.imageUrl);
        }

        const botMsg: ChatMessage = {
            id: generateId(),
            role: MessageRole.MODEL,
            text: responseText,
            imageUrl: responseImage,
            type: msgType,
            timestamp: Date.now(),
            originalPrompt: originalPrompt
        };

        setSessions(prev => prev.map(s => {
            if (s.id === targetSessionId) {
                return {
                    ...s,
                    messages: [...s.messages, botMsg],
                    updatedAt: Date.now()
                };
            }
            return s;
        }));

    } catch (e) {
        console.error(e);
        const errorMsg: ChatMessage = {
            id: generateId(),
            role: MessageRole.MODEL,
            text: "My neural link was disrupted. Please try again. ⚠️",
            type: MessageType.TEXT,
            timestamp: Date.now()
        };
        setSessions(prev => prev.map(s => 
             s.id === targetSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
        ));
    } finally {
        setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(undefined, showImageGenGuide);
    }
  };

  // --- Preview Action Handlers ---

  const handleDownloadImage = () => {
      if (!previewData) return;
      const link = document.createElement('a');
      link.href = previewData.url;
      link.download = `xeno-generated-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleShareImage = async () => {
      if (!previewData) return;
      
      // Fallback for sharing
      try {
        if (navigator.share) {
            // For data URLs, sharing is tricky. We try to convert to blob.
            const blob = await (await fetch(previewData.url)).blob();
            const file = new File([blob], "xeno-image.jpg", { type: "image/jpeg" });
            await navigator.share({
                title: 'Check out this image from Xeno AI!',
                text: previewData.prompt ? `Generated with prompt: "${previewData.prompt}"` : 'Created with Xeno AI',
                files: [file]
            });
        } else {
            // Clipboard fallback
            await navigator.clipboard.writeText(previewData.url);
            alert("Image URL copied to clipboard! (System share not supported)");
        }
      } catch (error) {
          console.error("Share failed:", error);
          alert("Could not share image.");
      }
  };

  const handleRegenerateImage = () => {
      if (previewData?.prompt) {
          setPreviewData(null); // Close modal
          handleSend(previewData.prompt, true); // Re-trigger generation
      }
  };

  if (showStartup) {
    return <StartupScreen onComplete={() => setShowStartup(false)} />;
  }

  return (
    <div className="flex h-screen bg-[#0D0221] font-sans overflow-hidden text-white relative">
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={handleLoginSuccess} 
      />

      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSessionSelect}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onPinSession={handlePinSession}
        onClearAll={() => { setSessions([]); setCurrentSessionId(null); }}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : ''}`}>
        
        {/* Top Bar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-[#0D0221]/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Menu size={24} />
                </button>
                <h1 className="font-poppins font-semibold text-lg tracking-wide bg-gradient-to-r from-white to-[#00E0FF] bg-clip-text text-transparent">
                    Xeno AI
                </h1>
            </div>
            <button 
                onClick={handleNewChat}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[#3B0A94] to-[#4316A1] hover:shadow-[0_0_15px_rgba(59,10,148,0.6)] transition-all"
            >
                <Plus size={24} />
            </button>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth relative" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(67, 22, 161, 0.15) 0%, rgba(13, 2, 33, 0) 70%)'}}>
            {!currentSession ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl animate-[fadeIn_0.5s_ease-out]">
                        <h2 className="text-3xl font-poppins font-bold mb-2">Welcome to Xeno AI 👋</h2>
                        <p className="text-white/60 mb-8">I’m your bilingual AI companion. I can chat, generate images, and remember our conversations!</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => {
                                    const msg = "Hello! Let's chat.";
                                    handleSend(msg);
                                }}
                                className="p-4 rounded-xl bg-[#4316A1]/50 border border-[#4316A1] hover:bg-[#4316A1] hover:shadow-[0_0_15px_#4316A1] transition-all flex flex-col items-center gap-2"
                            >
                                <span className="text-2xl">💬</span>
                                <span className="font-medium text-sm">Natural Chat</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setShowImageGenGuide(true);
                                    const textarea = document.querySelector('textarea');
                                    if(textarea) textarea.focus();
                                }}
                                className="p-4 rounded-xl bg-[#00E0FF]/10 border border-[#00E0FF]/30 hover:bg-[#00E0FF]/20 hover:shadow-[0_0_15px_rgba(0,224,255,0.3)] transition-all flex flex-col items-center gap-2"
                            >
                                <span className="text-2xl">🎨</span>
                                <span className="font-medium text-sm">Image Magic</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto pt-4 pb-20">
                    {currentSession.messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} onImageClick={setPreviewData} />
                    ))}
                    {isTyping && (
                         <div className="flex gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E0FF] to-blue-600 flex items-center justify-center">
                                <Wand2 size={18} className="text-white animate-pulse" />
                            </div>
                            <div className="bg-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                <span className="text-sm text-white/70">Xeno is thinking...</span>
                            </div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            )}
        </main>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#0D0221]/90 backdrop-blur-xl border-t border-white/10 absolute bottom-0 left-0 right-0 md:relative">
            <div className="max-w-4xl mx-auto relative">
                {/* Image Preview in Input */}
                {selectedImage && (
                    <div className="absolute -top-16 left-0 bg-[#0D0221] border border-white/20 p-2 rounded-lg shadow-lg flex items-start gap-2">
                        <img src={selectedImage} alt="Upload preview" className="h-12 w-12 object-cover rounded" />
                        <div className="flex flex-col">
                             <span className="text-xs text-white/70">Image received 📸</span>
                             <span className="text-[10px] text-white/40">Ready to analyze or edit</span>
                        </div>
                        <button onClick={() => setSelectedImage(null)} className="text-white/50 hover:text-red-400 ml-2">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Image Generation Guidance Panel */}
                {showImageGenGuide && !selectedImage && (
                    <div className="absolute -top-24 left-0 right-0 bg-[#0D0221]/95 border border-[#00E0FF]/40 p-3 rounded-xl shadow-[0_0_20px_rgba(0,224,255,0.1)] backdrop-blur-md animate-[fadeIn_0.3s_ease-out] z-10">
                        <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-2 text-[#00E0FF]">
                                <Wand2 size={14} />
                                <span className="font-semibold text-sm">Image Creation Mode</span>
                             </div>
                             <button onClick={() => setShowImageGenGuide(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={14} />
                             </button>
                        </div>
                        <p className="text-sm text-gray-300">
                            Ready to visualize your ideas! Enter your description below.
                        </p>
                    </div>
                )}

                <div className={`flex items-end gap-2 bg-white/5 border rounded-2xl p-2 transition-all shadow-lg ${showImageGenGuide ? 'border-[#00E0FF]/50 bg-[#00E0FF]/5' : 'border-white/10 focus-within:border-[#00E0FF]/50 focus-within:bg-white/10'}`}>
                    <button 
                        onClick={handleImageUploadClick}
                        className="p-2 text-white/50 hover:text-[#00E0FF] transition-colors rounded-lg hover:bg-white/5"
                        title="Upload Image"
                    >
                        <ImageIcon size={22} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageSelect} 
                    />
                    
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={selectedImage ? "What should I do with this image?" : (showImageGenGuide ? "Describe the image you want me to create in detail (style, colors, subject)." : "Type your message… (हिन्दी/English)")}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/30 resize-none py-3 max-h-32 text-sm md:text-base scrollbar-none"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />
                    
                    <button 
                        onClick={() => handleSend(undefined, showImageGenGuide)}
                        disabled={!input.trim() && !selectedImage}
                        className={`
                            p-2 rounded-xl transition-all duration-300
                            ${(input.trim() || selectedImage) 
                                ? 'bg-[#00E0FF] text-[#0D0221] shadow-[0_0_15px_#00E0FF]' 
                                : 'bg-white/10 text-white/30 cursor-not-allowed'}
                        `}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {previewData && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onClick={() => setPreviewData(null)}>
              
              {/* Close Button */}
              <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-[70]">
                  <X size={32} />
              </button>

              {/* Image Container */}
              <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
                <img 
                    src={previewData.url} 
                    alt="Full screen" 
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain" 
                    onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Action Toolbar */}
              <div className="mt-6 flex gap-4 z-[70]" onClick={(e) => e.stopPropagation()}>
                 <button 
                    onClick={handleDownloadImage}
                    className="flex flex-col items-center gap-1 text-white/80 hover:text-[#00E0FF] transition-colors p-2"
                 >
                    <div className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                        <Download size={24} />
                    </div>
                    <span className="text-xs">Download</span>
                 </button>

                 <button 
                    onClick={handleShareImage}
                    className="flex flex-col items-center gap-1 text-white/80 hover:text-[#00E0FF] transition-colors p-2"
                 >
                    <div className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                        <Share2 size={24} />
                    </div>
                    <span className="text-xs">Share</span>
                 </button>

                 {previewData.isGenerated && previewData.prompt && (
                    <button 
                        onClick={handleRegenerateImage}
                        className="flex flex-col items-center gap-1 text-white/80 hover:text-[#00E0FF] transition-colors p-2"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20">
                            <RotateCw size={24} />
                        </div>
                        <span className="text-xs">Regenerate</span>
                    </button>
                 )}
              </div>
          </div>
      )}
    </div>
  );
};

export default App;