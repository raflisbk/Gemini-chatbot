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
  Trash2,
  Sparkles,
  Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/ChatMessage';
import { ContinueButton } from '@/components/ContinueButton';
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
  
  // Updated useChat hook dengan loadMessages + Continue functionality
  const { 
    messages, 
    isLoading, 
    error, 
    canContinue,        // NEW: Continue state
    sendMessage, 
    continueMessage,    // NEW: Continue function
    clearMessages, 
    clearError, 
    loadMessages 
  } = useChat();
  
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

  // Auto-save session saat messages berubah
  useEffect(() => {
    if (isAuthenticated && currentSessionId && messages.length > 0) {
      // Auto-save session setiap kali ada perubahan messages
      ChatStorage.updateSession(currentSessionId, messages);
      // Refresh chat sessions list untuk menampilkan update terbaru
      loadChatSessions();
    }
  }, [messages, currentSessionId, isAuthenticated]);

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
      await sendMessage(finalMessage, selectedFiles);
      if (!isAuthenticated) {
        updateUsage();
      }
      
      // Save to chat session if authenticated
      if (isAuthenticated) {
        if (currentSessionId) {
          // Session akan di-update otomatis melalui useEffect
          // karena messages sudah berubah dari sendMessage
        } else if (messages.length === 0) {
          // Create new session untuk chat baru
          const newSession = ChatStorage.createSession({
            id: generateId(),
            content: finalMessage,
            role: 'user',
            timestamp: new Date(),
          });
          setCurrentSessionId(newSession.id);
          loadChatSessions();
        }
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

  // Handle session selection - FIXED VERSION
  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    
    // Load messages dari session yang dipilih
    if (session.messages && session.messages.length > 0) {
      loadMessages(session.messages);
      setShowSuggestions(false);
    } else {
      // Jika session kosong, clear messages
      clearMessages();
      setShowSuggestions(true);
    }
    
    // Close sidebar on mobile after selecting session
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

  // NEW: Handle continue message
  const handleContinue = async () => {
    try {
      await continueMessage();
    } catch (error) {
      console.error('Failed to continue message:', error);
    }
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile Overlay */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              />
            )}
            
            {/* Sidebar Content */}
            <motion.div
              ref={sidebarRef}
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className={`
                ${isMobile ? 'fixed' : 'relative'} 
                left-0 top-0 h-full w-80 bg-card/95 backdrop-blur-xl 
                border-r border-border z-50 flex flex-col overflow-hidden
                shadow-2xl
              `}
            >
              {/* Sidebar Header */}
              <div className="p-6 border-b border-border bg-card/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Logo className="w-8 h-8" />
                    <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      ChatBot AI
                    </span>
                  </div>
                  {isMobile && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSidebarOpen(false)}
                      className="hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* New Chat Button */}
                <Button 
                  onClick={handleNewChat} 
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <Plus className="h-4 w-4" />
                  New Conversation
                </Button>
              </div>

              {/* Sidebar Body */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 py-4">
                  {/* Search */}
                  {isAuthenticated && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="chat-search"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/30 border-border focus:bg-background transition-colors"
                      />
                    </div>
                  )}

                  {/* Chat Sessions */}
                  {isAuthenticated ? (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Recent Conversations</h3>
                      <div className="space-y-2">
                        {filteredSessions.slice(0, 10).map((session) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ x: 4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSessionSelect(session)}
                            className={`
                              group p-3 rounded-xl cursor-pointer transition-all duration-200 border
                              ${currentSessionId === session.id
                                ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10'
                                : 'bg-muted/30 hover:bg-muted/50 border-transparent hover:border-border'
                              }
                            `}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate mb-1">
                                  {session.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{session.messages.length} messages</span>
                                  <span>•</span>
                                  <span>{session.updatedAt.toLocaleDateString()}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                        
                        {filteredSessions.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium mb-1">
                              {searchQuery ? 'No conversations found' : 'No conversations yet'}
                            </p>
                            <p className="text-xs">
                              {searchQuery ? 'Try a different search term' : 'Start a conversation to see your chats here'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-xl p-6 border border-primary/20">
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                          className="mb-4"
                        >
                          <Sparkles className="h-12 w-12 mx-auto text-primary" />
                        </motion.div>
                        <h3 className="font-semibold mb-2">Welcome to ChatBot AI</h3>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          Sign in to save your conversations, get more daily messages, and access premium features.
                        </p>
                        <Button 
                          onClick={() => setLoginOpen(true)}
                          className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Sign In
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Trending Topics */}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Trending Topics</h3>
                    {loadingTrending ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {trendingPrompts.slice(0, 6).map((prompt, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSuggestionClick(prompt)}
                            className="w-full p-3 text-left text-sm rounded-lg hover:bg-muted/50 border border-border hover:border-muted-foreground/20 transition-all sidebar-item"
                          >
                            {prompt}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Code Templates */}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Code Templates</h3>
                    <div className="space-y-1">
                      {[
                        "Create a React component",
                        "Write a Python function",
                        "Build a REST API",
                        "Debug this code",
                        "Optimize performance",
                        "Write unit tests"
                      ].map((template, index) => (
                        <motion.button
                          key={template}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleCodeTemplate(template)}
                          className="w-full p-3 text-left text-sm rounded-lg hover:bg-muted/50 border border-border hover:border-muted-foreground/20 transition-all sidebar-item flex items-center gap-2"
                        >
                          <Code className="h-3 w-3 text-muted-foreground" />
                          {template}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-border bg-card/50">
                {/* Usage Display */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Daily Usage</span>
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor()}`} />
                  </div>
                  <p className={`text-sm font-medium ${getStatusColor()}`}>
                    {getUsageDisplay()}
                  </p>
                </div>

                {/* User Section */}
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user?.name || user?.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {isAdmin ? 'Administrator' : 'User'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSettingsOpen(true)}
                        className="flex-1 gap-2"
                      >
                        <Settings className="h-3 w-3" />
                        Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-2"
                      >
                        <LogOut className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettingsOpen(true)}
                      className="w-full gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                    <Button
                      onClick={() => setLoginOpen(true)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white gap-2"
                      size="sm"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl border-b border-border relative z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-muted"
            >
              {sidebarOpen ? <Sidebar className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6" />
              <h1 className="font-semibold text-lg hidden sm:block">ChatBot AI</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoHome}
              className="hover:bg-muted"
            >
              <Home className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="max-w-4xl mx-auto p-4 space-y-6">
              {/* Welcome Screen */}
              {messages.length === 0 && showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="mb-8"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/25">
                      <Logo className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>

                  <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome to ChatBot AI
                  </h1>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg leading-relaxed">
                    Your intelligent assistant for everything. Ask questions, get code help, brainstorm ideas, or have a conversation about trending topics.
                  </p>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12">
                    {[
                      { icon: Code, label: "Code Help", action: () => setIsCodeMode(true) },
                      { icon: FileText, label: "Writing", action: () => setInput("Help me write") },
                      { icon: Sparkles, label: "Ideas", action: () => setInput("Give me creative ideas for") },
                      { icon: Search, label: "Research", action: () => setInput("Research and explain") },
                    ].map((item, index) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={item.action}
                        className="p-4 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-all group"
                      >
                        <item.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                        <p className="text-sm font-medium">{item.label}</p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Trending Topics Grid */}
                  <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl font-semibold mb-6 flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Trending Topics in Indonesia
                    </h2>
                    
                    {loadingTrending ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trendingPrompts.slice(0, 6).map((prompt, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSuggestionClick(prompt)}
                            className="p-4 text-left rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-primary/5 hover:to-primary/10 border border-border hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 group-hover:scale-125 transition-transform" />
                              <p className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                                {prompt}
                              </p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-destructive font-medium mb-2">Something went wrong</p>
                      <p className="text-sm text-destructive/80">{error}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearError}
                        className="mt-3 h-8 px-3 text-destructive hover:bg-destructive/10"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ChatMessage message={message} index={index} />
                  </motion.div>
                ))}

                {/* NEW: Continue Button */}
                {canContinue && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <ContinueButton
                      onContinue={handleContinue}
                      isLoading={false}
                      disabled={false}
                    />
                  </motion.div>
                )}

                {/* Loading Indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-blue-500">
                        <Logo className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex items-center gap-3">
                        <LoadingDots />
                        <span className="text-sm text-muted-foreground font-medium">
                          AI is thinking...
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border bg-card/95 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto p-4">
              {/* Code Mode Indicator */}
              {isCodeMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20"
                >
                  <Code className="h-4 w-4" />
                  <span className="font-medium">Code Mode Active</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCodeMode(false)}
                    className="h-5 w-5 p-0 hover:bg-primary/20 ml-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </motion.div>
              )}

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex flex-wrap gap-2"
                >
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm border border-border"
                    >
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-32 font-medium">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Main Input Form */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-3">
                  {/* File Upload Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="h-12 w-12 rounded-xl hover:bg-muted shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <div className="relative">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          !isAuthenticated && remainingQuota <= 0
                            ? 'Sign in to continue chatting...'
                            : isCodeMode
                            ? 'Describe the code you want to create...'
                            : 'Type your message...'
                        }
                        disabled={isLoading || (!isAuthenticated && remainingQuota <= 0)}
                        className="min-h-12 py-3 pr-12 resize-none border-border bg-muted/30 focus:bg-background rounded-xl"
                        maxLength={4000}
                      />
                      
                      {/* Character Counter */}
                      {input.length > 3500 && (
                        <div className="absolute -top-6 right-0 text-xs text-muted-foreground font-mono">
                          {input.length}/4000
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading || (!isAuthenticated && remainingQuota <= 0)}
                    className="h-12 w-12 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shrink-0 shadow-lg hover:shadow-xl transition-all"
                  >
                    {isLoading ? (
                      <RotateCcw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </form>

              {/* Usage Warning */}
              {!isAuthenticated && remainingQuota <= 3 && remainingQuota > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-center"
                >
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ {remainingQuota} free messages remaining today. 
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setLoginOpen(true)}
                      className="p-0 h-auto text-xs underline ml-1 text-amber-600 dark:text-amber-400"
                    >
                      Sign in for more
                    </Button>
                  </p>
                </motion.div>
              )}

              {/* Footer Text */}
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">
                  ChatBot AI can make mistakes. Consider checking important information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <LoginForm 
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)}
      />

      {/* Logout Confirmation */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
          >
            <h3 className="text-lg font-semibold mb-2">Confirm Logout</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to sign out? Your chat history will be saved.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmLogout}
              >
                Sign Out
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}