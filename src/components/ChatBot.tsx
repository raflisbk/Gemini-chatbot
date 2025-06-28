'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  RotateCcw, 
  AlertCircle, 
  X, 
  Settings, 
  Plus, 
  Sidebar, 
  Home, 
  LogOut, 
  LogIn, 
  User,
  Upload,
  Code,
  FileText,
  Image,
  Menu,
  Search,
  Clock,
  Trash2,
  Sparkles,
  Paperclip,
  Music,
  Video,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  MessageSquare,
  Bot,
  Zap,
  Globe,
  Mic,
  Camera,
  FolderOpen,
  Star,
  TrendingUp,
  MoreHorizontal,
  Share,
  Bookmark,
  Edit3,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatTextarea, Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/ChatMessage';
import { ContinueButton } from '@/components/ContinueButton';
import { LoadingDots } from '@/components/LoadingDots';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsDialog } from '@/components/SettingsDialog';
import { LoginForm } from '@/components/LoginForm';
import { Logo } from '@/components/Logo';
import { FileUpload } from '@/components/FileUpload';
import { CodeMode } from '@/components/CodeMode';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import { ChatStorage } from '@/lib/chatStorage';
import TrendingAPI from '@/lib/trendingAPI';
import { ChatSession } from '@/lib/types';
import { 
  generateId, 
  formatFileSize, 
  getFileCategory, 
  getFileProcessingHint, 
  canProcessFile,
  formatTimestamp,
  cn,
  debounce
} from '@/lib/utils';

// Enhanced file icon component with better categorization
const getFileIcon = (file: File) => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  if (type.startsWith('image/')) {
    return <Image className="h-3 w-3 text-blue-500" />;
  } else if (type.startsWith('audio/')) {
    return <Music className="h-3 w-3 text-purple-500" />;
  } else if (type.startsWith('video/')) {
    return <Video className="h-3 w-3 text-red-500" />;
  } else if (type.includes('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return <FileText className="h-3 w-3 text-green-500" />;
  } else if (type.includes('json') || type.includes('csv') || name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|php|rb|go|rs|swift|kt)$/)) {
    return <FileCode className="h-3 w-3 text-orange-500" />;
  } else if (type.includes('spreadsheet') || name.match(/\.(xlsx|xls|csv)$/)) {
    return <FileSpreadsheet className="h-3 w-3 text-emerald-500" />;
  } else if (type.includes('zip') || type.includes('rar') || type.includes('7z')) {
    return <FileArchive className="h-3 w-3 text-yellow-500" />;
  } else {
    return <FileIcon className="h-3 w-3 text-gray-500" />;
  }
};

