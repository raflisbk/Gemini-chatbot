'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Crown,
  Paperclip,
  Image,
  Music,
  Video,
  File,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

// Enhanced Components
import { ChatMessage } from './ChatMessage';
import { LoadingDots } from './LoadingDots';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { CompactSettingsDialog } from './SettingsDialog';
import { VoiceInput, SpeechButton } from './VoiceInput';
import FixedChatSidebar from './ChatSidebar'; // Updated import
import MultimodalUpload from './MultimodalUpload';
import { MessageWithContinue } from './ContinueButton';
import { TrendingCards } from './TrendingCards';
import { EnhancedNavbar } from './EnhancedNavbar';
import { LoginDialog } from './LoginDialog';
import EnhancedTextarea from './EnhancedTextarea'; // New import
import SmartFileUpload from './FileUpload'; // New import

// Context and Utilities
import { useAuth } from '@/context/AuthContext';
import { useVoiceInput, useTextToSpeech } from '@/hooks/useVoiceInput';
import { useChat } from '@/hooks/useChat';
import { generateId, debounce, cn } from '@/lib/utils';

// Types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: FileAttachment[];
  metadata?: any;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
  base64: string;
  url?: string;
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
  messages?: Message[];
}

interface BrowserSupport {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  microphone: boolean;
  browserName: string;
  isSupported: boolean;
}

interface FileItem {
  id: string;
  file: File;
  url?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Browser Support Hook
const useBrowserSupport = (): BrowserSupport => {
  const [support, setSupport] = useState<BrowserSupport>({
    speechRecognition: false,
    speechSynthesis: false,
    microphone: false,
    browserName: 'Unknown',
    isSupported: false
  });

  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Browser detection
        const userAgent = navigator.userAgent;
        let browserName = 'Unknown';
        
        if (userAgent.includes('Edg')) browserName = 'Edge';
        else if (userAgent.includes('Chrome')) browserName = 'Chrome';
        else if (userAgent.includes('Firefox')) browserName = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';

        // Check Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const speechRecognition = !!SpeechRecognition;

        // Check Speech Synthesis
        const speechSynthesis = 'speechSynthesis' in window;

        // Check Microphone Access
        let microphone = false;
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphone = true;
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (error) {
          microphone = false;
        }

        const isSupported = speechRecognition && speechSynthesis;

        setSupport({
          speechRecognition,
          speechSynthesis,
          microphone,
          browserName,
          isSupported
        });
      } catch (error) {
        console.error('Browser support check failed:', error);
      }
    };

    checkSupport();
  }, []);

  return support;
};

