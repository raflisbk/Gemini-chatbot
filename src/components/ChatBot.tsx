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
import { generateId, debounce, cn } from '@/lib/utils';
import TrendingAPI from '@/lib/trendingAPI';

// FIXED IMPORTS - Use ChatBotWrapper for all ChatStorage operations (resolve casing error)
import ChatBotWrapper, { 
  type ChatBotSession as ChatSession, 
  type ChatBotMessage as Message 
} from '@/lib/chatBotWrapper'; // FIXED: Correct casing

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

// FIXED: FileUpload interface to match actual component props
interface FileUploadComponentProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  onUpload: (files: File[]) => void | Promise<void>;
  onCancel: () => void;
}

// FIXED: CodeMode interface to match actual component props
interface CodeModeComponentProps {
  isActive: boolean;
  onToggle: () => void;
  onTemplateSelect: (template: string) => void;
}

// FIXED: SettingsDialog interface to match actual component props
interface SettingsDialogComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

// Typing Indicator Component
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg max-w-xs"
  >
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
      <Bot className="h-4 w-4 text-primary" />
    </div>
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">AI is typing</span>
      <LoadingDots />
    </div>
  </motion.div>
);

// Main ChatBot Component
export const ChatBot: React.FC = () => {
  // Auth context
  const { 
    user, 
    isLoading: authLoading, 
    updateUsage,
    chatSettings,
    modelSettings 
  } = useAuth();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCodeMode, setShowCodeMode] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);

  // File handling - FIXED: Use proper state for file management
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Trending topics
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  // Voice features
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition>({
    isListening: false,
    isSupported: false,
    recognition: null
  });
  const [speechEnabled, setSpeechEnabled] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FIXED: Load chat sessions function
  const loadChatSessions = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const sessions = await ChatBotWrapper.getSessions(user.id);
      setChatSessions(sessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }, [user?.id]);

  // Load trending topics
  const loadTrendingTopics = useCallback(async () => {
    try {
      setIsLoadingTrending(true);
      const topics = await TrendingAPI.getTrendingTopics();
      setTrendingTopics(topics.slice(0, 6));
    } catch (error) {
      console.error('Error loading trending topics:', error);
      setTrendingTopics([]);
    } finally {
      setIsLoadingTrending(false);
    }
  }, []);

  // Initialize voice recognition
  const initializeVoiceRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + transcript);
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
    } else {
      setVoiceRecognition({
        isListening: false,
        isSupported: false,
        recognition: null
      });
    }
  }, []);

  // Text to speech
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window && speechEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      speechSynthesis.speak(utterance);
    }
  }, [speechEnabled]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial load
  useEffect(() => {
    if (!authLoading && user?.id) {
      loadChatSessions();
    }
    loadTrendingTopics();
    initializeVoiceRecognition();
  }, [authLoading, user?.id, loadChatSessions, loadTrendingTopics, initializeVoiceRecognition]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-focus input
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // FIXED: Start new chat function
  const startNewChat = useCallback(async () => {
    if (!user?.id) return;
    
    const title = "New Chat";
    const newSession = await ChatBotWrapper.createNewSession(user.id, title);
    
    if (newSession && newSession.id) {
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setUploadedFiles([]);
      setSelectedFiles([]);
      setShowWelcome(true);
      setError(null);
      setRetryCount(0);

      const sessionData: ChatSession = {
        id: newSession.id,
        user_id: user.id,
        title,
        message_count: 0,
        last_message_at: null,
        context_summary: null,
        settings: {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updatedAt: new Date(),
        messages: []
      };
      
      await ChatBotWrapper.saveSession(sessionData);
      loadChatSessions();
    }
  }, [user?.id, loadChatSessions]);

  // Go to home
  const goToHome = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setUploadedFiles([]);
    setSelectedFiles([]);
    setShowWelcome(true);
    setError(null);
    setRetryCount(0);
    setShowSidebar(false);
  }, []);

  // FIXED: Load existing session function
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const session = await ChatBotWrapper.getSessionById(sessionId, user?.id);
      
      if (session) {
        setCurrentSessionId(sessionId);
        setMessages(session.messages || []);
        setShowWelcome(false);
        setError(null);
        setRetryCount(0);
        
        if (window.innerWidth < 1024) {
          setShowSidebar(false);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Failed to load conversation');
    }
  }, [user?.id]);

  // FIXED: Enhanced send message function
  const sendMessage = useCallback(async (messageContent?: string, files?: File[]) => {
    const content = messageContent || input.trim();
    
    if (!content && (!files || files.length === 0)) return;

    setInput('');
    setError(null);
    setIsLoading(true);
    setIsTyping(true);

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
      const payload: any = {
        message: content,
        sessionId: currentSessionId || undefined
      };

      if (files && files.length > 0) {
        payload.attachments = await Promise.all(
          files.map(async (file) => ({
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file)
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
        const aiMessage: Message = {
          id: data.messageId || generateId(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        
        if (data.sessionId && !currentSessionId) {
          setCurrentSessionId(data.sessionId);
        }

        if (data.usage) {
          updateUsage?.(data.usage);
        }

        if (speechEnabled && data.response) {
          speakText(data.response);
        }

        if (user?.id) {
          const sessionData: ChatSession = {
            id: data.sessionId || currentSessionId || generateId(),
            user_id: user.id,
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            message_count: messages.length + 2,
            last_message_at: new Date().toISOString(),
            context_summary: data.response.slice(0, 100),
            settings: {},
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updatedAt: new Date(),
            messages: [...messages, userMessage, aiMessage]
          };
          
          await ChatBotWrapper.saveSession(sessionData);
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
      setIsTyping(false);
    }
  }, [input, currentSessionId, user, messages, updateUsage, loadChatSessions, speechEnabled, speakText]);

  // FIXED: File upload handlers
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setShowUpload(false);
    await sendMessage('', files);
  }, [sendMessage]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUploadCancel = useCallback(() => {
    setSelectedFiles([]);
    setShowUpload(false);
  }, []);

  // Handle trending topic click
  const handleTrendingClick = useCallback(async (topic: TrendingTopic) => {
    await sendMessage(topic.prompt);
  }, [sendMessage]);

  // FIXED: Delete session function
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await ChatBotWrapper.deleteSession(sessionId);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        goToHome();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [currentSessionId, goToHome]);

  // FIXED: CodeMode handlers
  const handleCodeModeToggle = useCallback(() => {
    setIsCodeMode(prev => !prev);
  }, []);

  const handleCodeTemplateSelect = useCallback((template: string) => {
    setInput(template);
    setIsCodeMode(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Filter sessions
  const filteredSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        startNewChat();
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        setShowSidebar(prev => !prev);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      if (event.key === 'Escape') {
        setShowUpload(false);
        setShowSettings(false);
        setShowSidebar(false);
        setShowCodeMode(false);
      }

      if (event.key === 'Enter' && !event.shiftKey && inputRef.current === document.activeElement) {
        event.preventDefault();
        sendMessage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [startNewChat, sendMessage]);

  // Voice recognition handlers
  const startVoiceRecognition = useCallback(() => {
    if (voiceRecognition.recognition && voiceRecognition.isSupported) {
      setVoiceRecognition(prev => ({ ...prev, isListening: true }));
      voiceRecognition.recognition.start();
    }
  }, [voiceRecognition.recognition, voiceRecognition.isSupported]);

  const stopVoiceRecognition = useCallback(() => {
    if (voiceRecognition.recognition) {
      voiceRecognition.recognition.stop();
      setVoiceRecognition(prev => ({ ...prev, isListening: false }));
    }
  }, [voiceRecognition.recognition]);

  // Render loading state
  if (authLoading) {
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 w-80 bg-card border-r border-border lg:relative lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Logo className="h-8 w-8" />
                  <span className="font-bold text-lg">AI Chat</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="lg:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* New Chat Button */}
              <div className="p-4">
                <Button
                  onClick={startNewChat}
                  className="w-full"
                  disabled={!user?.id}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>

              {/* Search */}
              <div className="px-4 pb-4">
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
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-2">
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          currentSessionId === session.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => loadSession(session.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {session.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {session.message_count} messages
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {session.updatedAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No conversations found' : 'No conversations yet'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Settings Footer */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToHome}
              className="hidden lg:flex"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>

            {currentSessionId && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {chatSessions.find(s => s.id === currentSessionId)?.title || 'Chat'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Toggle */}
            {voiceRecognition.isSupported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpeechEnabled(prev => !prev)}
              >
                {speechEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* CodeMode Toggle */}
            <CodeMode
              isActive={isCodeMode}
              onToggle={handleCodeModeToggle}
              onTemplateSelect={handleCodeTemplateSelect}
            />

            {/* Upload Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="h-4 w-4" />
            </Button>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {showWelcome ? (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Welcome Header */}
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Bot className="h-16 w-16 text-primary mx-auto mb-4" />
                  </motion.div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Welcome to AI Chat
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Your intelligent assistant ready to help with questions, tasks, and conversations. 
                    Start by typing a message or explore trending topics below.
                  </p>
                </div>

                {/* Trending Topics */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-center">Trending Topics</h2>
                  {isLoadingTrending ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trendingTopics.map((topic, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Button
                            variant="outline"
                            className="h-auto p-4 text-left justify-start hover:bg-primary/5 hover:border-primary/20"
                            onClick={() => handleTrendingClick(topic)}
                          >
                            <div className="space-y-1">
                              <p className="font-medium text-sm leading-tight">
                                {topic.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {topic.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {topic.source}
                                </span>
                              </div>
                            </div>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-center">Quick Actions</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">Upload File</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={handleCodeModeToggle}
                    >
                      <FileText className="h-6 w-6" />
                      <span className="text-sm">Code Mode</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={startNewChat}
                      disabled={!user?.id}
                    >
                      <Plus className="h-6 w-6" />
                      <span className="text-sm">New Chat</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={() => sendMessage("What's the latest news in Indonesia?")}
                    >
                      <Clock className="h-6 w-6" />
                      <span className="text-sm">Quick Info</span>
                    </Button>
                  </div>
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
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry ({retryCount}/3)
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    placeholder="Type your message here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px] max-h-[200px] resize-none pr-12"
                    disabled={isLoading}
                  />
                  
                  {/* Voice Recognition Button */}
                  {voiceRecognition.isSupported && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={voiceRecognition.isListening ? stopVoiceRecognition : startVoiceRecognition}
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

                {/* Upload Files Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowUpload(true)}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4" />
                </Button>

                {/* Send Button */}
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="min-w-[60px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Upload Status */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
                    >
                      <span>{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Footer */}
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  {user?.id && (
                    <span>
                      Session: {currentSessionId ? 'Active' : 'New'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <span>{messages.length} messages</span>
                  )}
                  {isTyping && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>AI is typing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs and Modals */}
      <AnimatePresence>
        {/* File Upload Modal - FIXED: Use correct props */}
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-lg border border-border p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upload Files</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* FIXED: FileUpload component with correct props */}
              <FileUpload
                onFilesSelected={handleFilesSelected}
                selectedFiles={selectedFiles}
                onRemoveFile={handleRemoveFile}
                onUpload={handleFileUpload}
                onCancel={handleUploadCancel}
                maxFiles={5}
                maxSize={10 * 1024 * 1024} // 10MB
                acceptedTypes={[
                  'image/*',
                  'application/pdf',
                  'text/*',
                  '.doc',
                  '.docx',
                  '.txt',
                  '.md'
                ]}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED: Settings Modal with correct props */}
      {showSettings && (
        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};