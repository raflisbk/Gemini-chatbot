'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, AlertCircle, X, Settings, Plus, Sidebar, Home, LogOut, LogIn, User, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

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
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionTitle: string;
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: ''
  });
  
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

  const handleDeleteSession = (sessionId: string, sessionTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      sessionId,
      sessionTitle
    });
  };

  const confirmDeleteSession = () => {
    if (!deleteDialog.sessionId) return;
    
    try {
      // Delete from storage
      ChatStorage.deleteSession(deleteDialog.sessionId);
      
      // Update UI
      setChatSessions(prev => prev.filter(session => session.id !== deleteDialog.sessionId));
      
      // If current session is deleted, clear messages and reset
      if (currentSessionId === deleteDialog.sessionId) {
        clearMessages();
        setCurrentSessionId(null);
        setShowSuggestions(true);
      }
      
      // Close dialog
      setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: '' });
      
      console.log('Chat session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
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
                    <div className="text-center text-muted-foreground py-8">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                          💬
                        </div>
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Start chatting to create your first conversation</p>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {chatSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group relative"
                        >
                          <motion.button
                            whileHover={{ x: 4, backgroundColor: 'hsl(var(--muted))' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleLoadSession(session)}
                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                              currentSessionId === session.id 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className="text-sm font-medium truncate mb-1">
                                  {session.title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {session.messages[0]?.content.substring(0, 60)}...
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {session.messages.length} pesan • {new Date(session.updatedAt).toLocaleDateString('id-ID')}
                                </p>
                              </div>
                              
                              {/* Delete Button */}
                              <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: 'hsl(var(--destructive) / 0.1)' }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.id, session.title);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-all duration-200"
                                title="Delete conversation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
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
            
            {/* Unified Logo with Sparkles */}
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
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
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.header>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-3xl mx-auto px-4">
            {/* Welcome Screen */}
            {showSuggestions && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center py-12"
              >
                {/* Unified Logo */}
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
                    <Sparkles className="h-10 w-10 text-primary-foreground" />
                  </div>
                </motion.div>
                
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                  Welcome to AI Assistant
                </h2>
                <p className="text-lg text-muted-foreground mb-2 max-w-2xl mx-auto">
                  Ask me anything! Start with one of the topics below or type your own question.
                </p>
                
                {isGuest && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-8 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 border border-orange-200 dark:border-orange-800 rounded-xl inline-block"
                  >
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      🎁 <strong>Guest Mode:</strong> {remainingQuota} free messages remaining today
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Login for more quota and chat history
                    </p>
                  </motion.div>
                )}

                {/* Trending Prompts */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  animate="visible"
                >
                  {trendingPrompts.map((prompt, index) => (
                    <motion.div
                      key={index}
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.9 },
                        visible: { 
                          opacity: 1, 
                          y: 0, 
                          scale: 1,
                          transition: { duration: 0.4, ease: "easeOut" }
                        }
                      }}
                      whileHover={{ 
                        scale: 1.02, 
                        y: -4,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSuggestionClick(prompt)}
                      className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/40 cursor-pointer hover:shadow-xl transition-all duration-300 group"
                    >
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
                        {['🔥', '🤖', '⚡', '🍳'][index] || '💡'}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed text-left">
                        {prompt}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Messages */}
            <div className="space-y-6 py-4">
              {messages.map((message, index) => (
                <ChatMessage key={message.id} message={message} index={index} />
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted/30 rounded-2xl p-6 max-w-xs">
                    <LoadingDots />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-4 mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80">{error}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-card/30 backdrop-blur-sm border-t sticky bottom-0"
        >
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={remainingQuota <= 0 ? "Quota habis - Login untuk melanjutkan" : "Ketik pesan Anda di sini..."}
                  disabled={isLoading || remainingQuota <= 0}
                  className="min-h-[3rem] pr-16 text-base resize-none bg-background/80 border-border/60 focus:border-primary/50 rounded-2xl transition-all duration-200"
                  maxLength={4000}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: input.length > 3500 ? 1 : 0.5 }}
                    className="text-xs text-muted-foreground"
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

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.isOpen} 
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: '' })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Conversation
            </DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete <span className="font-semibold">"{deleteDialog.sessionTitle}"</span>?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                This action cannot be undone and all messages in this conversation will be permanently lost.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: '' })}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSession}
              className="flex-1 sm:flex-none gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}