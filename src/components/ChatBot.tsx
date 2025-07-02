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
  FileText,
  Home,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2
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
import { ThemeToggle } from './ThemeToggle';
import { SettingsDialog } from './SettingsDialog';

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

// Voice Recognition Interface
interface VoiceRecognition {
  isListening: boolean;
  isSupported: boolean;
  recognition: SpeechRecognition | null;
}

// Typing Indicator Component
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-2 px-4 py-2 text-muted-foreground"
  >
    <Bot className="h-4 w-4" />
    <span className="text-sm">AI sedang mengetik</span>
    <div className="flex gap-1">
      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </motion.div>
);

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
    modelSettings,
    logout
  } = useAuth();

  // Core chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Enhanced features state
  const [isTyping, setIsTyping] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition>({
    isListening: false,
    isSupported: false,
    recognition: null
  });
  const [speechEnabled, setSpeechEnabled] = useState(false);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Session management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Error and retry state
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Trending topics
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Code mode
  const [isCodeMode, setIsCodeMode] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Voice Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID'; // Indonesian language

      recognition.onstart = () => {
        setVoiceRecognition(prev => ({ ...prev, isListening: true }));
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setVoiceRecognition(prev => ({ ...prev, isListening: false }));
      };

      recognition.onend = () => {
        setVoiceRecognition(prev => ({ ...prev, isListening: false }));
      };

      setVoiceRecognition({
        isListening: false,
        isSupported: true,
        recognition
      });
    }
  }, []);

  // Initialize Text-to-Speech
  const speakText = useCallback((text: string) => {
    if (!speechEnabled || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
  }, [speechEnabled]);

  // Voice input toggle
  const toggleVoiceInput = useCallback(() => {
    if (!voiceRecognition.isSupported || !voiceRecognition.recognition) return;

    if (voiceRecognition.isListening) {
      voiceRecognition.recognition.stop();
    } else {
      voiceRecognition.recognition.start();
    }
  }, [voiceRecognition]);

  // Load chat sessions
  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await ChatStorage.getSessions(user?.id);
      setChatSessions(sessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }, [user?.id]);

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

  // Go to home
  const goToHome = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setUploadedFiles([]);
    setShowWelcome(true);
    setError(null);
    setRetryCount(0);
    setShowSidebar(false);
  }, []);

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

  // Enhanced send message with typing indicator
  const sendMessage = useCallback(async (messageContent?: string, files?: File[]) => {
    const content = messageContent || input.trim();
    
    if (!content && (!files || files.length === 0)) return;

    setInput('');
    setError(null);
    setIsLoading(true);
    setIsTyping(true); // Show typing indicator

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      content,
      role: 'user',
      timestamp: new Date(),
      attachments: files ? files.map(file => ({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file)
      })) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setShowWelcome(false);

    try {
      // Prepare request payload
      const payload: any = {
        message: content,
        sessionId: currentSessionId || undefined
      };

      // Handle file attachments
      if (files && files.length > 0) {
        payload.attachments = await Promise.all(
          files.map(async (file) => ({
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file) // Temporary URL for client-side
          }))
        );
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Create AI response message
        const aiMessage: Message = {
          id: data.messageId || generateId(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Update session ID if new
        if (data.sessionId && !currentSessionId) {
          setCurrentSessionId(data.sessionId);
        }

        // Update usage if provided
        if (data.usage) {
          updateUsage?.(data.usage);
        }

        // Speak response if enabled
        if (speechEnabled && data.response) {
          speakText(data.response);
        }

        // Save session
        if (user?.id) {
          const sessionData = {
            id: data.sessionId || currentSessionId || generateId(),
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            messages: [...messages, userMessage, aiMessage],
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          ChatStorage.saveSession(sessionData, user.id);
          loadChatSessions();
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setIsTyping(false); // Hide typing indicator
    }
  }, [input, currentSessionId, user, messages, updateUsage, loadChatSessions, speechEnabled, speakText]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setShowUpload(false);
    await sendMessage('', files);
  }, [sendMessage]);

  // Handle trending topic click
  const handleTrendingClick = useCallback(async (topic: TrendingTopic) => {
    await sendMessage(topic.prompt);
  }, [sendMessage]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await ChatStorage.deleteSession(sessionId, user?.id);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        goToHome();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [currentSessionId, user?.id, goToHome]);

  // Filter sessions
  const filteredSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + N: New chat
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        startNewChat();
      }
      
      // Ctrl/Cmd + /: Toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        setShowSidebar(prev => !prev);
      }

      // Ctrl/Cmd + K: Focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Focus search if sidebar is open
        if (showSidebar) {
          const searchInput = document.querySelector('[placeholder="Search conversations..."]') as HTMLInputElement;
          searchInput?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startNewChat, showSidebar]);

  if (isInitializing || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Enhanced Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-80 bg-card border-r border-border z-50 lg:relative lg:z-0 sidebar-glass"
            >
              <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <Logo />
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSidebar(false)}
                        className="lg:hidden"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* New Chat Button */}
                  <Button
                    onClick={startNewChat}
                    className="w-full gap-2 enhanced-button"
                  >
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Chat Sessions */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    {filteredSessions.length > 0 ? (
                      filteredSessions.map((session) => (
                        <div
                          key={session.id}
                          className="group relative p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all sidebar-item"
                          onClick={() => loadSession(session.id)}
                        >
                          <div className="flex items-center gap-3">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {session.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.updatedAt.toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 delete-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {searchQuery ? 'No conversations found' : 'No conversations yet'}
                      </p>
                    )}
                  </div>
                </ScrollArea>

                {/* User Section */}
                {user && (
                  <div className="p-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="user-avatar h-8 w-8 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSettings(true)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={logout}
                          className="text-xs"
                        >
                          Logout
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="hidden lg:flex"
              >
                <Menu className="h-4 w-4" />
              </Button>

              {/* Home button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToHome}
                className="hover-lift"
                title="Go to Home"
              >
                <Home className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Logo size="sm" />
                <h1 className="text-xl font-semibold">AI Chatbot Indonesia</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice controls */}
              {voiceRecognition.isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoiceInput}
                  className={cn(
                    "hover-lift",
                    voiceRecognition.isListening && "text-red-500 animate-pulse"
                  )}
                  title={voiceRecognition.isListening ? "Stop listening" : "Start voice input"}
                >
                  {voiceRecognition.isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Speech toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={cn(
                  "hover-lift",
                  speechEnabled && "text-green-500"
                )}
                title={speechEnabled ? "Disable speech" : "Enable speech"}
              >
                {speechEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              {/* Upload button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUpload(true)}
                className="hover-lift"
                title="Upload files"
              >
                <Upload className="h-4 w-4" />
              </Button>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Settings button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="hover-lift"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {showWelcome && messages.length === 0 ? (
              <div className="max-w-4xl mx-auto">
                {/* Welcome Section */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 mb-4 floating-element">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 gradient-text">
                    Welcome to AI Chatbot Indonesia
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Your intelligent assistant for conversations, file analysis, and more
                  </p>
                </div>

                {/* Trending Topics */}
                {trendingTopics.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">🔥 Trending Topics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trendingTopics.map((topic, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleTrendingClick(topic)}
                          className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all trending-card"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{topic.category}</Badge>
                            <span className="text-xs text-muted-foreground">{topic.source}</span>
                          </div>
                          <h4 className="font-medium text-sm">{topic.title}</h4>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 hover-lift"
                    onClick={() => sendMessage("Explain quantum computing in simple terms")}
                  >
                    <Bot className="h-6 w-6" />
                    <span className="text-sm">Ask AI</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 hover-lift"
                    onClick={() => setShowUpload(true)}
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">Upload File</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 hover-lift"
                    onClick={() => setIsCodeMode(true)}
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Code Mode</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 hover-lift"
                    onClick={() => sendMessage("What's the weather like today?")}
                  >
                    <Clock className="h-6 w-6" />
                    <span className="text-sm">Quick Info</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="chat-message-enter"
                  >
                    <ChatMessage
                      message={message}
                      index={index}
                      isLastMessage={message.id === messages[messages.length - 1]?.id}
                    />
                  </motion.div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && <TypingIndicator />}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <div className="p-4 border-t border-border">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setError(null)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => sendMessage(input)}
                      disabled={retryCount >= 3}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry ({retryCount}/3)
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Enhanced Input Area */}
          <div className="border-t border-border p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* File Upload Area */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">Attached Files:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 bg-background p-2 rounded border"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4"
                            onClick={() => setUploadedFiles(prev => 
                              prev.filter(f => f.id !== file.id)
                            )}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Mode Indicator */}
                {isCodeMode && (
                  <div className="mb-2">
                    <CodeMode
                      isActive={isCodeMode}
                      onToggle={() => setIsCodeMode(!isCodeMode)}
                      onTemplateSelect={(template) => setInput(template + " ")}
                    />
                  </div>
                )}

                {/* Voice Recognition Indicator */}
                {voiceRecognition.isListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <Mic className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">Listening... Speak now</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleVoiceInput}
                        className="ml-auto"
                      >
                        Stop
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Main Input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        voiceRecognition.isListening 
                          ? "Listening..." 
                          : isCodeMode 
                            ? "Describe the code you want to create..."
                            : "Type your message here..."
                      }
                      className="min-h-[60px] max-h-[200px] resize-none pr-12 chat-input"
                      disabled={isLoading || voiceRecognition.isListening}
                    />
                    
                    {/* Voice Input Button in Textarea */}
                    {voiceRecognition.isSupported && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 bottom-2 h-8 w-8"
                        onClick={toggleVoiceInput}
                        disabled={isLoading}
                      >
                        {voiceRecognition.isListening ? (
                          <MicOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Upload Button */}
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setShowUpload(true)}
                      disabled={isLoading}
                      className="hover-lift"
                      title="Upload files"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>

                    {/* Send Button */}
                    <Button
                      onClick={() => sendMessage()}
                      disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                      className="px-6 enhanced-button btn-send"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Input Help Text */}
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    {usage && (
                      <span>
                        Messages: {usage.messageCount}/{usage.messageCount + (usage.remainingQuota || 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {voiceRecognition.isSupported && (
                      <Badge variant="outline" className="text-xs">
                        Voice supported
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      AI powered
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileUpload(files);
          }
        }}
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.json"
        className="hidden"
      />

      {/* Modals and Dialogs */}
      
      {/* File Upload Dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUpload(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <FileUpload
              onUpload={handleFileUpload}
              onCancel={() => setShowUpload(false)}
              maxFiles={1}
              maxSize={10 * 1024 * 1024} // 50MB
              className="mb-4" onFilesSelected={function (files: File[]): void {
                throw new Error('Function not implemented.');
              } } selectedFiles={[]} onRemoveFile={function (index: number): void {
                throw new Error('Function not implemented.');
              } }            />
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Files
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Dialog */}
      {showSettings && (
        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <Button
          onClick={() => setShowSidebar(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg floating-element"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 hidden lg:block">
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Ctrl+N: New chat</div>
            <div>Ctrl+/: Toggle sidebar</div>
            <div>Ctrl+K: Search</div>
          </div>
        </div>
      </div>
    </div>
  );
}