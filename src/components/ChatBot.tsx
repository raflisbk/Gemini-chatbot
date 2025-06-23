'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, AlertCircle, X, Settings, Plus, Sidebar, Home, LogOut, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/ChatMessage';
import { LoadingDots } from '@/components/LoadingDots';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsDialog } from '@/components/SettingsDialog';
import { LoginForm } from '@/components/LoginForm';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearMessages, clearError } = useChat();
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
    // Load messages from selected session
    setCurrentSessionId(session.id);
    setShowSuggestions(false);
    setSidebarOpen(false);
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

  const handleLogout = () => {
    logout();
    handleNewChat(); // Clear current chat
    setChatSessions([]); // Clear sessions
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-72 bg-card/50 backdrop-blur-sm border-r flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b">
              <Button
                onClick={handleNewChat}
                className="w-full justify-start gap-2 mb-3"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
              
              {/* User Info / Login Section */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm">
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user?.name}
                    </p>
                    <p className={`text-xs ${getQuotaColor()}`}>
                      {getQuotaText()} messages left
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Logout"
                    className="h-8 w-8"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
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
                  
                  <Button
                    onClick={handleLogin}
                    className="w-full justify-start gap-2"
                    variant="default"
                    size="sm"
                  >
                    <LogIn className="h-4 w-4" />
                    Login for More Features
                  </Button>
                  
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
                    <div className="text-xs text-muted-foreground p-2 text-center">
                      Your chat history will appear here
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        whileHover={{ scale: 1.02 }}
                        className="group relative"
                      >
                        <button
                          onClick={() => handleLoadSession(session)}
                          className={`w-full text-left p-2 rounded-lg text-sm transition-colors hover:bg-muted ${
                            currentSessionId === session.id ? 'bg-muted' : ''
                          }`}
                        >
                          <p className="font-medium truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.messages.length} pesan • {new Date(session.updatedAt).toLocaleDateString()}
                          </p>
                        </button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSession(session.id)}
                          className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Guest Chat Info */}
            {!isAuthenticated && (
              <div className="flex-1 p-4">
                <div className="text-center text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium mb-2">Chat as Guest</p>
                  <p className="text-xs leading-relaxed">
                    You can chat without logging in, but with limited features. 
                    Login to access chat history and more messages per day.
                  </p>
                </div>
              </div>
            )}

            {/* Sidebar Footer */}
            <div className="p-4 border-t space-y-2">
              {isAuthenticated && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              )}
              
              <div className="text-xs text-center text-muted-foreground">
                AI Chatbot v2.0 • Powered by Gemini
              </div>
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
          className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Sidebar className="h-4 w-4" />
            </Button>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg"
            >
              AI
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold">AI Chatbot</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'AI is thinking...' : isGuest ? 'Free access • Login for more features' : 'Trending topics from Indonesia'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex"
              title="Toggle sidebar"
            >
              <Sidebar className="h-4 w-4" />
            </Button>
            
            {!showSuggestions && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoHome}
                title="Go to home"
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
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <ThemeToggle />
            
            {!isAuthenticated ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogin}
                title="Login"
              >
                <LogIn className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.header>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/10 border-destructive/20 border-l-4 border-l-destructive"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearError}
                  className="h-6 w-6 text-destructive hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 6,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-2xl"
                  >
                    AI
                  </motion.div>
                  
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                    {isGuest ? 'Welcome to AI Chatbot!' : 'Apa yang sedang trending hari ini?'}
                  </h2>
                  
                  <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                    {isGuest 
                      ? 'Chat for free with AI about Indonesian trending topics. Login for unlimited access and chat history!'
                      : 'Tanyakan tentang topik trending Indonesia, berita terkini, atau apa saja yang ingin Anda ketahui.'
                    }
                  </p>

                  {/* Trending Suggestion Cards */}
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="w-full max-w-2xl"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          🔥 Trending Topics Indonesia
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={refreshTrending}
                          disabled={loadingTrending}
                          className="text-xs"
                        >
                          {loadingTrending ? '...' : 'Refresh'}
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(loadingTrending ? Array(4).fill('') : trendingPrompts).map((suggestion, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            onClick={() => suggestion && handleSuggestionClick(suggestion)}
                            disabled={loadingTrending}
                            className="p-4 text-left bg-card hover:bg-accent/50 border rounded-xl transition-all duration-200 group shadow-sm hover:shadow-md disabled:opacity-50"
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
                  )}
                </motion.div>
              ) : (
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
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-lg">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-sm font-bold"
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
                    ? (isGuest 
                        ? '🚫 Guest quota habis! Login untuk mendapat 50 pesan/hari.'
                        : '🚫 Quota habis! Coba lagi besok atau hubungi admin.'
                      )
                    : `⚠️ Quota hampir habis! Tersisa ${remainingQuota} pesan ${isGuest ? '(Guest mode)' : 'hari ini'}.`
                  }
                  {isGuest && remainingQuota <= 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogin}
                      className="ml-2 h-6 text-xs"
                    >
                      Login Now
                    </Button>
                  )}
                </p>
              </motion.div>
            )}
            
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    remainingQuota <= 0 
                      ? (isGuest ? "Login to continue chatting..." : "Quota habis, coba besok...")
                      : "Tanyakan tentang trending topics Indonesia..."
                  }
                  disabled={isLoading || remainingQuota <= 0}
                  className="pr-20 py-6 text-base bg-background/80 backdrop-blur-sm border-2 focus:border-primary/50 transition-all duration-200 rounded-2xl shadow-sm"
                  autoFocus
                />
                
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <motion.div
                    className="text-xs text-muted-foreground"
                    animate={{ opacity: input.length > 0 ? 1 : 0.5 }}
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
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />
    </div>
  );
}