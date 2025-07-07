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

// Custom Components - UPDATED IMPORTS
import { ChatMessage } from './ChatMessage';
import { FileUpload } from './FileUpload';
import { LoadingDots } from './LoadingDots';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { SettingsDialog } from './SettingsDialog';
import { LoginDialog } from './LoginDialog';
import { EnhancedNavbar } from './EnhancedNavbar';

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
            <div className="text-center p-4 text-muted-foreground text-sm">
              No conversations found
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50",
                  currentSessionId === session.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-muted/20 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate flex-1">
                    {session.title}
                  </h4>
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
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {session.message_count} messages
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.last_message_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

export function ChatBot() {
  const { 
    user, 
    isAuthenticated, 
    isAdmin, 
    logout, 
    usage, 
    updateUsage, 
    canSendMessage, 
    getRemainingMessages, 
    getQuotaLimit 
  } = useAuth();

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition>({
    isListening: false,
    isSupported: false,
    recognition: null
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Quota info
  const quotaUsed = usage.messageCount;
  const quotaLimit = getQuotaLimit();
  const userRole = user?.role || 'guest';

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Hide welcome when there are messages
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
  }, [messages]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (!canSendMessage()) return;
    if (isLoading) return;

    const messageContent = input.trim();
    const files = [...selectedFiles];
    
    setInput('');
    setSelectedFiles([]);
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      content: messageContent,
      role: 'user',
      timestamp: new Date(),
      attachments: files.length > 0 ? files : undefined,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Prepare request data
      const requestData = {
        message: messageContent,
        files: files.map(file => ({
          name: file.name,
          type: file.type,
          content: file.base64
        })),
        sessionId: currentSessionId,
        userId: user?.id
      };

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add AI response
      const aiMessage: Message = {
        id: generateId(),
        content: data.response || 'Sorry, I could not process your request.',
        role: 'assistant',
        timestamp: new Date(),
        metadata: data.metadata
      };

      setMessages(prev => [...prev, aiMessage]);
      updateUsage('message');

      // Update session if provided
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        content: 'Sorry, there was an error processing your message. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (files: UploadedFile[]) => {
    setSelectedFiles(files);
    setShowUpload(false);
  };

  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Session management
  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowSidebar(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Load session messages here
    setShowSidebar(false);
  };

  const handleSessionDelete = (sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      createNewSession();
    }
  };

  // Handle navigation
  const handleHomeClick = () => {
    createNewSession();
    setShowSidebar(false);
  };

  const handleSettingsClick = () => {
    if (isAdmin) {
      setShowSettings(true);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed left-0 top-0 h-full w-80 bg-card border-r z-50 lg:relative lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <h2 className="font-semibold">Chat History</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={createNewSession}
                    title="New conversation"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
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

              {/* Search */}
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

              {/* Chat Sessions */}
              {isAuthenticated ? (
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
        {/* Enhanced Navbar - UPDATED */}
        <EnhancedNavbar
          user={user}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          notifications={0}
          onMenuToggle={() => setShowSidebar(!showSidebar)}
          onHomeClick={handleHomeClick}
          onSettingsClick={handleSettingsClick}
          onLoginClick={() => setShowLogin(true)}
          onLogoutClick={logout}
          onUploadClick={() => setShowUpload(true)}
          onVoiceToggle={() => {/* Voice toggle logic */}}
          onSpeechToggle={() => setSpeechEnabled(!speechEnabled)}
          isVoiceActive={voiceRecognition.isListening}
          isSpeechEnabled={speechEnabled}
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
                  <h2 className="text-2xl font-bold mb-2">Welcome to AI Chatbot</h2>
                  <p className="text-muted-foreground mb-2">
                    Start a conversation by typing a message or uploading a file
                  </p>
                  
                  {/* Quota Information */}
                  <div className="mb-6">
                    <Badge variant="secondary" className="text-xs">
                      {userRole === 'admin' ? 
                        'Unlimited messages' : 
                        `${quotaUsed}/${quotaLimit} messages used today`
                      }
                    </Badge>
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isUser={message.role === 'user'}
                  onCopy={() => navigator.clipboard.writeText(message.content)}
                />
              ))}

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

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto p-4">
            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-32">{file.originalName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => handleRemoveFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    !canSendMessage() 
                      ? "You've reached your daily message limit" 
                      : "Type your message here..."
                  }
                  disabled={isLoading || !canSendMessage()}
                  className="min-h-12 max-h-32 resize-none pr-12"
                  rows={1}
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || !canSendMessage()}
                size="icon"
                className="h-12 w-12 shrink-0"
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
      {showSettings && isAdmin && (
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
