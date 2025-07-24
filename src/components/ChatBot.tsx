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
import Logo from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { CompactSettingsDialog } from './SettingsDialog';
import FixedChatSidebar from './ChatSidebar';
import { MessageWithContinue } from './ContinueButton';
import { TrendingCards } from './TrendingCards';
import { LoginDialog } from './LoginDialog';
import EnhancedTextarea from './EnhancedTextarea';

// Context and Utilities
import { useAuth } from '@/context/AuthContext';
import { useVoiceInput, useTextToSpeech } from '@/hooks/useVoiceInput';
import { useChat } from '@/hooks/useChat';
import { generateId, debounce, cn } from '@/lib/utils';

// FIXED: Import proper database functions
import { 
  getUserSessions, 
  createChatSession, 
  deleteSession,
  updateChatSession,
  getSessionMessages,
  createMessage
} from '@/lib/supabase';

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

// Browser support detection function
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
  // ========================================
  // AUTHENTICATION & USER STATE
  // ========================================
  const { 
    user, 
    isAuthenticated, 
    isGuest, 
    isAdmin, 
    isLoading: authLoading,
    canSendMessage,
    updateUsage,
    getAuthToken,
    getRemainingMessages,
    quotaUsed,
    quotaLimit 
  } = useAuth();

  // ========================================
  // SIDEBAR & DIALOG STATE MANAGEMENT
  // ========================================
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // FIXED: Real session management instead of mock
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // FIXED: Enhanced sidebar toggle with responsive logic
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  // FIXED: Close sidebar function
  const closeSidebar = useCallback(() => {
    setShowSidebar(false);
  }, []);

  // FIXED: Enhanced responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      const isDesktopSize = window.innerWidth >= 1024; // lg breakpoint
      setIsDesktop(isDesktopSize);
      
      if (isDesktopSize) {
        // Desktop: auto-show sidebar
        setShowSidebar(true);
      } else {
        // Mobile/Tablet: auto-hide sidebar
        setShowSidebar(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FIXED: Keyboard shortcuts for sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key to close sidebar on mobile
      if (e.key === 'Escape' && showSidebar && !isDesktop) {
        closeSidebar();
      }
      
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSidebar, isDesktop, closeSidebar, toggleSidebar]);

  // FIXED: Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (showSidebar && !isDesktop) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSidebar, isDesktop]);

  // FIXED: Enhanced swipe gesture detection for mobile
  useEffect(() => {
    if (isDesktop) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startTime = Date.now();
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      
      // Provide subtle visual feedback during swipe
      const deltaX = currentX - startX;
      if (showSidebar && deltaX < -50) {
        // Slightly dim backdrop during swipe to close
        const backdrop = document.querySelector('[data-backdrop="true"]') as HTMLElement;
        if (backdrop) {
          backdrop.style.opacity = `${Math.max(0.2, 0.4 + deltaX / 200)}`;
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      const deltaX = currentX - startX;
      const deltaTime = Date.now() - startTime;
      const velocity = Math.abs(deltaX) / deltaTime; // pixels per ms
      const threshold = velocity > 0.5 ? 80 : 120; // Lower threshold for fast swipes

      // Reset backdrop opacity
      const backdrop = document.querySelector('[data-backdrop="true"]') as HTMLElement;
      if (backdrop) {
        backdrop.style.opacity = '';
      }

      // Swipe right from left edge to open sidebar
      if (startX < 50 && deltaX > threshold && !showSidebar) {
        setShowSidebar(true);
      }
      // Swipe left to close sidebar
      else if (deltaX < -threshold && showSidebar) {
        closeSidebar();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDesktop, showSidebar, closeSidebar]);

  // ========================================
  // CHAT STATE & HOOKS
  // ========================================
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    continueMessage,
    clearMessages,
    retryLastMessage,
    loadMessages
  } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onSuccess: (response) => {
      // FIXED: Update usage after successful message with number
      updateUsage(1);
    }
  });

  // ========================================
  // VOICE & SPEECH HOOKS
  // ========================================
  const {
    isSupported: voiceSupported,
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

  const {
    isSupported: speechSupported,
    isSpeaking,
    voices,
    selectedVoice,
    speak,
    stop: stopSpeaking,
    setVoice
  } = useTextToSpeech();

  // Create browser support object using actual hook values
  const support = useMemo(() => ({
    speechRecognition: voiceSupported,
    speechSynthesis: speechSupported,
    microphone: voiceSupported,
    browserName: getBrowserSupport().browserName,
    isSupported: voiceSupported || speechSupported
  }), [voiceSupported, speechSupported]);

  // ========================================
  // INPUT & FILE STATE - GEMINI ENHANCED
  // ========================================
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFocused, setIsFocused] = useState(false); // NEW: Focus state for Gemini style
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ========================================
  // FIXED: DATABASE INTEGRATION FUNCTIONS
  // ========================================

  // Load user sessions from database
  const loadUserSessions = useCallback(async () => {
    if (!user?.id) {
      setSessions([]);
      setIsLoadingSessions(false);
      return;
    }

    try {
      setIsLoadingSessions(true);
      const userSessions = await getUserSessions(user.id);
      
      const formattedSessions: ChatSession[] = userSessions.map(session => ({
        id: session.id,
        user_id: session.user_id,
        title: session.title,
        message_count: session.message_count || 0,
        last_message_at: session.last_message_at || session.updated_at,
        context_summary: session.context_summary,
        settings: session.settings,
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at
      }));

      setSessions(formattedSessions);
      
      // Set current session to the most recent one if none selected
      if (!currentSessionId && formattedSessions.length > 0) {
        setCurrentSessionId(formattedSessions[0].id);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user?.id, currentSessionId]);

  // Create new session
  const createNewSession = useCallback(async (title?: string) => {
    if (!user?.id) {
      // For guests, just create a temporary session
      const tempSessionId = generateId();
      setCurrentSessionId(tempSessionId);
      clearMessages();
      return tempSessionId;
    }

    try {
      const sessionTitle = title || `Chat ${new Date().toLocaleDateString()}`;
      const newSession = await createChatSession(user.id, sessionTitle);
      
      if (newSession) {
        const formattedSession: ChatSession = {
          id: newSession.id,
          user_id: newSession.user_id,
          title: newSession.title,
          message_count: 0,
          last_message_at: newSession.created_at,
          context_summary: undefined,
          settings: newSession.settings,
          is_active: true,
          created_at: newSession.created_at,
          updated_at: newSession.updated_at
        };

        setSessions(prev => [formattedSession, ...prev]);
        setCurrentSessionId(newSession.id);
        clearMessages();
        return newSession.id;
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
    return null;
  }, [user?.id, clearMessages]);

  // Load session messages
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!user?.id) return; // Skip for guests

    try {
      const sessionMessages = await getSessionMessages(sessionId);
      
      const formattedMessages: Message[] = sessionMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: new Date(msg.created_at || msg.timestamp),
        attachments: msg.attachments || [],
        metadata: msg.metadata
      }));

      loadMessages(formattedMessages, sessionId);
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  }, [user?.id, loadMessages]);

  // ========================================
  // EFFECTS
  // ========================================

  // Load sessions when user changes
  useEffect(() => {
    if (!authLoading) {
      loadUserSessions();
    }
  }, [user?.id, authLoading, loadUserSessions]);

  // Load current session messages when currentSessionId changes
  useEffect(() => {
    if (currentSessionId && user?.id) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId, user?.id, loadSessionMessages]);

  // Hide welcome message when chat starts
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages.length]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + transcript);
    }
  }, [transcript]);

  // Auto-resize textarea for Gemini style
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  // FIXED: Send message handler - LINE 342 FIX
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    
    if (!textToSend && files.length === 0) return;
    if (!canSendMessage()) {
      alert('Anda telah mencapai batas pesan. Silakan upgrade akun Anda.');
      return;
    }

    try {
      const fileObjects = files.map(item => item.file);
      
      await sendMessage(textToSend, {
        files: fileObjects.length > 0 ? fileObjects : undefined,
        sessionId: currentSessionId || undefined
      });

      // FIXED LINE 342: updateUsage dengan parameter number (1), bukan string
      // updateUsage(1); - REMOVED dari sini karena sudah ada di useChat onSuccess

      setInput('');
      setFiles([]);
      setIsFocused(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [input, files, canSendMessage, sendMessage, currentSessionId]);

  // Key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // FIXED: File handling with proper integration
  const handleFileAdd = useCallback((newFiles: File[]) => {
    const newFileItems: FileItem[] = newFiles.map(file => ({
      id: generateId(),
      file,
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'document',
      progress: 100,
      status: 'completed' as const,
      url: URL.createObjectURL(file)
    }));
    
    setFiles(prev => [...prev, ...newFileItems]);
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // FIXED: Session handlers with database integration
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    try {
      setCurrentSessionId(sessionId);
      await loadSessionMessages(sessionId);
      
      // FIXED: Close sidebar on mobile/tablet after selection
      if (!isDesktop) {
        closeSidebar();
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [isDesktop, closeSidebar, loadSessionMessages]);

  const handleSessionDelete = useCallback(async (sessionId: string) => {
    try {
      const success = await deleteSession(sessionId);
      
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // If current session was deleted, clear messages and set new current session
        if (currentSessionId === sessionId) {
          clearMessages();
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            setCurrentSessionId(remainingSessions[0].id);
            await loadSessionMessages(remainingSessions[0].id);
          } else {
            setCurrentSessionId(null);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [currentSessionId, sessions, clearMessages, loadSessionMessages]);

  const handleNewSession = useCallback(async () => {
    await createNewSession();
    
    // FIXED: Close sidebar on mobile/tablet after creating new session
    if (!isDesktop) {
      closeSidebar();
    }
  }, [createNewSession, isDesktop, closeSidebar]);

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

  const handleContinueMessage = useCallback(async () => {
    if (!isLoading && messages.length > 0) {
      try {
        await continueMessage();
      } catch (error) {
        console.error('Failed to continue message:', error);
      }
    }
  }, [continueMessage, isLoading, messages.length]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* FIXED: Enhanced Sidebar with backdrop and smooth transitions */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <>
            {/* FIXED: Backdrop overlay for mobile/tablet */}
            {!isDesktop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.2, 
                  ease: "easeOut"
                }}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
                data-backdrop="true"
                onClick={closeSidebar}
                onTouchStart={closeSidebar} // Mobile touch support
              />
            )}
            
            {/* FIXED: Sidebar Component - Tanpa duplikasi logo */}
            <motion.div
              initial={{ 
                x: isDesktop ? 0 : -320,
                opacity: isDesktop ? 1 : 0 
              }}
              animate={{ 
                x: 0,
                opacity: 1 
              }}
              exit={{ 
                x: isDesktop ? 0 : -320,
                opacity: isDesktop ? 1 : 0 
              }}
              transition={{ 
                type: "tween",
                ease: [0.25, 0.1, 0.25, 1], // Custom cubic-bezier for natural feel
                duration: isDesktop ? 0.15 : 0.25
              }}
              className={cn(
                "bg-card border-r border-border z-50 flex flex-col",
                isDesktop 
                  ? "relative w-80 h-full" 
                  : "fixed left-0 top-0 bottom-0 w-80"
              )}
            >
              <FixedChatSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSessionSelect={handleSessionSelect}
                onSessionDelete={handleSessionDelete}
                onNewSession={handleNewSession}
                onClose={closeSidebar}
                isOpen={true}
                isLoading={isLoadingSessions}
                user={user}
                profile={user}
                isGuest={isGuest}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        // FIXED: Add margin on desktop when sidebar is visible
        isDesktop && showSidebar ? "ml-0" : "ml-0"
      )}>
        {/* FIXED: Enhanced Navbar with responsive menu button */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          {/* Left Side - Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* FIXED: Dedicated Sidebar Toggle Button - Always Visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "h-9 w-9 transition-all duration-200",
                showSidebar 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "hover:bg-muted"
              )}
              title={showSidebar ? "Close sidebar" : "Open sidebar"}
            >
              <motion.div
                animate={{ scale: showSidebar ? 0.9 : 1 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                <Menu className="h-4 w-4" />
              </motion.div>
            </Button>

            {/* FIXED: Logo - Hanya di navbar untuk menghindari duplikasi */}
            <Logo 
              size="md" 
              variant="gradient"
              showText={true}
              className="hidden sm:flex"
            />
            
            {/* Mobile Logo */}
            <Logo 
              size="sm" 
              variant="gradient"
              showText={false}
              className="sm:hidden"
            />
          </div>

          {/* Center - Voice Controls (Optional) */}
          <div className="flex items-center gap-2">
            {/* Voice Input Toggle */}
            <Button
              variant={isListening ? "default" : "ghost"}
              size="sm"
              onClick={handleVoiceToggle}
              disabled={!support.speechRecognition || isLoading}
              className="hidden sm:flex items-center gap-2"
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="h-3 w-3" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
              <span className="text-xs">
                {isListening ? "Listening" : "Voice"}
              </span>
            </Button>

            {/* Speech Output Toggle */}
            <Button
              variant={isSpeaking ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else if (messages.length > 0) {
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    speak(lastMessage.content);
                  }
                }
              }}
              className="hidden sm:flex items-center gap-2"
              title={isSpeaking ? "Stop speech" : "Read last message"}
            >
              {isSpeaking ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
              <span className="text-xs">
                {isSpeaking ? "Stop" : "Speak"}
              </span>
            </Button>
          </div>

          {/* Right Side - User & Controls */}
          <div className="flex items-center gap-2">
            {/* User Status */}
            {user ? (
              <div className="flex items-center gap-2">
                {/* User Badge */}
                <Badge 
                  variant={isAdmin ? "default" : isGuest ? "secondary" : "outline"}
                  className="hidden sm:flex items-center gap-1"
                >
                  {isAdmin ? (
                    <Crown className="h-3 w-3" />
                  ) : isGuest ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                  <span className="text-xs">
                    {isAdmin ? "Admin" : isGuest ? "Guest" : "User"}
                  </span>
                </Badge>

                {/* Mobile User Icon */}
                <div className="sm:hidden">
                  {isAdmin ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : isGuest ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Shield className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            ) : (
              /* Login Button */
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2"
              >
                <LogIn className="h-3 w-3" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* FIXED: Settings Button - Only show for authenticated non-guest users */}
            {user && !isGuest && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                title="Open settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* FIXED: Loading overlay when switching sessions */}
          <AnimatePresence>
            {isLoading && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading chat...</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  <h2 className="text-2xl font-bold mb-2">Welcome to AI Chat</h2>
                  <p className="text-muted-foreground mb-6">
                    Start a conversation by typing a message, uploading a file, or using voice input
                  </p>

                  <div className="mb-6 flex justify-center gap-2 flex-wrap">
                    <Badge variant={support.speechRecognition ? "default" : "secondary"}>
                      <Mic className="h-3 w-3 mr-1" />
                      Voice: {support.speechRecognition ? 'Supported' : 'Not Supported'}
                    </Badge>
                    <Badge variant={support.speechSynthesis ? "default" : "secondary"}>
                      <Volume2 className="h-3 w-3 mr-1" />
                      Speech: {support.speechSynthesis ? 'Supported' : 'Not Supported'}
                    </Badge>
                    <Badge variant="outline">
                      <Upload className="h-3 w-3 mr-1" />
                      File Upload: Supported
                    </Badge>
                  </div>

                  {/* Trending Cards */}
                  <TrendingCards onTopicSelect={(topic) => setInput(topic)} />

                  {/* FIXED: Mobile swipe hint */}
                  {!isDesktop && !showSidebar && messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 3, duration: 0.4 }}
                      className="mt-8 text-center"
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-full text-xs text-muted-foreground">
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        >
                          👉
                        </motion.div>
                        Swipe right from edge to open history
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Messages */}
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;
                const isAssistant = message.role === 'assistant';
                
                return (
                  <MessageWithContinue
                    key={message.id}
                    message={message}
                    isLastMessage={isLast && isAssistant && !isLoading}
                    onContinue={handleContinueMessage}
                  >
                    <ChatMessage 
                      message={message}
                      index={index}
                      isLastMessage={isLast}
                      showTimestamp={true}
                      compactMode={false}
                    />
                  </MessageWithContinue>
                );
              })}

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-muted rounded-lg p-4">
                    <LoadingDots />
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={retryLastMessage}
                      className="ml-2"
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ========================================
           GEMINI STYLE INPUT AREA - ENHANCED WITH DIRECT INPUT
           ======================================== */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced File Attachments Preview */}
            {files.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 p-3 bg-secondary/20 rounded-2xl border border-border/50">
                  {files.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ 
                        delay: index * 0.05, 
                        type: "spring", 
                        stiffness: 300,
                        damping: 25 
                      }}
                      className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-border/30 shadow-sm hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2">
                        {file.type === 'image' && <Image className="h-4 w-4 text-blue-500" />}
                        {file.type === 'video' && <Video className="h-4 w-4 text-purple-500" />}
                        {file.type === 'audio' && <Music className="h-4 w-4 text-green-500" />}
                        {file.type === 'document' && <File className="h-4 w-4 text-orange-500" />}
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {file.file.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-all duration-150 opacity-70 group-hover:opacity-100"
                        onClick={() => handleRemoveFile(file.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* GEMINI STYLE: Compact/Expandable Input Container - DIRECT INPUT ENABLED */}
            <motion.div
              className={cn(
                "relative bg-background/95 backdrop-blur-md border border-border/80 rounded-3xl shadow-lg transition-all duration-300 ease-out overflow-hidden cursor-text",
                "hover:border-primary/30 hover:shadow-xl",
                (isFocused || input.length > 0 || files.length > 0) 
                  ? "shadow-2xl border-primary/50 ring-2 ring-primary/10" 
                  : "shadow-md"
              )}
              animate={{
                height: (isFocused || input.length > 0 || files.length > 0) ? "auto" : "56px",
                scale: (isFocused || input.length > 0 || files.length > 0) ? 1.01 : 1
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.3
              }}
              onClick={() => {
                if (!isFocused) {
                  textareaRef.current?.focus();
                }
              }}
            >
              {/* Inner Container */}
              <div className="relative flex items-start p-3">
                
                {/* Left Actions - Add Button */}
                <div className="flex items-center mr-3">
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "rounded-full hover:bg-secondary/80 transition-all duration-200",
                        (isFocused || input.length > 0) ? "h-8 w-8" : "h-10 w-10"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.multiple = true;
                        fileInput.accept = 'image/*,video/*,audio/*,application/pdf,text/*';
                        fileInput.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files) {
                            handleFileAdd(Array.from(files));
                          }
                        };
                        fileInput.click();
                      }}
                      disabled={isLoading}
                      title="Upload files"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>

                {/* Center - Direct Textarea Input */}
                <div className="flex-1 relative">
                  {/* Main Textarea - Always Accessible */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if ((input.trim() || files.length > 0) && canSendMessage()) {
                            handleSendMessage();
                          }
                        }
                        if (e.key === 'Escape') {
                          setIsFocused(false);
                          textareaRef.current?.blur();
                        }
                      }}
                      placeholder={
                        isListening 
                          ? "🎤 Listening... atau ketik pesan"
                          : isFocused || input.length > 0 || files.length > 0
                            ? "Type your message here or use voice input..."
                            : "Ask anything... Click here to start typing"
                      }
                      disabled={isLoading}
                      className={cn(
                        "w-full resize-none border-0 bg-transparent text-sm leading-relaxed",
                        "placeholder:text-muted-foreground/70 focus:outline-none pr-16",
                        "transition-all duration-200",
                        (isFocused || input.length > 0 || files.length > 0) 
                          ? "min-h-[80px] max-h-[200px] py-2" 
                          : "h-8 py-1 overflow-hidden",
                        isListening && "placeholder:text-red-500/70"
                      )}
                      style={{ 
                        lineHeight: '1.5',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'transparent transparent'
                      }}
                    />

                    {/* Character Counter - Compact */}
                    {input.length > 3500 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-1 right-16 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50"
                      >
                        {input.length}/4000
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Right Actions - Voice & Send */}
                <div className="flex items-start gap-1 ml-2">
                  
                  {/* Voice Button */}
                  {support.speechRecognition && (
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVoiceToggle();
                        }}
                        disabled={isLoading}
                        className={cn(
                          "rounded-full transition-all duration-200",
                          (isFocused || input.length > 0 || files.length > 0) ? "h-8 w-8" : "h-10 w-10",
                          isListening 
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg" 
                            : "hover:bg-secondary/80"
                        )}
                        title={isListening ? "Stop listening" : "Start voice input"}
                      >
                        {isListening ? (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                          >
                            <MicOff className="h-4 w-4" />
                          </motion.div>
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                  )}

                  {/* Send Button - Only visible when ready to send */}
                  <AnimatePresence>
                    {(input.trim() || files.length > 0) && canSendMessage() && !isLoading && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 30 
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendMessage();
                          }}
                          disabled={isLoading}
                          className={cn(
                            "rounded-full font-medium transition-all duration-200",
                            "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl",
                            (isFocused || input.length > 0 || files.length > 0) ? "h-8 w-8 p-0" : "h-10 w-10 p-0"
                          )}
                          title="Send message"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Loading State */}
                  {isLoading && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center h-8 w-8"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Bottom Helper Text */}
              <AnimatePresence>
                {(isFocused || input.length > 0 || files.length > 0) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-3 pt-1 overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                      <span>Press Enter to send, Shift+Enter for new line</span>
                      <span>{input.length}/4000</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Voice Status Indicator - Enhanced */}
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 flex items-center justify-center gap-3 p-3 bg-red-500/10 rounded-2xl border border-red-500/20"
                >
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-2 h-2 bg-red-500 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    />
                    <motion.div 
                      className="w-2 h-2 bg-red-500 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                    />
                    <motion.div 
                      className="w-2 h-2 bg-red-500 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.4 }}
                    />
                  </div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Listening... Speak now or press ESC to cancel
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Sidebar Indicator - Only when not focused */}
            {isDesktop && !showSidebar && !isFocused && input.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3, duration: 0.3 }}
                className="mt-4 text-center"
              >
                <p className="text-xs text-muted-foreground/50">
                  💡 Press Ctrl+B or click the menu button to toggle sidebar
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* FIXED: Enhanced Dialogs with proper z-index */}
      <CompactSettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      
      <LoginDialog
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
      />

      {/* FIXED: Floating Quick Access Button - More Subtle */}
      {!isDesktop && !showSidebar && messages.length > 0 && (
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ delay: 1.5, duration: 0.3, ease: "easeOut" }}
          className="fixed left-3 bottom-20 z-30"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="bg-background/90 backdrop-blur-sm shadow-md border border-border/50 hover:bg-background/95 transition-all duration-200"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            <span className="text-xs">History</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
};