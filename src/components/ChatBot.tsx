'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Plus, 
  Menu, 
  X, 
  Search, 
  Settings, 
  Bot, 
  Upload,
  User,
  MessageSquare,
  Trash2,
  Archive,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  FileText
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

// Custom Components
import { ChatMessage } from './ChatMessage';
import { FileUpload } from './FileUpload';
import { CodeMode } from './CodeMode';
import { LoadingDots } from './LoadingDots';
import { Logo } from './Logo';

// Context and Utilities
import { useAuth } from '@/context/AuthContext';
import { ChatStorage, type ChatSession, type Message } from '@/lib/chatStorage';
import TrendingAPI from '@/lib/trendingAPI';
import { generateId, debounce, cn } from '@/lib/utils';

// Types
interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
}

interface TrendingTopic {
  title: string;
  category: string;
  source: string;
  prompt: string;
}

interface ChatSettings {
  showTimestamps: boolean;
  compactMode: boolean;
  autoSave: boolean;
}

export function ChatBot() {
  // Auth context
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading, 
    isGuest, 
    isAdmin,
    usage,
    updateUsage,
    refreshUsage,
    chatSettings,
    modelSettings
  } = useAuth();

  // Core chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  
  // Features
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  // Load chat sessions
  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await ChatStorage.getSessions(user?.id);
      setChatSessions(sessions);
      
      // If no current session and we have sessions, load the most recent
      if (!currentSessionId && sessions.length > 0) {
        const latestSession = sessions[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setError('Failed to load chat history');
    }
  }, [user?.id, currentSessionId]);

  // Load trending topics
  const loadTrendingTopics = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const topics = await TrendingAPI.getTrendingTopics();
      setTrendingTopics(topics.slice(0, 6)); // Show top 6
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      if (!authLoading) {
        await Promise.all([
          loadChatSessions(),
          loadTrendingTopics()
        ]);
        setIsInitializing(false);
      }
    };

    initialize();
  }, [authLoading, loadChatSessions, loadTrendingTopics]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-focus input
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Start new chat
  const startNewChat = useCallback(() => {
    const newSession = ChatStorage.createNewSession(undefined, user?.id);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setUploadedFiles([]);
    setShowWelcome(true);
    setError(null);
    setRetryCount(0);
    
    // Save empty session
    ChatStorage.saveSession(newSession, user?.id);
    loadChatSessions();
  }, [user?.id, loadChatSessions]);

  // Load existing session
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const session = await ChatStorage.getSessionById(sessionId, user?.id);
      if (session) {
        setCurrentSessionId(sessionId);
        setMessages(session.messages);
        setShowWelcome(false);
        setError(null);
        setRetryCount(0);
        
        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
          setShowSidebar(false);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Failed to load conversation');
    }
  }, [user?.id]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await ChatStorage.deleteSession(sessionId, user?.id);
      
      // If deleting current session, start new chat
      if (sessionId === currentSessionId) {
        startNewChat();
      }
      
      // Reload sessions
      await loadChatSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete conversation');
    }
  }, [user?.id, currentSessionId, startNewChat, loadChatSessions]);

  // Handle file uploads