export function ChatBot() {
  const { 
    user, 
    isAuthenticated, 
    isAdmin, 
    logout,
    modelSettings,
    chatSettings,
    voiceSettings
  } = useAuth();

  // Local state untuk sessions management
  const [authSessions, setAuthSessions] = useState<ChatSession[]>([]);
  const [authCurrentSessionId, setAuthCurrentSessionId] = useState<string | null>(null);

  // Chat Hook
  const {
    messages,
    isLoading,
    error: chatError,
    sendMessage,
    continueMessage,
    retryLastMessage,
    canContinue,
    clearMessages
  } = useChat();

  // Browser Support
  const support = useBrowserSupport();

  // Voice Input
  const {
    isSupported: voiceSupported,
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    confidence,
    error: voiceError,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    resetError
  } = useVoiceInput({
    language: 'id-ID',
    continuous: false,
    interimResults: true
  });

  // Text to Speech
  const {
    isSpeaking,
    speak,
    stop: stopSpeaking
  } = useTextToSpeech();

  // State management
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [fileItems, setFileItems] = useState<FileItem[]>([]); // FIXED: Use FileItem type
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setInput(transcript);
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // Handle interim transcript display
  useEffect(() => {
    if (interimTranscript && isListening) {
      setInput(prev => prev + interimTranscript);
    }
  }, [interimTranscript, isListening]);

  // Auto-speak AI responses
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !isSpeaking) {
        speak(lastMessage.content);
      }
    }
  }, [messages, autoSpeak, isSpeaking, speak]);

  // Load sessions untuk user yang authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Simulasi load sessions - replace dengan actual API call
      const loadSessions = async () => {
        try {
          // Temporary mock data - replace dengan actual API
          const mockSessions: ChatSession[] = [
            {
              id: 'session-1',
              user_id: user.id,
              title: 'Welcome Conversation',
              message_count: 5,
              last_message_at: new Date().toISOString(),
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              context_summary: 'Initial conversation about AI features'
            }
          ];
          setAuthSessions(mockSessions);
        } catch (error) {
          console.error('Failed to load sessions:', error);
        }
      };
      
      loadSessions();
    } else {
      setAuthSessions([]);
      setAuthCurrentSessionId(null);
    }
  }, [isAuthenticated, user?.id]);

  // FIXED: File handling functions
  const getFileType = (file: File): FileItem['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileAdd = useCallback((newFiles: File[]) => {
    const newFileItems: FileItem[] = newFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      type: getFileType(file),
      progress: 0,
      status: 'pending' as const
    }));

    setFileItems(prev => [...prev, ...newFileItems]);

    // Simulate upload progress
    newFileItems.forEach(fileItem => {
      simulateUpload(fileItem.id);
    });
  }, []);

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        setFileItems(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress: 100, status: 'completed' }
              : f
          )
        );
        clearInterval(interval);
      } else {
        setFileItems(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress, status: 'uploading' }
              : f
          )
        );
      }
    }, 100);
  };

  const handleFileRemove = useCallback((fileId: string) => {
    setFileItems(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // Send message
  const handleSendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() && fileItems.length === 0) return;
    if (isLoading) return;

    try {
      const files = fileItems
        .filter(item => item.status === 'completed')
        .map(item => item.file);

      await sendMessage(messageToSend.trim(), {
        files,
        sessionId: authCurrentSessionId || undefined
      });

      // Clear input and files
      if (!message) setInput(''); // Only clear if not called programmatically
      setFileItems([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [input, fileItems, isLoading, sendMessage, authCurrentSessionId]);

  // Handle trending topic selection
  const handleTrendingTopicSelect = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  // Session management
  const createNewSession = useCallback(() => {
    clearMessages();
    setAuthCurrentSessionId(null);
    setShowSidebar(false);
  }, [clearMessages]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    // Set current session
    setAuthCurrentSessionId(sessionId);
    
    // Load session messages - replace dengan actual API call
    const selectedSession = authSessions.find((s: ChatSession) => s.id === sessionId);
    if (selectedSession && selectedSession.messages) {
      // Load messages from session
      console.log('Loading session:', selectedSession);
    }
    
    setShowSidebar(false);
  }, [authSessions]);

  const handleSessionDelete = useCallback((sessionId: string) => {
    // Remove session from state
    setAuthSessions((prev: ChatSession[]) => prev.filter((s: ChatSession) => s.id !== sessionId));
    
    // If current session deleted, create new one
    if (authCurrentSessionId === sessionId) {
      createNewSession();
    }
    
    // API call to delete session
    console.log('Deleting session:', sessionId);
  }, [authCurrentSessionId, createNewSession]);

  // Voice handlers
  const handleVoiceToggle = useCallback(() => {
    if (!support.speechRecognition) {
      alert(`Voice input tidak didukung di ${support.browserName}. Gunakan Chrome atau Edge.`);
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    }

    if (isListening) {
      stopListening();
    } else {
      setIsVoiceEnabled(true);
      startListening();
    }
  }, [support, isSpeaking, isListening, stopSpeaking, stopListening, startListening]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInput(prev => prev + transcript + ' ');
  }, []);

  const handleFinalTranscript = useCallback((transcript: string) => {
    if (transcript.trim()) {
      setInput(transcript);
    }
  }, []);

  // Handle login button click
  const handleLoginClick = useCallback(() => {
    setShowLogin(true);
  }, []);

  // Memoized values
  const showWelcome = useMemo(() => messages.length === 0, [messages.length]);

  const filteredSessions = useMemo(() => {
    if (!authSessions || authSessions.length === 0) return [];
    return authSessions.filter((session: ChatSession) => 
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [authSessions, searchQuery]);

  return (
    <div className="h-screen flex bg-background">
      {/* FIXED: Responsive Sidebar */}
      <FixedChatSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        sessions={filteredSessions}
        currentSessionId={authCurrentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        onNewSession={createNewSession}
        isLoading={false}
      />

      {/* FIXED: Main Chat Area with Responsive Margin */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        showSidebar && "md:ml-80" // Push content on desktop when sidebar is open
      )}>
        {/* Enhanced Navbar */}
        <EnhancedNavbar
          user={user}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          notifications={0}
          onMenuToggle={() => setShowSidebar(!showSidebar)}
          onHomeClick={createNewSession}
          onSettingsClick={() => setShowSettings(true)}
          onLoginClick={handleLoginClick} // FIXED: Use proper handler
          onLogoutClick={logout}
          onUploadClick={() => {}} // Handled by file upload component
          onVoiceToggle={handleVoiceToggle}
          onSpeechToggle={() => setAutoSpeak(!autoSpeak)}
          isVoiceActive={isListening}
          isSpeechEnabled={autoSpeak}
        />

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
                  <h2 className="text-2xl font-bold mb-2">Welcome to AI Assistant</h2>
                  <p className="text-muted-foreground mb-6">
                    Start a conversation by typing a message, uploading a file, or using voice input
                  </p>

                  {/* Browser Support Info */}
                  <div className="mb-6 flex justify-center gap-2">
                    <Badge variant={support.speechRecognition ? "default" : "secondary"}>
                      <Mic className="h-3 w-3 mr-1" />
                      Voice: {support.speechRecognition ? 'Supported' : 'Not Available'}
                    </Badge>
                    <Badge variant="outline">
                      Browser: {support.browserName}
                    </Badge>
                  </div>

                  {/* Trending Topics */}
                  <TrendingCards 
                    onTopicSelect={handleTrendingTopicSelect}
                    maxCards={6}
                    className="max-w-4xl mx-auto"
                  />
                </motion.div>
              )}

              {/* Error Display */}
              {chatError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{chatError}</AlertDescription>
                </Alert>
              )}

              {/* Voice Error Display */}
              {voiceError && (
                <Alert variant="destructive">
                  <Mic className="h-4 w-4" />
                  <AlertDescription>{voiceError}</AlertDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetError}
                    className="mt-2"
                  >
                    Dismiss
                  </Button>
                </Alert>
              )}

              {/* Messages with Continue Button */}
              <AnimatePresence>
                {messages.map((message, index) => (
                  <MessageWithContinue
                    key={message.id}
                    message={message}
                    isLastMessage={index === messages.length - 1}
                    onContinue={continueMessage}
                    onRetry={retryLastMessage}
                    isLoading={isLoading}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <ChatMessage
                        message={message}
                        index={index}
                        showTimestamp={chatSettings.showTimestamps}
                        compactMode={chatSettings.compactMode}
                        isLastMessage={index === messages.length - 1}
                      />
                      
                      {/* Speech Button for AI responses */}
                      {message.role === 'assistant' && support.speechSynthesis && (
                        <div className="flex justify-end mt-2">
                          <SpeechButton
                            text={message.content}
                            className="h-6 w-6"
                          />
                        </div>
                      )}
                    </motion.div>
                  </MessageWithContinue>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-xs">
                    <LoadingDots variant="thinking" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* FIXED: Input Area with Smart Components */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto p-4 space-y-3">
            {/* FIXED: Smart File Upload */}
            <SmartFileUpload
              files={fileItems}
              onFilesChange={setFileItems}
              onFileAdd={handleFileAdd}
              onFileRemove={handleFileRemove}
              maxFiles={5}
              maxFileSize={50 * 1024 * 1024} // 50MB
              autoCollapse={true}
              showUploadArea={true}
            />

            {/* FIXED: Enhanced Input Form */}
            <div className="flex items-end gap-2">
              {/* Voice Input */}
              {support.speechRecognition && (
                <VoiceInput
                  onTranscriptChange={handleVoiceTranscript}
                  onFinalTranscript={handleFinalTranscript}
                  isEnabled={isVoiceEnabled}
                  language="id-ID"
                />
              )}

              {/* FIXED: Enhanced Textarea */}
              <div className="flex-1">
                <EnhancedTextarea
                  value={input}
                  onChange={setInput}
                  onSend={handleSendMessage}
                  placeholder={
                    isListening 
                      ? "Listening... or type your message"
                      : support.speechRecognition && isVoiceEnabled
                        ? "Type your message or use voice input..."
                        : "Type your message..."
                  }
                  disabled={isLoading}
                  showSendButton={true}
                  isLoading={isLoading}
                  maxLength={4000}
                  showCharacterCount={true}
                  autoResize={true}
                  minHeight={60}
                  maxHeight={120}
                />
              </div>
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Enhanced input with smart file handling</span>
                {support.speechRecognition && (
                  <span>Voice input available</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {confidence > 0 && isListening && (
                  <Badge variant="outline" className="text-xs">
                    Accuracy: {Math.round(confidence * 100)}%
                  </Badge>
                )}
                {authCurrentSessionId && (
                  <span>Session: {authCurrentSessionId.slice(0, 8)}...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <CompactSettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* FIXED: Login Dialog */}
      <LoginDialog
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />
    </div>
  );
}

export default ChatBot;