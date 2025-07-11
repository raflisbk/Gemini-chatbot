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
import Logo from './Logo'; // FIXED: Default import
import { ThemeToggle } from './ThemeToggle';
import { CompactSettingsDialog } from './SettingsDialog';
import { VoiceInput, SpeechButton } from './VoiceInput';
import FixedChatSidebar from './ChatSidebar';
import MultimodalUpload from './MultimodalUpload';
import { MessageWithContinue } from './ContinueButton';
import { TrendingCards } from './TrendingCards';
import { EnhancedNavbar } from './EnhancedNavbar';
import { LoginDialog } from './LoginDialog';
import EnhancedTextarea from './EnhancedTextarea';
import SmartFileUpload from './FileUpload';

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

const getBrowserSupport = (): BrowserSupport => {
  const isClient = typeof window !== 'undefined';
  if (!isClient) return {
    speechRecognition: false,
    speechSynthesis: false,
    microphone: false,
    browserName: 'Server',
    isSupported: false
  };

  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  
  if (userAgent.indexOf('Chrome') > -1) browserName = 'Chrome';
  else if (userAgent.indexOf('Firefox') > -1) browserName = 'Firefox';
  else if (userAgent.indexOf('Safari') > -1) browserName = 'Safari';
  else if (userAgent.indexOf('Edge') > -1) browserName = 'Edge';

  return {
    speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    speechSynthesis: 'speechSynthesis' in window,
    microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    browserName,
    isSupported: true
  };
};