// NEW - Replace with this:
const handleFilesSelected = useCallback((files: File[]) => {
  // Convert File[] to UploadedFile[] temporarily for UI
  const tempUploadedFiles: UploadedFile[] = files.map(file => ({
    id: generateId(), // Temporary ID
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    url: '' // Will be filled after actual upload
  }));
  
  setUploadedFiles(prev => [...prev, ...tempUploadedFiles]);
  setError(null);
  }, []);

  const handleFileUploadError = useCallback((error: string) => {
    setError(error);
  }, []);

  const removeUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Handle trending topic click
  const handleTrendingClick = useCallback((topic: TrendingTopic) => {
    setInput(topic.prompt);
    setIsCodeMode(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle code template selection
  const handleCodeTemplate = useCallback((template: string) => {
    setInput(template);
    setIsCodeMode(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    
    // Check quota
    if (isGuest && usage.remainingQuota <= 0) {
      setError('Daily message limit reached. Please login for more messages.');
      return;
    }
    
    if (isAuthenticated && usage.remainingQuota <= 0) {
      setError('Daily message limit reached. Please upgrade your account.');
      return;
    }

    const messageContent = input.trim();
    const attachments = [...uploadedFiles];
    
    // Clear input and files
    setInput('');
    setUploadedFiles([]);
    setError(null);
    setIsLoading(true);
    setShowWelcome(false);

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);

    try {
      // Ensure we have a session
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession = ChatStorage.createNewSession(
          messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''),
          user?.id
        );
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
        await ChatStorage.saveSession(newSession, user?.id);
      }

      // Add user message to session
      await ChatStorage.addMessageToSession(sessionId, {
        role: 'user',
        content: messageContent,
        attachments: attachments.length > 0 ? attachments : undefined
      }, user?.id);

      // Prepare API request
      const requestBody = {
        message: messageContent,
        sessionId,
        attachments: attachments.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          url: file.url
        })),
        settings: {
          model: modelSettings.model,
          temperature: modelSettings.temperature,
          maxTokens: modelSettings.maxTokens,
          systemPrompt: modelSettings.systemPrompt
        }
      };

      // Send to API
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Create AI message
      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          model: modelSettings.model,
          sessionId: data.sessionId
        }
      };

      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);

      // Add AI message to session
      await ChatStorage.addMessageToSession(sessionId, {
        role: 'assistant',
        content: data.response,
        metadata: aiMessage.metadata
      }, user?.id);

      // Update session title if it's the first message
      const session = await ChatStorage.getSessionById(sessionId, user?.id);
      if (session && session.messages.length <= 2) {
        const title = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '');
        await ChatStorage.updateSessionTitle(sessionId, title, user?.id);
      }

      // Update usage
      await updateUsage('message');
      
      // Reload sessions to reflect changes
      await loadChatSessions();
      
      // Reset retry count on success
      setRetryCount(0);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove user message from UI on error
      setMessages(prev => prev.slice(0, -1));
      
      // Restore input and files
      setInput(messageContent);
      setUploadedFiles(attachments);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('limit')) {
          setError('Daily message limit reached. Please try again tomorrow or upgrade your account.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          setError('Session expired. Please refresh the page and login again.');
        } else {
          setError(`Failed to send message: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }, [
    input, 
    uploadedFiles, 
    isGuest, 
    isAuthenticated, 
    usage.remainingQuota, 
    currentSessionId, 
    user?.id, 
    modelSettings,
    updateUsage,
    loadChatSessions
  ]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Retry last message
  const retryLastMessage = useCallback(() => {
    if (retryCount < 3) {
      sendMessage();
    } else {
      setError('Maximum retry attempts reached. Please try a different message.');
    }
  }, [retryCount, sendMessage]);

  // Filter sessions based on search
  const filteredSessions = chatSessions.filter(session => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const title = session.title.toLowerCase();
    const hasMatchingMessage = session.messages.some(msg => 
      msg.content.toLowerCase().includes(query)
    );
    
    return title.includes(query) || hasMatchingMessage;
  });

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main Chat Interface */}
      <div className={`flex h-screen ${showSidebar ? 'lg:pl-80' : ''} transition-all duration-300`}>
        
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <>
              {/* Mobile overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 lg:hidden z-40"
                onClick={() => setShowSidebar(false)}
              />
              
              {/* Sidebar content */}
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 h-full w-80 bg-card border-r border-border z-50 lg:z-auto"
              >
                <div className="flex flex-col h-full">
                  {/* Sidebar header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                      <Logo />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSidebar(false)}
                        className="lg:hidden"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* New chat button */}
                    <Button 
                      onClick={startNewChat}
                      className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                    >
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  </div>

                  {/* User info */}
                  {isAuthenticated && user && (
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge variant={isAdmin ? "default" : "secondary"}>
                          {isAdmin ? 'Admin' : 'User'}
                        </Badge>
                      </div>
                      
                      {/* Usage info */}
                      <div className="mt-3 p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span>Messages today:</span>
                          <span className="font-medium">{usage.messageCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span>Remaining:</span>
                          <span className={cn(
                            "font-medium",
                            usage.remainingQuota < 10 ? "text-red-500" : "text-green-500"
                          )}>
                            {usage.remainingQuota}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Guest info */}
                  {isGuest && (
                    <div className="p-4 border-b border-border">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Guest Mode</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Limited to {usage.remainingQuota} messages per day
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {/* Navigate to login */}}
                        >
                          Login for More
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Search */}
                  <div className="p-4 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        className="pl-10"
                        onChange={(e) => debouncedSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Chat sessions */}
                  <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1">
                      {filteredSessions.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No conversations yet</p>
                          <p className="text-xs">Start chatting to see them here</p>
                        </div>
                      ) : (
                        filteredSessions.map((session) => (
                          <motion.div
                            key={session.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                              currentSessionId === session.id 
                                ? "bg-primary/10 border border-primary/20" 
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => loadSession(session.id)}
                          >
                            <MessageSquare className={cn(
                              "h-4 w-4 shrink-0",
                              currentSessionId === session.id ? "text-primary" : "text-muted-foreground"
                            )} />
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{session.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                              onClick={(e) => deleteSession(session.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Sidebar footer */}
                  <div className="p-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {/* Open settings */}}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                
                <div className="hidden sm:block">
                  {currentSessionId ? (
                    <div>
                      <h1 className="text-lg font-semibold">
                        {chatSessions.find(s => s.id === currentSessionId)?.title || 'Chat'}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        {messages.length} messages
                      </p>
                    </div>
                  ) : (
                    <h1 className="text-lg font-semibold">AI Assistant</h1>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Refresh button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refreshUsage()}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                {/* Settings button */}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-hidden"
          >
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto">
                {/* Welcome screen */}
                {messages.length === 0 && showWelcome && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 1, -1, 0]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="mb-8"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                        <Bot className="w-10 h-10" />
                      </div>
                    </motion.div>
                    
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4">
                      Welcome to AI Assistant
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                      Chat with advanced AI, upload files for analysis, get help with coding, and explore Indonesian trending topics.
                    </p>

                    {/* Trending topics */}
                    {trendingTopics.length > 0 && (
                      <div className="w-full max-w-4xl mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="h-5 w-5 text-emerald-500" />
                          <h2 className="text-lg font-semibold">Trending in Indonesia</h2>
                          {loadingTrending && (
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {trendingTopics.map((topic, index) => (
                            <motion.button
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTrendingClick(topic)}
                              className="p-4 text-left rounded-lg border border-border hover:border-primary/50 transition-all bg-gradient-to-r from-emerald-50/50 to-blue-50/50 dark:from-emerald-950/20 dark:to-blue-950/20"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
                                <div>
                                  <h3 className="font-medium text-sm mb-1">{topic.title}</h3>
                                  <Badge variant="secondary" className="text-xs">
                                    {topic.category}
                                  </Badge>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick actions for file upload */}
                    <div className="w-full max-w-2xl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {[
                          { icon: Upload, label: "Upload & Analyze", desc: "Drag files here or click to browse" },
                          { icon: FileText, label: "Ask Questions", desc: "Get help with any topic" },
                          { icon: Bot, label: "AI Assistance", desc: "Code, write, translate & more" }
                        ].map((action, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors"
                          >
                            <action.icon className="h-6 w-6 text-emerald-500 mb-2" />
                            <h3 className="font-medium text-sm mb-1">{action.label}</h3>
                            <p className="text-xs text-muted-foreground">{action.desc}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Upload prompts for welcome screen */}
                      {!isGuest && (
                        <div className="mb-6">
                          <p className="text-sm text-muted-foreground mb-3">Try these prompts with file uploads:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              "Analyze this document and summarize the key points",
                              "Extract data from this spreadsheet and create insights",
                              "Review this code and suggest improvements"
                            ].map((prompt, index) => (
                              <motion.button
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.9 + index * 0.1 }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                  setInput(prompt);
                                  inputRef.current?.focus();
                                }}
                                className="p-3 text-left rounded-lg border border-border hover:border-primary/50 transition-all bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20"
                              >
                                <div className="flex items-start gap-2">
                                  <Upload className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                  <span className="text-sm">{prompt}</span>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Messages */}
                <div className="space-y-4 p-4">
                  <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        index={index}
                        showTimestamp={chatSettings.showTimestamps}
                        compactMode={chatSettings.compactMode}
                        isLastMessage={index === messages.length - 1}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <LoadingDots />
                      </div>
                    </motion.div>
                  )}

                  {/* Error display with retry option */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-4"
                    >
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>{error}</span>
                          {retryCount < 3 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={retryLastMessage}
                              className="ml-4"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry ({3 - retryCount} left)
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto p-4">
              {/* Uploaded files display */}
              {uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Attached Files ({uploadedFiles.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border"
                      >
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          {file.originalName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)}KB
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeUploadedFile(file.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* File upload area */}
{!isGuest && (
  <FileUpload
                  onFilesSelected={handleFilesSelected} // Now expects File[]
                  className="mb-0"
                  maxFiles={5} selectedFiles={[]} onRemoveFile={function (index: number): void {
                    throw new Error('Function not implemented.');
                  } }  />
)}

              {/* Code mode indicator */}
              <AnimatePresence>
                {isCodeMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Code Mode Active
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCodeMode(false)}
                        className="ml-auto h-6 text-blue-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main input area */}
              <div className="flex items-end gap-3">
                {/* Code mode toggle */}
                <CodeMode
                  isActive={isCodeMode}
                  onToggle={() => setIsCodeMode(!isCodeMode)}
                  onTemplateSelect={handleCodeTemplate}
                />

                {/* Input field */}
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      isCodeMode 
                        ? "Describe the code you want to create..."
                        : uploadedFiles.length > 0 
                          ? "Ask about the uploaded files..."
                          : "Type your message..."
                    }
                    disabled={isLoading}
                    className={cn(
                      "min-h-[60px] max-h-[200px] resize-none pr-12",
                      isCodeMode && "border-blue-200 dark:border-blue-800"
                    )}
                    rows={1}
                  />
                  
                  {/* Character count */}
                  <div className="absolute bottom-2 right-12 text-xs text-muted-foreground">
                    {input.length}/2000
                  </div>
                </div>

                {/* Send button */}
                <Button
                  onClick={sendMessage}
                  disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                  size="icon"
                  className="h-[60px] w-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Usage indicator */}
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  {isAuthenticated ? (
                    <>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {usage.messageCount} messages today
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {usage.remainingQuota} remaining
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Guest mode: {usage.remainingQuota} messages remaining today
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {error && (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Error
                    </span>
                  )}
                  {isLoading && (
                    <span className="text-blue-500 flex items-center gap-1">
                      <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Thinking...
                    </span>
                  )}
                  {!isLoading && !error && messages.length > 0 && (
                    <span className="text-green-500 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send, 
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Shift+Enter</kbd> for new line
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}