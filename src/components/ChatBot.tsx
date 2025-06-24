'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, AlertCircle, X, Settings, Plus, Sidebar, Home, LogOut, LogIn, User, ChevronRight, Sparkles, Trash2 } from 'lucide-react';
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

export function ChatBot() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [trendingPrompts, setTrendingPrompts] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearMessages, clearError, loadSession } = useChat();
  const { user, logout, updateUsage, remainingQuota, isAdmin, isAuthenticated, isGuest } = useAuth();

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

  // Hide suggestions when first message is sent
  useEffect(() => {
    if (messages.length > 0 && showSuggestions) {
      setShowSuggestions(false);
    }
  }, [messages.length, showSuggestions]);

  // Save current session when messages change (only for logged in users)
  useEffect(() => {
    if (messages.length > 0 && currentSessionId && isAuthenticated) {
      ChatStorage.updateSessionMessages(currentSessionId, messages);
      loadChatSessions(); // Refresh sidebar
    }
  }, [messages, currentSessionId, isAuthenticated]);

  const loadChatSessions = () => {
    if (isAuthenticated) {
      const sessions = ChatStorage.getSessions();
      setChatSessions(sessions);
    }
  };

  const loadTrendingPrompts = async () => {
    try {
      setLoadingTrending(true);
      const prompts = await TrendingAPI.getRandomPrompts(4);
      setTrendingPrompts(prompts);
    } catch (error) {
      console.error('Failed to load trending prompts:', error);
      // Fallback prompts
      setTrendingPrompts([
        "Jelaskan perkembangan AI di Indonesia dan dampaknya terhadap UMKM",
        "Bagaimana tren ekonomi digital mempengaruhi generasi muda Indonesia?",
        "Analisis potensi wisata berkelanjutan di Indonesia pasca pandemi",
        "Strategi pengembangan startup fintech syariah di Indonesia"
      ]);
    } finally {
      setLoadingTrending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check quota
    if (remainingQuota <= 0) {
      const quotaMessage = isGuest 
        ? 'Quota harian guest sudah habis (10 pesan/hari). Login untuk mendapat quota lebih banyak!'
        : 'Quota harian Anda sudah habis. Silakan coba lagi besok atau hubungi admin.';
      alert(quotaMessage);
      return;
    }

    const message = input.trim();
    setInput('');
    setShowSuggestions(false);

    // Create new session if needed (only for logged in users)
    if (!currentSessionId && messages.length === 0 && isAuthenticated) {
      const firstMessage = {
        id: Date.now().toString(),
        content: message,
        role: 'user' as const,
        timestamp: new Date()
      };
      
      const newSession = ChatStorage.createSession(firstMessage);
      setCurrentSessionId(newSession.id);
      ChatStorage.saveSession(newSession);
      loadChatSessions();
    }

    await sendMessage(message);
    updateUsage(); // Update quota after successful message
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = () => {
    clearMessages();
    setCurrentSessionId(null);
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const handleLoadSession = (session: ChatSession) => {
    try {
      // Set the current session ID
      setCurrentSessionId(session.id);
      setShowSuggestions(false);
      setSidebarOpen(false);
      
      // Load messages from the session using the enhanced useChat hook
      if (session.messages && session.messages.length > 0) {
        console.log('Loading session:', session.title, 'with', session.messages.length, 'messages');
        loadSession(session.messages);
      } else {
        // If no messages in session, just clear current messages
        clearMessages();
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // Fallback to clearing messages if there's an error
      clearMessages();
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (isAuthenticated) {
      ChatStorage.deleteSession(sessionId);
      loadChatSessions();
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    }
  };

  const handleGoHome = () => {
    handleNewChat();
  };

  const refreshTrending = () => {
    loadTrendingPrompts();
  };

  const handleLogin = () => {
    setLoginOpen(true);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleNewChat(); // Clear current chat
      setChatSessions([]); // Clear sessions
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    setDeletingSessionId(sessionToDelete);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Animation delay
      handleDeleteSession(sessionToDelete);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const getQuotaColor = () => {
    if (remainingQuota <= 0) return 'text-red-500';
    if (remainingQuota <= 5) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getQuotaText = () => {
    if (isGuest) {
      return `${remainingQuota}/10 (Guest)`;
    }
    return `${remainingQuota}/${isAdmin ? '500' : '50'} ${isAdmin ? '(Admin)' : ''}`;
  };

  // Enhanced animation variants
  const floatingButtonVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    },
    hover: {
      scale: 1.1,
      rotate: 15,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
      {/* Enhanced floating sidebar toggle - positioned on the left */}
      <motion.div
        className="fixed left-4 top-4 z-50"
        variants={floatingButtonVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-xl border-2 border-primary/20 shadow-2xl hover:shadow-primary/25 transition-all duration-300"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <motion.div
            animate={{ 
              rotate: sidebarOpen ? 180 : 0,
              scale: isHovering ? 1.2 : 1
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20 
            }}
          >
            <Sidebar className="h-5 w-5" />
          </motion.div>
          
          {/* Floating sparkles effect */}
          <AnimatePresence>
            {isHovering && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary rounded-full"
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{
                      scale: [0, 1, 0],
                      x: [0, (i - 1) * 20],
                      y: [0, -20 - i * 5],
                    }}
                    exit={{ scale: 0 }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Backdrop overlay with blur effect */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Enhanced Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8
            }}
            className="w-72 bg-card/30 backdrop-blur-2xl border-r border-border/50 flex flex-col z-50 shadow-2xl"
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border/50 relative">
              {/* Close Sidebar Button */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">AI Chatbot</h3>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="h-8 w-8 hover:bg-muted/50"
                    title="Close sidebar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleNewChat}
                  className="w-full justify-start gap-3 mb-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-colors"
                >
                  <motion.div
                    animate={{ rotate: [0, 90, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Plus className="h-4 w-4" />
                  </motion.div>
                  New Chat
                  <motion.div
                    className="ml-auto"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Sparkles className="h-3 w-3" />
                  </motion.div>
                </Button>
              </motion.div>
              
              {/* User Info / Login Section */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm">
                    <p className="font-medium flex items-center gap-2">
                      <motion.div
                        className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <User className="h-4 w-4" />
                      </motion.div>
                      {user?.name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className={`text-xs ${getQuotaColor()}`}>
                      {getQuotaText()} messages left
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={confirmLogout}
                      title="Logout"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Guest Mode
                    </p>
                    <p className={`text-xs ${getQuotaColor()}`}>
                      {getQuotaText()} messages left
                    </p>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleLogin}
                      className="w-full justify-start gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                      size="sm"
                    >
                      <LogIn className="h-4 w-4" />
                      Login for More Features
                    </Button>
                  </motion.div>
                  
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    Login to get:
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>50 messages/day (vs 10)</li>
                      <li>Save chat history</li>
                      <li>Access settings</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat History - Only for logged in users */}
            {isAuthenticated && (
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground p-2">
                    Recent Conversations ({chatSessions.length})
                  </div>
                  
                  {chatSessions.length === 0 ? (
                    <motion.div 
                      className="text-center text-muted-foreground text-sm py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      No conversations yet.<br />
                      Start chatting to see your history here.
                    </motion.div>
                  ) : (
                    <div className="space-y-1">
                      {chatSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant={currentSessionId === session.id ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start text-left h-auto py-2 px-2 relative"
                            onClick={() => handleLoadSession(session)}
                          >
                            <ChevronRight className="h-3 w-3 mr-2 flex-shrink-0" />
                            <div className="truncate flex-1">
                              <div className="text-xs font-medium truncate">
                                {session.title || 'New Chat'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {session.messages?.[0]?.content?.slice(0, 30) || 'Empty chat'}
                              </div>
                            </div>
                            {session.messages?.length && (
                              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 ml-1">
                                {session.messages.length}
                              </span>
                            )}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-border/50 space-y-2 relative">
              {isAuthenticated && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 max-w-4xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-30"
        >
          <div className="flex items-center gap-4 ml-16 lg:ml-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Sidebar className="h-4 w-4" />
            </Button>
            
            <Logo size="md" animate={true} />
            <div>
              <motion.h1 
                className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                AI Chatbot
              </motion.h1>
              <motion.p 
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      🤖
                    </motion.span>
                    AI is thinking...
                  </span>
                ) : isGuest ? 
                  'Free access • Login for more features' : 
                  'Trending topics from Indonesia'
                }
              </motion.p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!showSuggestions && (
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoHome}
                  title="Go to home"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
            
            {messages.length > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewChat}
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
            
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={clearMessages}
                disabled={messages.length === 0 || isLoading}
                title="Clear conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </motion.div>
            
            <ThemeToggle />
            
            {!isAuthenticated && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleLogin}
                  size="sm"
                  className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <LogIn className="h-3 w-3" />
                  Login
                </Button>
              </motion.div>
            )}
          </div>
        </motion.header>

        {/* Chat Messages Area */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mx-4 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Something went wrong</p>
                    <p className="text-xs text-destructive/80 mt-1">{error}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {/* Welcome Screen with Trending Suggestions */}
              {showSuggestions && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center min-h-[50vh] p-8"
                >
                  <motion.div
                    className="text-center mb-8"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Logo size="xl" variant="floating" animate={true} />
                    <motion.h2 
                      className="text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mt-6"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    >
                      Welcome to AI Chatbot
                    </motion.h2>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                      Explore trending topics from Indonesia or ask anything you'd like to know
                    </p>
                  </motion.div>

                  {/* Trending Prompts */}
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-2xl"
                  >
                    <h3 className="text-lg font-semibold mb-4 text-center">
                      🔥 Trending in Indonesia
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {trendingPrompts.slice(0, 6).map((suggestion, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="group p-4 text-left bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-card/70 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {loadingTrending ? (
                            <div className="animate-pulse">
                              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          ) : (
                            <span className="text-sm text-foreground group-hover:text-accent-foreground">
                              {suggestion}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Chat Messages */}
              {messages.length > 0 && (
                <div className="space-y-0">
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
                  className="flex gap-4 p-6"
                >
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                    <Logo size="sm" animate={true} />
                  </div>
                  <LoadingDots />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Enhanced Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t bg-card/30 backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto p-4">
            {/* Quota Warning */}
            {remainingQuota <= 5 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-3 mb-3 ${
                  remainingQuota <= 0 
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                }`}
              >
                <p className={`text-sm ${
                  remainingQuota <= 0 
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}>
                  {remainingQuota <= 0 
                    ? 'You have reached your daily message limit. Please try again tomorrow or login for more messages.'
                    : `You have ${remainingQuota} messages remaining today. ${isGuest ? 'Login to get more messages!' : ''}`
                  }
                </p>
              </motion.div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    remainingQuota <= 0 
                      ? "Daily limit reached..." 
                      : "Type your message here..."
                  }
                  disabled={isLoading || remainingQuota <= 0}
                  className="pr-16 py-6 text-base bg-background/50 backdrop-blur-sm border-2 hover:border-primary/30 focus:border-primary transition-all duration-300 rounded-2xl shadow-lg"
                  maxLength={4000}
                />
                
                {/* Character Counter */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <motion.div
                    className="text-xs text-muted-foreground font-mono"
                    animate={{ 
                      color: input.length > 3500 ? '#ef4444' : '#6b7280',
                      scale: input.length > 3500 ? 1.1 : 1 
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {input.length}/4000
                  </motion.div>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || remainingQuota <= 0}
                size="lg"
                className="px-6 py-6 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl disabled:opacity-50"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2"
                >
                  <Send className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Send</span>
                </motion.div>
              </Button>
            </form>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1">
                Press <kbd className="px-2 py-1 text-xs font-mono bg-muted/60 rounded border shadow-sm">↵</kbd> to send
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs font-mono bg-muted/60 rounded border shadow-sm">⇧ ↵</kbd> for new line
              </span>
              {isGuest && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Free to use • Login for more
                </span>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <SettingsDialog 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      
      <LoginForm 
        open={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete Conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this conversation? 
                  All messages in this chat will be permanently removed.
                </p>
                {sessionToDelete && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Chat:</strong> {chatSessions.find(s => s.id === sessionToDelete)?.title || 'Untitled'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={confirmDeleteSession}
                    className="px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Confirm Logout</h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to logout?
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  You will be signed out and your current chat will be cleared. 
                  Your saved chat history will remain available when you log back in.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleLogout}
                    className="px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}