export function ChatBot() {
  // UI state
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  
  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  // File handling state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  
  // Trending and suggestions
  const [trendingPrompts, setTrendingPrompts] = useState<string[]>([]);
  const [featuredPrompts, setFeaturedPrompts] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  
  // Export and sharing
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'md' | 'json'>('md');
  
  // FIXED: Added initialization state
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Chat hooks
  const {
    messages,
    isLoading,
    error,
    canContinue,
    sendMessage,
    continueMessage,
    clearMessages,
    clearError,
    loadMessages,
    getConversationSummary,
    exportConversation,
    importConversation
  } = useChat();

  // Auth hooks
  const {
    isAuthenticated,
    user,
    login,
    logout,
    updateUsage,
    remainingQuota,
    isAdmin,
    isGuest,
    chatSettings,
    appearanceSettings,
    modelSettings
  } = useAuth();

  // Auto-scroll to bottom with smooth behavior
  const scrollToBottom = () => {
    if (chatSettings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // Enhanced scroll to bottom with intersection observer
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, chatSettings.autoScroll]);

  // FIXED: Sequential initialization to prevent race conditions
  useEffect(() => {
    const initializeChat = async () => {
      setIsInitializing(true);
      
      try {
        // Load chat sessions first
        const sessions = ChatStorage.getSessions();
        setChatSessions(sessions);
        console.log(`📚 Loaded ${sessions.length} chat sessions`);
        
        // Load trending data
        await loadTrendingData();
        
        // Update usage
        updateUsage();
        
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, []);

  // FIXED: Separate function for loading trending data with better error handling
  const loadTrendingData = async () => {
    setLoadingTrending(true);
    try {
      const trending = await TrendingAPI.getTrendingTopics();
      setTrendingPrompts(trending.slice(0, 8).map(t => typeof t === 'string' ? t : t.title ?? t.prompt ?? ''));
      
      // Set featured prompts for multimodal capabilities
      setFeaturedPrompts([
        'Analyze this image and describe what you see',
        'Read and summarize this document for me',
        'Transcribe the audio from this file',
        'Help me understand this code and suggest improvements',
        'Create a data visualization from this CSV file',
        'Explain the content of this video'
      ]);
    } catch (error) {
      console.error('Failed to load trending topics:', error);
      // Fallback trending prompts
      setTrendingPrompts([
        'Jelaskan tren teknologi AI terbaru di Indonesia',
        'Bagaimana cara menganalisis gambar dengan AI?',
        'Buatkan kode Python untuk analisis data',
        'Explain machine learning concepts for beginners',
        'Tips produktivitas untuk developer',
        'Tren startup Indonesia 2024',
        'How to use ChatGPT effectively?',
        'Perkembangan fintech di Asia Tenggara'
      ]);
      
      setFeaturedPrompts([
        'Upload gambar dan tanya tentang isinya',
        'Upload dokumen untuk diringkas',
        'Upload audio untuk ditranskripsi',
        'Upload kode untuk direview',
        'Upload data untuk dianalisis',
        'Upload video untuk dijelaskan'
      ]);
    } finally {
      setLoadingTrending(false);
    }
  };

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (input.trim() || selectedFiles.length > 0) {
          handleSubmit(e as any);
        }
      }
      
      // Ctrl/Cmd + N for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        startNewChat();
      }
      
      // Ctrl/Cmd + K for code mode toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCodeMode(!isCodeMode);
      }
      
      // Escape to close dialogs
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setLoginOpen(false);
        setLogoutConfirm(false);
        setShowExportDialog(false);
        setShowFileUpload(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [input, selectedFiles, isCodeMode]);

  // Debounced search for sessions
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
  }, 300);

  // FIXED: Enhanced form submission with proper state management
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    
    // Enhanced validation
    if (!trimmedInput && selectedFiles.length === 0) {
      inputRef.current?.focus();
      return;
    }
    
    if (isLoading) return;
    
    // Check authentication and quota
    if (!isAuthenticated && remainingQuota <= 0) {
      setLoginOpen(true);
      return;
    }

    // FIXED: Store input and files before processing
    const messageText = trimmedInput;
    const filesToSend = [...selectedFiles];

    // Prepare message content with smart defaults for files
    let finalMessageText = messageText;
    if (!finalMessageText && filesToSend.length > 0) {
      // Generate smart prompt based on file types
      const fileTypes = [...new Set(filesToSend.map(f => getFileCategory(f)))];
      if (fileTypes.includes('image')) {
        finalMessageText = "Please analyze and describe what you see in the uploaded images.";
      } else if (fileTypes.includes('document')) {
        finalMessageText = "Please read and summarize the uploaded documents.";
      } else if (fileTypes.includes('audio')) {
        finalMessageText = "Please transcribe and analyze the uploaded audio files.";
      } else if (fileTypes.includes('video')) {
        finalMessageText = "Please analyze and describe the content of the uploaded videos.";
      } else if (fileTypes.includes('code')) {
        finalMessageText = "Please review and explain the uploaded code files.";
      } else {
        finalMessageText = "Please analyze the uploaded files and provide insights.";
      }
    }

    // FIXED: Only clear UI state immediately, preserve backup for error recovery
    const backupInput = input;
    const backupFiles = [...selectedFiles];
    
    // Clear UI immediately for better UX
    setInput('');
    setSelectedFiles([]);
    setShowSuggestions(false);
    setShowWelcome(false);
    setFileUploadError(null);
    setIsTyping(false);

    try {
      console.log(`📤 Sending message: "${finalMessageText}" with ${filesToSend.length} files`);
      
      // FIXED: Use the enhanced sendMessage from useChat hook
      await sendMessage(finalMessageText, filesToSend);
      
      // Enhanced session management
      if (currentSessionId) {
        // Update existing session
        const updatedMessages = [...messages, {
          id: generateId(),
          content: finalMessageText,
          role: 'user' as const,
          timestamp: new Date()
        }];
        ChatStorage.updateSession(currentSessionId, updatedMessages);
      } else if (messages.length === 0) {
        // Create new session for first message
        const firstMessage = {
          id: generateId(),
          content: finalMessageText,
          role: 'user' as const,
          timestamp: new Date()
        };
        
        const newSession = ChatStorage.createSession(firstMessage);
        setCurrentSessionId(newSession.id);
        setChatSessions(prev => [newSession, ...prev]);
        console.log(`🆕 Created new session: ${newSession.id}`);
      }
      
      // Update usage and track analytics
      updateUsage();
      
      // Track file upload analytics
      if (filesToSend.length > 0) {
        const analytics = {
          fileCount: filesToSend.length,
          fileTypes: filesToSend.map(f => getFileCategory(f)),
          totalSize: filesToSend.reduce((sum, f) => sum + f.size, 0)
        };
        console.log('📊 File upload analytics:', analytics);
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // FIXED: Restore state only on error, with user notification
      setInput(backupInput);
      setSelectedFiles(backupFiles);
      
      // Show error notification
      if (error instanceof Error) {
        setFileUploadError(error.message);
      }
    }

    // Focus appropriate input
    setTimeout(() => {
      if (input.length > 100 && textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // FIXED: Enhanced file selection with comprehensive validation
  const handleFilesSelected = (files: File[]) => {
    setFileUploadError(null);
    setIsProcessingFiles(true);
    
    try {
      // Validate total files
      const maxFiles = isAdmin ? 20 : isAuthenticated ? 10 : 5;
      if (files.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed. Please select fewer files.`);
      }

      // Validate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxTotalSize = isAdmin ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // 100MB for admin, 50MB for others
      
      if (totalSize > maxTotalSize) {
        throw new Error(`Total file size exceeds ${Math.round(maxTotalSize / 1024 / 1024)}MB limit.`);
      }

      // Validate individual files
      const validFiles: File[] = [];
      const errors: string[] = [];

      files.forEach(file => {
        // Check if file can be processed
        if (!canProcessFile(file)) {
          errors.push(`${file.name}: Unsupported file type`);
          return;
        }

        // Check individual file size
        const maxFileSize = getFileCategory(file) === 'video' ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxFileSize) {
          errors.push(`${file.name}: File too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`);
          return;
        }

        validFiles.push(file);
      });

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Update selected files
      setSelectedFiles(prev => {
        const combined = [...prev, ...validFiles];
        
        // Remove duplicates by name
        const unique = combined.filter((file, index, arr) => 
          arr.findIndex(f => f.name === file.name) === index
        );
        
        return unique.slice(0, maxFiles); // Ensure we don't exceed limit
      });

      console.log(`📎 Selected ${validFiles.length} files successfully`);
      
    } catch (error) {
      console.error('File selection error:', error);
      setFileUploadError(error instanceof Error ? error.message : 'Error selecting files');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  // Enhanced file removal
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileUploadError(null);
  };

  // Handle file drop with enhanced validation
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  };

  // Handle file drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) {
      setDragActive(true);
    }
  };

  // Handle file drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setDragActive(false);
    }
  };

  // Start new chat with proper cleanup
  const startNewChat = () => {
    clearMessages();
    setCurrentSessionId(null);
    setShowWelcome(true);
    setShowSuggestions(true);
    setInput('');
    setSelectedFiles([]);
    setFileUploadError(null);
    setIsCodeMode(false);
    inputRef.current?.focus();
  };

  // Load existing session
  const loadSession = (session: ChatSession) => {
    try {
      setCurrentSessionId(session.id);
      loadMessages(session.messages);
      setShowWelcome(false);
      setShowSuggestions(false);
      setShowSidebar(false);
      console.log(`📖 Loaded session: ${session.id}`);
    } catch (error) {
      console.error('Error loading session:', error);
      setFileUploadError('Failed to load chat session');
    }
  };

  // Delete session
  const deleteSession = (sessionId: string) => {
    try {
      ChatStorage.deleteSession(sessionId);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        startNewChat();
      }
      
      console.log(`🗑️ Deleted session: ${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    setLogoutConfirm(false);
    logout();
    startNewChat();
  };

  // Handle code template selection
  const handleCodeTemplateSelect = (template: string) => {
    setInput(template);
    setIsCodeMode(true);
    inputRef.current?.focus();
  };

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
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
                      {filteredSessions.map((session) => (
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
                          onClick={() => loadSession(session)}
                        >
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {session.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(session.createdAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* User section */}
                  <div className="p-4 border-t border-border">
                    {isAuthenticated ? (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-medium">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {remainingQuota} messages left
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLogoutConfirm(true)}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setLoginOpen(true)}
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {!showSidebar && <Logo />}
              
              {messages.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>{messages.length} messages</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Continue button */}
              {canContinue && !isLoading && (
                <ContinueButton
                  onContinue={continueMessage}
                  disabled={isLoading}
                />
              )}
              
              {remainingQuota <= 5 && !isAuthenticated && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{remainingQuota} messages left</span>
                </div>
              )}

              {/* Export button */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExportDialog(true)}
                  title="Export conversation"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
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

                    {/* Feature highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-3xl">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm"
                      >
                        <Upload className="h-8 w-8 text-blue-500 mb-3 mx-auto" />
                        <h3 className="font-semibold mb-2">Upload Files</h3>
                        <p className="text-sm text-muted-foreground">
                          Images, documents, audio, video, and code files
                        </p>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm"
                      >
                        <Code className="h-8 w-8 text-emerald-500 mb-3 mx-auto" />
                        <h3 className="font-semibold mb-2">Code Assistant</h3>
                        <p className="text-sm text-muted-foreground">
                          Debug, explain, and improve your code
                        </p>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm"
                      >
                        <Globe className="h-8 w-8 text-purple-500 mb-3 mx-auto" />
                        <h3 className="font-semibold mb-2">Indonesian Topics</h3>
                        <p className="text-sm text-muted-foreground">
                          Real trending topics and local insights
                        </p>
                      </motion.div>
                    </div>

                    {/* Trending prompts */}
                    {(trendingPrompts.length > 0 || featuredPrompts.length > 0) && (
                      <div className="w-full max-w-4xl">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-500" />
                          Try these prompts
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Trending prompts */}
                          {trendingPrompts.slice(0, 4).map((prompt, index) => (
                            <motion.button
                              key={`trending-${index}`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setInput(prompt);
                                setShowSuggestions(false);
                                inputRef.current?.focus();
                              }}
                              className="p-3 text-left rounded-lg border border-border hover:border-primary/50 transition-all bg-card/30 backdrop-blur-sm"
                            >
                              <div className="flex items-start gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-sm">{prompt}</span>
                              </div>
                            </motion.button>
                          ))}
                          
                          {/* Featured prompts */}
                          {featuredPrompts.slice(0, 2).map((prompt, index) => (
                            <motion.button
                              key={`featured-${index}`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setInput(prompt);
                                setShowSuggestions(false);
                                setShowFileUpload(true);
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

                  {/* Error display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                          {error}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearError}
                        className="text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>

                {/* Messages end marker */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto p-4">
              
              {/* File upload display */}
              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                      </span>
                      {isProcessingFiles && (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedFiles.map((file, index) => (
                        <motion.div
                          key={`${file.name}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2 bg-muted/50 hover:bg-muted/70 transition-colors rounded-lg p-2 text-sm"
                        >
                          {getFileIcon(file)}
                          <span className="font-medium max-w-32 truncate">
                            {file.name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
                            onClick={() => removeFile(index)}
                            disabled={isProcessingFiles}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* File processing status and tips */}
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                          <span>
                            <strong>Ready for analysis:</strong> AI can process images, documents, audio, video & code files
                          </span>
                        </div>
                      </div>

                      {/* File error display */}
                      {fileUploadError && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{fileUploadError}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* File Upload Zone */}
              <AnimatePresence>
                {(dragActive || showFileUpload) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <FileUpload
                      selectedFiles={selectedFiles}
                      onFilesSelected={handleFilesSelected}
                      onRemoveFile={removeFile}
                      maxFiles={isAdmin ? 20 : isAuthenticated ? 10 : 5}
                      maxSize={isAdmin ? 100 * 1024 * 1024 : 50 * 1024 * 1024}
                      className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Code Mode Display */}
              <AnimatePresence>
                {isCodeMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <CodeMode
                      isActive={isCodeMode}
                      onToggle={() => setIsCodeMode(!isCodeMode)}
                      onTemplateSelect={handleCodeTemplateSelect}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Input Form */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-3">
                  {/* File Upload Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isProcessingFiles}
                    className="h-12 w-12 shrink-0 hover:bg-muted/50 transition-colors"
                    title="Upload files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Additional Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Code Mode Toggle */}
                    <Button
                      type="button"
                      variant={isCodeMode ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setIsCodeMode(!isCodeMode)}
                      disabled={isLoading}
                      className="h-12 w-12"
                      title="Toggle code mode"
                    >
                      <Code className="h-4 w-4" />
                    </Button>

                    {/* File Upload Zone Toggle */}
                    <Button
                      type="button"
                      variant={showFileUpload ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                      disabled={isLoading}
                      className="h-12 w-12"
                      title="Toggle file upload zone"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.swift,.kt"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(Array.from(e.target.files));
                        e.target.value = ''; // Reset input
                      }
                    }}
                  />

                  {/* Input Field */}
                  <div className="flex-1 relative">
                    <div className="relative">
                      {input.length <= 100 ? (
                        <Input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={
                            !isAuthenticated && remainingQuota <= 0
                              ? 'Sign in to continue chatting...'
                              : isCodeMode
                              ? 'Ask for code help, debugging, or explanations...'
                              : selectedFiles.length > 0
                              ? 'Ask about your uploaded files...'
                              : 'Ask me anything or upload files to analyze...'
                          }
                          disabled={isLoading || (!isAuthenticated && remainingQuota <= 0) || isProcessingFiles}
                          className="h-12 pr-12 border-border/50 focus:border-primary/50 bg-background/50 rounded-xl"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                        />
                      ) : (
                        <ChatTextarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={
                            !isAuthenticated && remainingQuota <= 0
                              ? 'Sign in to continue chatting...'
                              : isCodeMode
                              ? 'Ask for code help, debugging, or explanations...'
                              : selectedFiles.length > 0
                              ? 'Ask about your uploaded files...'
                              : 'Ask me anything or upload files to analyze...'
                          }
                          disabled={isLoading || (!isAuthenticated && remainingQuota <= 0) || isProcessingFiles}
                          className="min-h-12 max-h-32 pr-12 border-border/50 focus:border-primary/50 bg-background/50 rounded-xl resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                        />
                      )}
                      
                      {/* Input indicators */}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        {/* Character counter for long input */}
                        {input.length > 3500 && (
                          <div className="text-xs text-muted-foreground font-mono bg-background px-1 rounded">
                            {input.length}/4000
                          </div>
                        )}
                        
                        {/* Code mode indicator */}
                        {isCodeMode && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-xs font-medium">
                            <Code className="h-3 w-3" />
                            <span>Code</span>
                          </div>
                        )}
                        
                        {/* Typing indicator */}
                        {isTyping && (
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce delay-100" />
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce delay-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    disabled={
                      isLoading || 
                      isProcessingFiles ||
                      (!input.trim() && selectedFiles.length === 0) || 
                      (!isAuthenticated && remainingQuota <= 0)
                    }
                    className="h-12 w-12 rounded-xl shrink-0 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Input helpers */}
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Press Ctrl+Enter to send</span>
                    {selectedFiles.length > 0 && (
                      <span>
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isAuthenticated && (
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs",
                        remainingQuota <= 3 
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : remainingQuota <= 5
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      )}>
                        {remainingQuota} free messages left
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {/* Suggestions */}
              <AnimatePresence>
                {showSuggestions && trendingPrompts.length > 0 && messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      {trendingPrompts.slice(0, 3).map((prompt, index) => (
                        <Button
                          key={`suggestion-${index}`}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInput(prompt);
                            setShowSuggestions(false);
                            inputRef.current?.focus();
                          }}
                          className="text-left h-auto p-2 text-xs"
                        >
                          {prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Drag and Drop Overlay */}
      <AnimatePresence>
        {dragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 text-center shadow-2xl"
            >
              <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Drop files here</h3>
              <p className="text-muted-foreground">
                Release to upload images, documents, audio, video, or code files
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <SettingsDialog 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      
      <LoginForm 
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />

      {/* Logout confirmation */}
      <AnimatePresence>
        {logoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-2">Sign Out</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to sign out? Your current conversation will be saved.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setLogoutConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Dialog */}
      <AnimatePresence>
        {showExportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Export Conversation</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExportDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['txt', 'md', 'json'] as const).map((format) => (
                      <Button
                        key={format}
                        variant={exportFormat === format ? "default" : "outline"}
                        size="sm"
                        onClick={() => setExportFormat(format)}
                        className="uppercase"
                      >
                        {format}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const conversation = exportConversation();
                      const filename = `chat-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
                      
                      let content = '';
                      if (exportFormat === 'json') {
                        content = JSON.stringify(conversation, null, 2);
                      } else if (exportFormat === 'md') {
                        content = `# Chat Export - ${new Date().toLocaleDateString()}\n\n`;
                        conversation.messages.forEach(msg => {
                          content += `## ${msg.role === 'user' ? 'User' : 'Assistant'}\n\n${msg.content}\n\n`;
                        });
                      } else {
                        content = conversation.messages
                          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
                          .join('\n\n');
                      }

                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = filename;
                      a.click();
                      URL.revokeObjectURL(url);
                      
                      setShowExportDialog(false);
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}