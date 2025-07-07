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
  Loader2,
  Moon,
  Sun,
  History,
  LogIn,
  Shield,
  Crown
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
import { LoadingDots } from './LoadingDots';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { SettingsDialog } from './SettingsDialog';
import { LoginDialog } from './LoginDialog';

// Context and Utilities
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { generateId, debounce, cn } from '@/lib/utils';
import TrendingAPI from '@/lib/trendingAPI';

// Types
interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  base64?: string;
}

interface TrendingTopic {
  title: string;
  category: string;
  source: string;
  prompt: string;
}

interface VoiceRecognition {
  isListening: boolean;
  isSupported: boolean;
  recognition: SpeechRecognition | null;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: UploadedFile[];
  metadata?: any;
}

interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string;
  context_summary?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updatedAt: string;
  messages?: Message[];
}

// QUOTA LIMITS
const QUOTA_LIMITS = {
  guest: 5,
  user: 25,
  admin: Infinity
};

// Simple ChatHistory component
const ChatHistory = React.memo(({ 
  sessions, 
  currentSessionId, 
  searchQuery, 
  onSessionSelect, 
  onSessionDelete, 
  onNewSession 
}: {
  sessions: ChatSession[];
  currentSessionId: string | null;
  searchQuery: string;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onNewSession: () => void;
}) => {
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNewSession}
                  className="mt-2"
                >
                  Start your first chat
                </Button>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg border transition-all duration-200 cursor-pointer ${
                  currentSessionId === session.id
                    ? 'bg-primary/10 border-primary/20 shadow-sm'
                    : 'hover:bg-muted/50 border-transparent hover:border-border'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    currentSessionId === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {session.title}
                    </h4>
                    {session.context_summary && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {session.context_summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{session.message_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionDelete(session.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {currentSessionId === session.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"></div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

ChatHistory.displayName = 'ChatHistory';

export default function ChatBot() {
  // Core State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // UI State
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Enhanced State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [quotaUsed, setQuotaUsed] = useState(0);

  // Voice State
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition>({
    isListening: false,
    isSupported: false,
    recognition: null
  });
  const [speechEnabled, setSpeechEnabled] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hooks
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Get user role and quota
  const userRole = user?.role || 'guest';
  const quotaLimit = QUOTA_LIMITS[userRole as keyof typeof QUOTA_LIMITS];
  const isQuotaExceeded = quotaUsed >= quotaLimit;

  // Load chat sessions on mount
  useEffect(() => {
    if (user?.id) {
      loadChatSessions();
      loadQuotaUsage();
    }
  }, [user?.id]);

  // Load trending topics
  useEffect(() => {
    loadTrendingTopics();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize voice recognition
  useEffect(() => {
    initializeVoiceRecognition();
  }, []);

  // ========================================
  // CORE FUNCTIONS
  // ========================================

  const loadChatSessions = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Load from your database
      const sessions: ChatSession[] = [];
      setChatSessions(sessions);
      
      // Load last active session if no current session
      if (!currentSessionId && sessions.length > 0) {
        const lastSession = sessions.find(s => s.is_active) || sessions[0];
        await loadSession(lastSession.id);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }, [user?.id, currentSessionId]);

  const loadQuotaUsage = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Load quota usage from your database
      // For guest users, use localStorage
      if (userRole === 'guest') {
        const guestUsage = localStorage.getItem('guest-quota-usage');
        setQuotaUsed(guestUsage ? parseInt(guestUsage) : 0);
      } else {
        // Load from database for authenticated users
        setQuotaUsed(0); // Replace with actual database call
      }
    } catch (error) {
      console.error('Error loading quota usage:', error);
    }
  }, [user?.id, userRole]);

  const updateQuotaUsage = useCallback(() => {
    const newUsage = quotaUsed + 1;
    setQuotaUsed(newUsage);
    
    if (userRole === 'guest') {
      localStorage.setItem('guest-quota-usage', newUsage.toString());
    }
    // For authenticated users, update database
  }, [quotaUsed, userRole]);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setCurrentSessionId(sessionId);
      const sessionMessages: Message[] = [];
      setMessages(sessionMessages);
      setShowWelcome(sessionMessages.length === 0);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, []);

  const createNewSession = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const title = `Chat ${new Date().toLocaleString()}`;
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setCurrentSessionId(newSessionId);
      setMessages([]);
      setShowWelcome(true);
      await loadChatSessions();
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  }, [user?.id, loadChatSessions]);

  const loadTrendingTopics = useCallback(async () => {
    try {
      const topics = await TrendingAPI.getTrendingTopics();
      setTrendingTopics(topics.slice(0, 4));
    } catch (error) {
      console.error('Error loading trending topics:', error);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ========================================
  // ENHANCED FILE UPLOAD HANDLING
  // ========================================

  const handleFileSelect = useCallback((files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFilesToBase64 = async (files: File[]): Promise<UploadedFile[]> => {
    const processedFiles: UploadedFile[] = [];
    
    for (const file of files) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        processedFiles.push({
          id: generateId(),
          name: file.name,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          base64
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }
    
    return processedFiles;
  };

  // ========================================
  // ENHANCED MESSAGE SENDING WITH QUOTA CHECK
  // ========================================

  const sendMessage = async (messageContent?: string, files?: File[]) => {
    const content = messageContent || input.trim();
    const filesToProcess = files || selectedFiles;
    
    if (!content && filesToProcess.length === 0) return;

    // Check quota limit
    if (isQuotaExceeded) {
      setError(`You have reached your quota limit (${quotaLimit} messages). ${userRole === 'guest' ? 'Please login for more messages.' : 'Contact admin for quota increase.'}`);
      return;
    }

    setInput('');
    setSelectedFiles([]);
    setError(null);
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Process files to base64 if any
      const processedFiles = filesToProcess.length > 0 
        ? await processFilesToBase64(filesToProcess) 
        : [];

      // Create user message
      const userMessage: Message = {
        id: generateId(),
        content,
        role: 'user',
        timestamp: new Date(),
        attachments: processedFiles
      };

      setMessages(prev => [...prev, userMessage]);
      setShowWelcome(false);

      // Prepare API payload
      const payload = {
        message: content,
        sessionId: currentSessionId || undefined,
        attachments: processedFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          mimeType: file.type,
          size: file.size,
          base64: file.base64
        })),
        settings: {
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 4096
        }
      };

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Get auth token
      const authToken = localStorage.getItem('auth_token');

      // Make API request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Create AI response message
        const aiMessage: Message = {
          id: data.messageId || generateId(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            model: payload.settings.model,
            temperature: payload.settings.temperature,
            tokensUsed: data.usage?.tokensUsed
          }
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Update session ID if new
        if (data.sessionId && !currentSessionId) {
          setCurrentSessionId(data.sessionId);
        }

        // Update quota usage
        updateQuotaUsage();

        // Text-to-speech if enabled
        if (speechEnabled && data.response) {
          speakText(data.response);
        }

        // Reload sessions to update sidebar
        if (user?.id) {
          loadChatSessions();
        }

      } else {
        throw new Error(data.error || 'Failed to get response from AI');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Error sending message:', error);
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // ========================================
  // VOICE FUNCTIONALITY
  // ========================================

  const initializeVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
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
  };

  const startVoiceRecognition = () => {
    if (voiceRecognition.recognition) {
      voiceRecognition.recognition.start();
      setVoiceRecognition(prev => ({ ...prev, isListening: true }));
    }
  };

  const stopVoiceRecognition = () => {
    if (voiceRecognition.recognition) {
      voiceRecognition.recognition.stop();
      setVoiceRecognition(prev => ({ ...prev, isListening: false }));
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  // ========================================
  // EVENT HANDLERS
  // ========================================

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    loadSession(sessionId);
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleHomeClick = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowWelcome(true);
    setShowSidebar(false);
  };

  const handleSettingsClick = () => {
    // Only admin can access full settings
    if (userRole !== 'admin') {
      setError('Only administrators can access full settings.');
      return;
    }
    setShowSettings(true);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="flex h-screen bg-background">
      {/* Enhanced Sidebar with Chat History */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-80 bg-card/95 backdrop-blur-xl border-r lg:relative lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Chat History</span>
                </div>
                <div className="flex items-center gap-2">
                  {user && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={createNewSession}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(false)}
                    className="h-8 w-8 lg:hidden"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* User Info & Quota */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {userRole === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                    {userRole === 'user' && <User className="w-4 h-4 text-blue-500" />}
                    {userRole === 'guest' && <Bot className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm font-medium capitalize">{userRole}</span>
                  </div>
                  {user && (
                    <Badge variant="secondary" className="text-xs">
                      {user.email}
                    </Badge>
                  )}
                </div>
                
                {/* Quota Display */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Messages Used</span>
                    <span className={`font-medium ${isQuotaExceeded ? 'text-destructive' : 'text-foreground'}`}>
                      {quotaUsed} / {quotaLimit === Infinity ? '∞' : quotaLimit}
                    </span>
                  </div>
                  {quotaLimit !== Infinity && (
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          isQuotaExceeded ? 'bg-destructive' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min((quotaUsed / quotaLimit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Search */}
              {user && (
                <div className="p-4 border-b">
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
              )}

              {/* Chat Sessions List */}
              {user ? (
                <ChatHistory
                  sessions={chatSessions}
                  currentSessionId={currentSessionId}
                  searchQuery={searchQuery}
                  onSessionSelect={handleSessionSelect}
                  onSessionDelete={handleSessionDelete}
                  onNewSession={createNewSession}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-4">
                    <LogIn className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Login to save your conversations
                    </p>
                    <Button
                      onClick={() => setShowLogin(true)}
                      size="sm"
                      className="w-full"
                    >
                      Login
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Header - FIXED: Only show "AI ChatBot" */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle - ALWAYS VISIBLE */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Home Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHomeClick}
            >
              <Home className="h-5 w-5" />
            </Button>

            {/* Logo and Title - SIMPLIFIED */}
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <h1 className="font-semibold text-lg">AI ChatBot</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Voice Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSpeechEnabled(!speechEnabled)}
            >
              {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Settings - Admin Only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Login/User Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="flex items-center gap-2"
                >
                  {userRole === 'admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                  <span className="hidden md:inline">{user.email}</span>
                  <span className="md:hidden">{userRole}</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowLogin(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden md:inline">Login</span>
              </Button>
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-4 space-y-4">
              {/* Welcome Message */}
              {showWelcome && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Bot className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h2 className="text-2xl font-bold mb-2">Welcome to AI ChatBot</h2>
                  <p className="text-muted-foreground mb-2">
                    Start a conversation by typing a message or uploading a file
                  </p>
                  
                  {/* Quota Information */}
                  <div className="mb-6">
                    <Badge variant="secondary" className="text-xs">
                      {userRole === 'admin' ? 'Unlimited messages' : 
                       `${quotaUsed}/${quotaLimit} messages used`}
                    </Badge>
                  </div>

                  {/* Enhanced Trending Topics - FIXED CENTER */}
                  {trendingTopics.length > 0 && (
                    <div className="max-w-4xl mx-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
                        {trendingTopics.map((topic, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => !isQuotaExceeded && sendMessage(topic.prompt)}
                            className={`w-full max-w-md p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                              isQuotaExceeded 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-muted/50 hover:border-primary/30 hover:scale-105'
                            }`}
                          >
                            <div className="text-sm font-medium text-primary mb-2">
                              {topic.category}
                            </div>
                            <div className="text-sm text-left">{topic.title}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quota Warning */}
                  {isQuotaExceeded && (
                    <Alert className="mt-6 max-w-md mx-auto">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {userRole === 'guest' 
                          ? 'You have reached the guest limit. Login for more messages.' 
                          : 'You have reached your message limit. Contact admin for more quota.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence>
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    index={index}
                    showTimestamp={true}
                  />
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Bot className="w-4 h-4" />
                  <LoadingDots />
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Enhanced Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto p-4">
            {/* Error Display */}
            {error && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="h-4 w-4 p-0 hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Controls */}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  placeholder={isQuotaExceeded 
                    ? "Quota exceeded. Please login or contact admin." 
                    : "Type your message... (Shift+Enter for new line)"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading || isQuotaExceeded}
                  className="min-h-[60px] max-h-[120px] resize-none pr-20"
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  {/* Voice Input */}
                  {voiceRecognition.isSupported && !isQuotaExceeded && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={voiceRecognition.isListening ? stopVoiceRecognition : startVoiceRecognition}
                      disabled={isLoading}
                      className="h-8 w-8"
                    >
                      {voiceRecognition.isListening ? (
                        <MicOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Upload Files Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowUpload(true)}
                disabled={isLoading || isQuotaExceeded}
                className="h-[60px]"
              >
                <Upload className="h-4 w-4" />
              </Button>

              {/* Send Button */}
              <Button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || isQuotaExceeded}
                className="h-[60px] px-6 btn-primary"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Footer Info */}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <div className="flex items-center gap-4">
                <span>
                  {userRole === 'admin' ? 'Unlimited' : `${quotaUsed}/${quotaLimit} messages`}
                </span>
                {currentSessionId && (
                  <span>Session: {currentSessionId.slice(0, 8)}...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-lg border p-6 w-full max-w-md"
            >
              <FileUpload
                onFilesSelected={handleFileSelect}
                selectedFiles={selectedFiles}
                onRemoveFile={handleRemoveFile}
                onCancel={() => setShowUpload(false)}
                maxFiles={5}
                maxSize={10 * 1024 * 1024}
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

      {/* Settings Modal - Admin Only */}
      {showSettings && userRole === 'admin' && (
        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <LoginDialog
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
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
}