export const ChatBot: React.FC = () => {
  // State hooks
  const [input, setInput] = useState('');
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // FIXED: Mock sessions state (replace with real data)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context hooks - FIXED: Only use available properties
  const {
    user,
    isGuest,
    chatSettings,
    modelSettings,
    appearanceSettings,
    voiceSettings,
    privacySettings
  } = useAuth();

  // Chat hook
  const {
    messages,
    isLoading,
    error: chatError,
    sendMessage,
    clearMessages,
    continueMessage,
    retryLastMessage
  } = useChat();

  // Voice hooks
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: voiceError,
    resetError
  } = useVoiceInput({
    language: 'id-ID',
    continuous: true,
    interimResults: true
  });

  // Browser support detection
  const support = useMemo(() => getBrowserSupport(), []);
  
  // Show states
  const showWelcome = messages.length === 0 && !isLoading;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // File handling
  const handleFileAdd = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFileItems: FileItem[] = fileArray.map(file => ({
      id: generateId(),
      file,
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'document',
      progress: 0,
      status: 'pending'
    }));

    setFileItems(prev => [...prev, ...newFileItems]);

    // Simulate upload progress
    newFileItems.forEach(item => {
      const interval = setInterval(() => {
        setFileItems(prev => 
          prev.map(f => 
            f.id === item.id && f.progress < 100
              ? { ...f, progress: f.progress + 10, status: f.progress >= 90 ? 'completed' : 'uploading' }
              : f
          )
        );
      }, 100);
    });
  }, []);

  const handleFileRemove = useCallback((fileId: string) => {
    setFileItems(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // FIXED: Send message with proper error handling
  const handleSendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() && fileItems.length === 0) return;
    if (isLoading) return;

    // Store items for potential restoration
    const currentFileItems = [...fileItems];
    
    try {
      const files = fileItems
        .filter(item => item.status === 'completed')
        .map(item => item.file);

      // Clear input immediately before sending
      setInput('');
      setFileItems([]);

      await sendMessage(messageToSend.trim(), {
        files,
        sessionId: currentSessionId || undefined
      });

    } catch (error) {
      // FIXED: Restore state if send fails
      setInput(messageToSend);
      setFileItems(currentFileItems);
      console.error('Failed to send message:', error);
    }
  }, [input, fileItems, isLoading, sendMessage, currentSessionId]);

  // Handle trending topic selection
  const handleTrendingTopicSelect = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  // Session management
  const createNewSession = useCallback(() => {
    clearMessages();
    setCurrentSessionId(null);
    setShowSidebar(false);
  }, [clearMessages]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    const selectedSession = sessions.find((s: ChatSession) => s.id === sessionId);
    if (selectedSession && selectedSession.messages) {
      console.log('Loading session:', selectedSession);
    }
    setShowSidebar(false);
  }, [sessions]);

  const handleSessionDelete = useCallback((sessionId: string) => {
    setSessions((prev: ChatSession[]) => prev.filter((s: ChatSession) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      createNewSession();
    }
    console.log('Deleting session:', sessionId);
  }, [currentSessionId, createNewSession]);

  // Voice handlers
  const handleVoiceToggle = useCallback(() => {
    if (!support.speechRecognition) {
      alert(`Voice input tidak didukung di ${support.browserName}.`);
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [support.speechRecognition, isListening, startListening, stopListening, support.browserName]);

  const handleVoiceTranscript = useCallback((newTranscript: string) => {
    setInput(prev => prev + newTranscript);
  }, []);

  const handleFinalTranscript = useCallback((finalTranscript: string) => {
    if (finalTranscript.trim()) {
      handleSendMessage(finalTranscript.trim());
    }
  }, [handleSendMessage]);

  // FIXED: Continue message handler
  const handleContinueMessage = useCallback(async () => {
    if (!isLoading && messages.length > 0) {
      try {
        await continueMessage();
      } catch (error) {
        console.error('Failed to continue message:', error);
      }
    }
  }, [continueMessage, isLoading, messages.length]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <FixedChatSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            onSessionDelete={handleSessionDelete}
            onNewSession={createNewSession}
            onClose={() => setShowSidebar(false)}
            isOpen={showSidebar}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* FIXED: Enhanced Navbar with compatible props */}
        <EnhancedNavbar
          onHomeClick={() => setShowSidebar(true)} // FIXED: Use onHomeClick instead of onMenuClick
          onSettingsClick={() => setShowSettings(true)}
          onLoginClick={() => setShowLogin(true)}
          onNewChat={createNewSession} // FIXED: Use onNewChat instead of onNewSession
          // FIXED: Remove voice-related props if not supported by EnhancedNavbar
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

                  <div className="mb-6 flex justify-center gap-2">
                    <Badge variant={support.speechRecognition ? "default" : "secondary"}>
                      <Mic className="h-3 w-3 mr-1" />
                      Voice: {support.speechRecognition ? 'Supported' : 'Not Available'}
                    </Badge>
                    <Badge variant="outline">
                      Browser: {support.browserName}
                    </Badge>
                  </div>

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

              {/* Messages with FIXED Continue Button */}
              <AnimatePresence>
                {messages.map((message, index) => (
                  <MessageWithContinue
                    key={message.id}
                    message={message}
                    isLastMessage={index === messages.length - 1}
                    onContinue={handleContinueMessage}
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
                        showTimestamp={chatSettings?.showTimestamps}
                        compactMode={chatSettings?.compactMode}
                        isLastMessage={index === messages.length - 1}
                      />
                      
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

        {/* FIXED: Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto p-4 space-y-3">
            <SmartFileUpload
              files={fileItems}
              onFilesChange={setFileItems}
              onFileAdd={handleFileAdd}
              onFileRemove={handleFileRemove}
              maxFiles={5}
              maxFileSize={50 * 1024 * 1024}
              autoCollapse={true}
              showUploadArea={true}
            />

            <div className="flex items-end gap-2">
              {support.speechRecognition && (
                <VoiceInput
                  onTranscriptChange={handleVoiceTranscript}
                  onFinalTranscript={handleFinalTranscript}
                  isEnabled={isVoiceEnabled}
                  language="id-ID"
                />
              )}

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
                  isLoading={isLoading}
                  maxLength={4000}
                  showCharacterCount={true}
                  autoResize={true}
                  minHeight={60}
                  maxHeight={120}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CompactSettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* FIXED: LoginDialog with compatible props */}
      <LoginDialog
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        // FIXED: Remove onSuccess if not supported
      />
    </div>
  );
};