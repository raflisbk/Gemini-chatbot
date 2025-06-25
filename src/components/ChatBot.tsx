'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  RotateCcw, 
  AlertCircle, 
  X, 
  Settings, 
  Plus, 
  Sidebar, 
  Home, 
  LogOut, 
  LogIn, 
  User,
  Upload,
  Code,
  FileText,
  Image,
  Menu,
  Search,
  Clock,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/ChatMessage';
import { LoadingDots } from '@/components/LoadingDots';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsDialog } from '@/components/SettingsDialog';
import { LoginForm } from '@/components/LoginForm';
import { Logo } from '@/components/Logo';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import { ChatStorage } from '@/lib/chatStorage';
import TrendingAPI from '@/lib/trendingAPI';
import { ChatSession } from '@/lib/types';
import { generateId } from '@/lib/utils';

export function ChatBot() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [trendingPrompts, setTrendingPrompts] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearMessages, clearError } = useChat();
  const { user, logout, updateUsage, remainingQuota, isAdmin, isAuthenticated, isGuest } = useAuth();

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-open sidebar on desktop if closed
      if (width >= 1024 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-open sidebar on desktop by default
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setSidebarOpen(true);
    }
  }, [isMobile, isTablet]);

  // Load chat sessions and trending prompts on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadChatSessions();
    }
    loadTrendingPrompts();
  }, [isAuthenticated]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (sidebarOpen) {
          const searchInput = document.getElementById('chat-search');
          searchInput?.focus();
        }
      }
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, isMobile]);

  // Load trending prompts
  const loadTrendingPrompts = async () => {
    try {
      setLoadingTrending(true);
      // Fallback trending prompts if API fails
      const fallbackPrompts = [
        "Apa kabar politik terbaru di Indonesia?",
        "Bagaimana perkembangan ekonomi digital Indonesia?",
        "Trend teknologi terbaru yang populer di Indonesia",
        "Update terbaru tentang pendidikan di Indonesia",
        "Perkembangan startup unicorn Indonesia",
        "Bagaimana kondisi UMKM di Indonesia saat ini?"
      ];
      
      try {
        const prompts = await TrendingAPI.getTrendingTopics();
        // If TrendingAPI returns objects, map to string; otherwise, use as is
        const promptStrings = Array.isArray(prompts) && typeof prompts[0] === 'object'
          ? (prompts as any[]).map((p) => typeof p === 'string' ? p : p.title ?? p.topic ?? '')
          : prompts;
        setTrendingPrompts(
          promptStrings.length > 0
            ? promptStrings.filter((s: string) => !!s)
            : fallbackPrompts
        );
      } catch (error) {
        console.error('Failed to load trending prompts, using fallback:', error);
        setTrendingPrompts(fallbackPrompts);
      }
    } finally {
      setLoadingTrending(false);
    }
  };

  // Load chat sessions for authenticated users
  const loadChatSessions = () => {
    if (!isAuthenticated) return;
    const sessions = ChatStorage.getSessions();
    setChatSessions(sessions);
  };

  // Filter chat sessions based on search
  const filteredSessions = chatSessions.filter(session => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return session.title.toLowerCase().includes(query) ||
           session.messages.some(msg => msg.content.toLowerCase().includes(query));
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check quota for non-authenticated users
    if (!isAuthenticated && remainingQuota <= 0) {
      setLoginOpen(true);
      return;
    }

    const messageText = isCodeMode ? `[CODE REQUEST] ${input}` : input;
    
    // Include file information if files are selected
    let finalMessage = messageText;
    if (selectedFiles.length > 0) {
      const fileList = selectedFiles.map(f => `${f.name} (${f.type})`).join(', ');
      finalMessage = `${messageText}\n\nFiles attached: ${fileList}`;
    }

    setInput('');
    setSelectedFiles([]);
    setShowSuggestions(false);
    
    // Auto-close sidebar on mobile after sending message
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    
    try {
      await sendMessage(finalMessage);
      if (!isAuthenticated) {
        updateUsage();
      }
      
      // Save to chat session if authenticated
      if (isAuthenticated && messages.length === 0) {
        const newSession = ChatStorage.createSession({
          id: generateId(),
          content: finalMessage,
          role: 'user',
          timestamp: new Date(),
        });
        setCurrentSessionId(newSession.id);
        loadChatSessions();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Handle new chat
  const handleNewChat = () => {
    clearMessages();
    setCurrentSessionId(null);
    setShowSuggestions(true);
    setInput('');
    setSelectedFiles([]);
    setIsCodeMode(false);
    inputRef.current?.focus();
    
    // Close sidebar on mobile after new chat
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle go home
  const handleGoHome = () => {
    handleNewChat();
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setLogoutConfirm(false);
    handleNewChat();
  };

  // Handle session selection
  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    // Load session messages here - you'll need to implement this
    // For now, we'll just close sidebar on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle session deletion
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ChatStorage.deleteSession(sessionId);
    loadChatSessions();
    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle code mode templates
  const handleCodeTemplate = (template: string) => {
    setInput(template);
    setIsCodeMode(true);
    inputRef.current?.focus();
  };

  // Format usage display
  const getUsageDisplay = (): string => {
    if (isAuthenticated) {
      return isAdmin ? 'Unlimited (Admin)' : `${remainingQuota}/50 messages today`;
    }
    return `${remainingQuota <= 0 ? '0' : remainingQuota}/5 free messages`;
  };

  const getStatusColor = (): string => {
    if (isAuthenticated && isAdmin) return 'text-emerald-500';
    return remainingQuota <= 5 ? 'text-red-500' : remainingQuota <= 10 ? 'text-amber-500' : 'text-emerald-500';
  };

  const getStatusDotColor = (): string => {
    if (isAuthenticated && isAdmin) return 'bg-emerald-500';
    return remainingQuota <= 5 ? 'bg-red-500' : remainingQuota <= 10 ? 'bg-amber-500' : 'bg-emerald-500';
  };

  const getUserDisplayName = (): string => {
    if (!isAuthenticated) return 'Guest User';
    return `${user?.name || 'User'}`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-emerald-600" />;
    } else if (file.type.includes('text/') || file.name.endsWith('.txt')) {
      return <FileText className="h-4 w-4 text-emerald-600" />;
    } else {
      return <FileText className="h-4 w-4 text-emerald-600" />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: isMobile ? -300 : -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? -300 : -280, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`
              ${isMobile ? 'fixed left-0 top-0 h-full z-50 w-80' : 'relative'}
              ${isTablet ? 'w-72' : isMobile ? 'w-80' : 'w-80'}
              bg-gradient-to-b from-emerald-200/30 via-teal-200/20 to-blue-200/30 backdrop-blur-xl 
              border-r border-gradient-to-b
              dark:from-emerald-800/30 dark:via-teal-800/20 dark:to-blue-800/30 
              flex flex-col
              ${isMobile ? 'shadow-2xl shadow-emerald-500/10' : 'shadow-sm'}
            `}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b bg-gradient-to-r from-emerald-50/30 via-teal-50/20 to-blue-50/30 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-blue-950/30">
              <div className="flex items-center justify-between mb-4">
                <Logo size="md" variant="minimal" animated={true} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                  title="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                onClick={handleNewChat}
                className="w-full justify-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:via-teal-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
                size="default"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            {/* Search Bar (for authenticated users) */}
            {isAuthenticated && (
              <div className="p-4 border-b border-emerald-200/20 dark:border-emerald-800/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
                  <Input
                    id="chat-search"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/40 dark:border-emerald-800/40 focus:border-emerald-400 dark:focus:border-emerald-600 focus:bg-background transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Chat Sessions */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 md:p-4 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-muted-foreground">Recent Chats</h3>
                        {chatSessions.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {filteredSessions.length}/{chatSessions.length}
                          </span>
                        )}
                      </div>
                      
                      {filteredSessions.length > 0 ? (
                        <div className="space-y-1">
                          {filteredSessions.slice(0, 20).map((session) => (
                            <motion.div
                              key={session.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group relative"
                            >
                              <motion.button
                                whileHover={{ scale: 1.01, x: 4 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleSessionSelect(session)}
                                className={`w-full p-4 text-left rounded-xl border transition-all group ${
                                  currentSessionId === session.id
                                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50 dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-blue-950/50 border-emerald-300/50 dark:border-emerald-700/50 shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/20'
                                    : 'bg-gradient-to-r from-card/40 to-card/20 hover:from-emerald-50/30 hover:via-teal-50/20 hover:to-blue-50/30 dark:hover:from-emerald-950/20 dark:hover:via-teal-950/10 dark:hover:to-blue-950/20 border-border/30 hover:border-emerald-300/40 dark:hover:border-emerald-700/40 hover:shadow-sm hover:shadow-emerald-200/30 dark:hover:shadow-emerald-900/10'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate text-sm mb-1">
                                      {session.title}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {session.messages.length} messages
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-all hover:bg-destructive/10"
                                    title="Delete chat"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100/50 via-teal-100/30 to-blue-100/50 dark:from-emerald-900/30 dark:via-teal-900/20 dark:to-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="h-6 w-6 text-emerald-600/70 dark:text-emerald-400/70" />
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
                          </p>
                          {searchQuery ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSearchQuery('')}
                              className="text-xs border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                            >
                              Clear search
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNewChat}
                              className="text-xs border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                            >
                              Start your first chat
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gradient-to-br from-emerald-50/60 via-teal-50/40 to-blue-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 rounded-xl p-6 text-center border border-emerald-200/40 dark:border-emerald-800/40">
                      <Logo size="lg" variant="icon-only" animated={true} className="mx-auto mb-3" />
                      <p className="text-sm font-medium mb-2">Unlock Full Features</p>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        Login to save your conversations, get unlimited messages, and access premium features.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setLoginOpen(true);
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:via-teal-600 hover:to-blue-700 text-white border-0 shadow-sm hover:shadow-emerald-500/25 transition-all duration-200"
                      >
                        <LogIn className="h-3 w-3 mr-2" />
                        Login Now
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-emerald-200/20 dark:border-emerald-800/20 bg-gradient-to-r from-emerald-50/20 via-teal-50/10 to-blue-50/20 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-blue-950/20">
              {isAuthenticated && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 mb-3 hover:bg-emerald-100/40 dark:hover:bg-emerald-900/40 rounded-lg p-3 transition-colors duration-200"
                  onClick={() => {
                    setSettingsOpen(true);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Settings</span>
                </Button>
              )}
              
              <div className="text-xs text-center text-muted-foreground/70">
                <div className="font-medium bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                  AI Chatbot v2.0
                </div>
                <div className="mt-1">Powered by Gemini</div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area - Full Width */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 border-b border-emerald-200/30 dark:border-emerald-800/30 bg-gradient-to-r from-card/40 via-emerald-50/20 to-teal-50/20 dark:from-card/40 dark:via-emerald-950/20 dark:to-teal-950/20 backdrop-blur-xl sticky top-0 z-30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors duration-200"
            >
              {isMobile ? <Menu className="h-4 w-4" /> : <Sidebar className="h-4 w-4" />}
            </Button>
            
            <Logo size="md" variant="minimal" animated={true} />
            
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                AI Chatbot
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    AI is thinking...
                  </span>
                ) : isGuest ? (
                  'Free access • Login for more features'
                ) : (
                  'Your AI assistant for everything'
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isMobile && (
              <>
                {!showSuggestions && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleGoHome}
                    title="Go to home"
                    className="hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors duration-200"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                )}
                
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewChat}
                    title="New chat"
                    className="hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  disabled={messages.length === 0 || isLoading}
                  title="Clear conversation"
                  className="hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg disabled:opacity-50 transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <ThemeToggle />
            
            {!isAuthenticated ? (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setLoginOpen(true)}
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:via-teal-600 hover:to-blue-700 text-white border-0 shadow-sm hover:shadow-emerald-500/25 transition-all duration-200"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="gap-2 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors duration-200"
              >
                <User className="h-4 w-4" />
                {!isMobile && <span className="max-w-24 truncate">{user?.name}</span>}
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.header>

        {/* Mobile Action Bar */}
        {isMobile && !showSuggestions && (
          <div className="flex items-center gap-2 p-2 border-b bg-emerald-50/30 dark:bg-emerald-950/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoHome}
              className="flex-1 text-xs hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50"
            >
              <Home className="h-3 w-3 mr-1" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="flex-1 text-xs hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50"
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              disabled={messages.length === 0 || isLoading}
              className="flex-1 text-xs hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-3 md:mx-4 mt-3 md:mt-4 p-3 md:p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">Error</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="ml-auto h-6 w-6 p-0 text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-2 md:px-4">
            <div className="py-4 max-w-none">
              <AnimatePresence mode="wait">
                {showSuggestions ? (
                  <motion.div
                    key="suggestions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full"
                  >
                    {/* Welcome Section */}
                    <div className="text-center mb-8 px-4">
                      <Logo size="2xl" variant="icon-only" animated={true} className="mx-auto mb-6" />
                      <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent"
                      >
                        Welcome to AI Chatbot
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto"
                      >
                        Ask me anything about trending topics in Indonesia, get help with coding, or have a natural conversation about any subject.
                      </motion.p>
                    </div>

                    {/* Usage Status */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-blue-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-800/40 rounded-2xl p-6 mb-8 text-center mx-4 shadow-lg shadow-emerald-200/20 dark:shadow-emerald-900/10"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusDotColor()}`}></div>
                        <p className="text-sm font-medium text-muted-foreground">Usage Status</p>
                      </div>
                      <p className={`font-semibold text-lg ${getStatusColor()}`}>
                        {getUsageDisplay()}
                      </p>
                    </motion.div>

                    {/* Trending Topics */}
                    {trendingPrompts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mb-8 px-4"
                      >
                        <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                          Trending Topics
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                          {trendingPrompts.slice(0, 6).map((suggestion, index) => (
                            <motion.button
                              key={suggestion}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6 + index * 0.1 }}
                              whileHover={{ scale: 1.02, y: -4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="group p-6 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-blue-50/50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-blue-950/30 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-800/40 rounded-2xl hover:border-emerald-300/60 dark:hover:border-emerald-700/60 hover:shadow-xl hover:shadow-emerald-200/30 dark:hover:shadow-emerald-900/20 transition-all text-left"
                              disabled={loadingTrending}
                            >
                              {loadingTrending ? (
                                <div className="animate-pulse">
                                  <div className="h-4 bg-emerald-200/50 dark:bg-emerald-800/50 rounded w-3/4 mb-3"></div>
                                  <div className="h-3 bg-emerald-200/30 dark:bg-emerald-800/30 rounded w-1/2"></div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 rounded-lg"></div>
                                  </div>
                                  <span className="text-sm font-medium text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 leading-relaxed line-clamp-3 transition-colors">
                                    {suggestion}
                                  </span>
                                </>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-0 w-full">
                    {messages.map((message, index) => (
                      <ChatMessage 
                        key={message.id} 
                        message={message} 
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
              
              {/* Loading Indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-3 md:gap-4 p-4 md:p-6"
                  >
                    <div className={`flex ${isMobile ? 'h-6 w-6' : 'h-8 w-8'} shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 text-white shadow-lg`}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold`}
                      >
                        AI
                      </motion.div>
                    </div>
                    <LoadingDots />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-emerald-200/30 dark:border-emerald-800/30 bg-gradient-to-r from-card/40 via-emerald-50/20 to-teal-50/20 dark:from-card/40 dark:via-emerald-950/20 dark:to-teal-950/20 backdrop-blur-xl"
          >
            <div className="p-4">
              {/* Quota Warning */}
              {remainingQuota <= 5 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-xl p-4 mb-4 ${
                    remainingQuota <= 0 
                      ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800'
                      : 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${remainingQuota <= 0 ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`}></div>
                    <p className={`text-sm font-medium ${
                      remainingQuota <= 0 
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {remainingQuota <= 0 
                        ? 'Daily limit reached. Please login for unlimited messages.'
                        : `Only ${remainingQuota} messages remaining today.`
                      }
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-4 bg-gradient-to-r from-emerald-50/40 via-teal-50/30 to-blue-50/40 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-blue-950/30 rounded-xl border border-emerald-200/40 dark:border-emerald-800/40"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium">Attached Files:</span>
                  </div>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-background/60 backdrop-blur-sm p-3 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-blue-500/20 rounded-lg flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Code Mode Indicator */}
              {isCodeMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Code className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Code Mode Active - AI will provide detailed code solutions
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCodeMode(false)}
                      className="ml-auto h-8 w-8 p-0 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isCodeMode ? "Describe the code you want me to create..." : "Type your message..."}
                    disabled={isLoading || (!isAuthenticated && remainingQuota <= 0)}
                    className="pr-20 h-12 bg-background/60 backdrop-blur-sm border-emerald-200/40 dark:border-emerald-800/40 focus:border-emerald-400 dark:focus:border-emerald-600 rounded-xl transition-all duration-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  
                  {/* Input Actions */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 p-0 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                      title="Upload files"
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCodeMode(!isCodeMode)}
                      className={`h-8 w-8 p-0 rounded-lg transition-all ${isCodeMode ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50'}`}
                      title="Toggle code mode"
                    >
                      <Code className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  disabled={!input.trim() || isLoading || (!isAuthenticated && remainingQuota <= 0)}
                  className="h-12 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:via-teal-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-emerald-500/25 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Instructions */}
              <div className="text-center mt-4">
                <p className="text-xs text-muted-foreground/70">
                  {!isMobile && 'Press Enter to send, Shift+Enter for new line • '}
                  AI can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dialogs */}
      <SettingsDialog 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />

      <LoginForm 
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {logoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-card p-4 md:p-6 rounded-xl border shadow-lg w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} border-emerald-200/40 dark:border-emerald-800/40`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Logo size="md" variant="icon-only" />
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                  Confirm Logout
                </h3>
              </div>
              <p className={`text-muted-foreground mb-6 ${isMobile ? 'text-sm' : ''}`}>
                Are you sure you want to logout? Your current chat will be saved automatically.
              </p>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setLogoutConfirm(false)}
                  size={isMobile ? "sm" : "default"}
                  className="border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmLogout}
                  size={isMobile ? "sm" : "default"}
                >
                  Logout
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}