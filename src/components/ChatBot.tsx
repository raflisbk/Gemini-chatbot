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
  
  // Updated useChat hook dengan loadMessages
  const { messages, isLoading, error, sendMessage, clearMessages, clearError, loadMessages } = useChat();
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
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>

              {/* Search */}
              {isAuthenticated && chatSessions.length > 0 && (
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="chat-search"
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 border-muted focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Main Content */}
              <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-6">
                  {/* Chat History - untuk authenticated users */}
                  {isAuthenticated && (
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
                                    ? 'bg-primary/10 border-primary shadow-md'
                                    : 'hover:bg-muted/50 border-border hover:border-muted-foreground/20'
                                } chat-session-item`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate text-foreground">
                                      {session.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(session.updatedAt).toLocaleDateString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        • {session.messages.length} messages
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity delete-button hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {searchQuery ? 'No chats found' : 'No chat history yet'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {searchQuery ? 'Try a different search term' : 'Start a conversation to see your chats here'}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Trending Topics */}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-3">Trending Topics</h3>
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
                    <h3 className="text-xs font-medium text-muted-foreground mb-3">Code Templates</h3>
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
                            {isAdmin ? 'Admin' : 'User'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSettingsOpen(true)}
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLogout}
                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setLoginOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-muted"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Welcome Message */}
              {messages.length === 0 && showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Logo className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      Welcome to ChatBot AI
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your intelligent assistant for everything. Ask questions, get code help, or have a conversation.
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid gap-4 max-w-2xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          icon: <Code className="h-5 w-5" />,
                          title: "Code Help",
                          description: "Get programming assistance",
                          prompt: "Help me write a function to..."
                        },
                        {
                          icon: <FileText className="h-5 w-5" />,
                          title: "Writing",
                          description: "Create content and documents",
                          prompt: "Write a professional email about..."
                        },
                        {
                          icon: <Search className="h-5 w-5" />,
                          title: "Research",
                          description: "Get information and analysis",
                          prompt: "Explain the concept of..."
                        },
                        {
                          icon: <User className="h-5 w-5" />,
                          title: "Personal Assistant",
                          description: "Daily tasks and planning",
                          prompt: "Help me plan my..."
                        }
                      ].map((action, index) => (
                        <motion.button
                          key={action.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSuggestionClick(action.prompt)}
                          className="p-6 border border-border rounded-xl hover:border-primary/50 transition-all bg-card/50 backdrop-blur-sm hover:shadow-lg group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg flex items-center justify-center text-primary group-hover:from-emerald-500/20 group-hover:to-blue-500/20 transition-colors">
                              {action.icon}
                            </div>
                            <div className="text-left">
                              <h3 className="font-medium text-foreground">{action.title}</h3>
                              <p className="text-sm text-muted-foreground">{action.description}</p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ 
                      type: "spring", 
                      damping: 20, 
                      stiffness: 100,
                      delay: index * 0.1 
                    }}
                    className="chat-message-enter"
                  >
                    <ChatMessage message={message} index={index} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted/50 backdrop-blur-sm rounded-2xl p-4 max-w-xs">
                    <LoadingDots />
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80 mt-1">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearError}
                      className="mt-2 border-destructive/20 hover:bg-destructive/10"
                    >
                      Dismiss
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border bg-card/50 backdrop-blur-xl p-4">
            <div className="max-w-4xl mx-auto">
              {/* File Attachments */}
              {selectedFiles.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm"
                    >
                      {file.type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-green-500" />
                      )}
                      <span className="max-w-32 truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-auto p-1 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Code Mode Indicator */}
              {isCodeMode && (
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Code className="h-4 w-4" />
                  <span>Code mode enabled</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCodeMode(false)}
                    className="h-auto p-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        !isAuthenticated && remainingQuota <= 0
                          ? "Sign in to continue chatting..."
                          : isCodeMode
                          ? "Describe your coding task..."
                          : "Type your message..."
                      }
                      disabled={isLoading || (!isAuthenticated && remainingQuota <= 0)}
                      className="min-h-[52px] resize-none pr-12 chat-input rounded-xl border-2 focus:border-primary transition-all duration-300"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    
                    {/* File Upload Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-muted"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Code Mode Toggle */}
                    <Button
                      type="button"
                      variant={isCodeMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsCodeMode(!isCodeMode)}
                      disabled={isLoading}
                      className={isCodeMode ? "bg-primary text-primary-foreground" : ""}
                    >
                      <Code className="h-4 w-4" />
                    </Button>

                    {/* Send Button */}
                    <Button
                      type="submit"
                      disabled={!input.trim() || isLoading || (!isAuthenticated && remainingQuota <= 0)}
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-6 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isLoading ? (
                        <RotateCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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