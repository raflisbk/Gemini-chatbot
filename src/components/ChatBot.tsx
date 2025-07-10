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
  File
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
import { FixedChatSidebar } from './ChatSidebar';
import { MultimodalUpload } from './MultimodalUpload';
import { MessageWithContinue } from './ContinueButton';
import { TrendingCards } from './TrendingCards';
import { EnhancedNavbar } from './EnhancedNavbar';

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
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, []);

  // Process files for upload
  const processFileAttachments = useCallback(async (files: File[]): Promise<FileAttachment[]> => {
    const attachments: FileAttachment[] = [];

    for (const file of files) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        attachments.push({
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          mimeType: file.type,
          base64,
          url: URL.createObjectURL(file)
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    return attachments;
  }, []);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (isLoading) return;

    try {
      await sendMessage(input, {
        files: selectedFiles,
        sessionId: authCurrentSessionId || undefined
      });

      // Clear input and files
      setInput('');
      setSelectedFiles([]);
      setShowUpload(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [input, selectedFiles, isLoading, sendMessage, authCurrentSessionId]);

  // Handle file selection
  const handleFilesChange = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleFileRemove = useCallback((fileId: string) => {
    // For MultimodalUpload compatibility
    console.log('Removing file:', fileId);
  }, []);

  // Handle trending topic selection
  const handleTrendingTopicSelect = useCallback((prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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
      {/* Fixed Chat Sidebar */}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Navbar */}
        <EnhancedNavbar
          user={user}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          notifications={0}
          onMenuToggle={() => setShowSidebar(!showSidebar)}
          onHomeClick={createNewSession}
          onSettingsClick={() => setShowSettings(true)}
          onLoginClick={() => {/* Login logic */}}
          onLogoutClick={logout}
          onUploadClick={() => setShowUpload(true)}
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

        {/* File Upload Area */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border bg-card/30 backdrop-blur-sm"
            >
              <div className="max-w-4xl mx-auto p-4">
                <MultimodalUpload
                  onFilesChange={handleFilesChange}
                  onFileRemove={handleFileRemove}
                  maxFiles={5}
                  maxFileSize={50}
                  showPreview={true}
                  disabled={isLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto p-4">
            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-1">
                      {file.type.startsWith('image/') && <Image className="h-4 w-4" />}
                      {file.type.startsWith('audio/') && <Music className="h-4 w-4" />}
                      {file.type.startsWith('video/') && <Video className="h-4 w-4" />}
                      {!file.type.startsWith('image/') && !file.type.startsWith('audio/') && !file.type.startsWith('video/') && <File className="h-4 w-4" />}
                    </div>
                    <span className="truncate max-w-32">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => {
                        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="flex items-end gap-2">
              {/* File Upload Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUpload(!showUpload)}
                className="shrink-0"
                title="Upload files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Voice Input */}
              {support.speechRecognition && (
                <VoiceInput
                  onTranscriptChange={handleVoiceTranscript}
                  onFinalTranscript={handleFinalTranscript}
                  isEnabled={isVoiceEnabled}
                  language="id-ID"
                />
              )}

              {/* Text Input */}
              <div className="flex-1">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    isListening 
                      ? "Listening... or type your message"
                      : support.speechRecognition && isVoiceEnabled
                        ? "Type your message or use voice input..."
                        : "Type your message..."
                  }
                  className="min-h-[60px] max-h-[120px] resize-none"
                  disabled={isLoading}
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
                size="icon"
                className="shrink-0 h-[60px] w-12"
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
              <div className="flex items-center gap-4">
                <span>Press Enter to send, Shift+Enter for new line</span>
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
    </div>
  );
}

export default ChatBot;