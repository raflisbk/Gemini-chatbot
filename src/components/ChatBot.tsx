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
  } else if (type.includes('pdf')) {
    return <FileText className="h-3 w-3 text-red-600" />;
  } else {
    return <FileIcon className="h-3 w-3 text-gray-500" />;
  }
};

// Get file type label with enhanced categories
const getFileTypeLabel = (file: File): string => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  if (type.startsWith('image/')) return 'IMG';
  if (type.startsWith('audio/')) return 'AUDIO';
  if (type.startsWith('video/')) return 'VIDEO';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || name.endsWith('.docx')) return 'DOC';
  if (type.includes('json')) return 'JSON';
  if (type.includes('csv')) return 'CSV';
  if (name.match(/\.(js|ts|jsx|tsx)$/)) return 'CODE';
  if (name.endsWith('.py')) return 'PY';
  if (name.endsWith('.java')) return 'JAVA';
  if (name.match(/\.(cpp|c|h)$/)) return 'C++';
  if (name.endsWith('.php')) return 'PHP';
  if (name.endsWith('.rb')) return 'RUBY';
  if (name.endsWith('.go')) return 'GO';
  if (name.endsWith('.rs')) return 'RUST';
  if (name.endsWith('.swift')) return 'SWIFT';
  if (name.endsWith('.kt')) return 'KOTLIN';
  
  return 'FILE';
};

// Get file category color classes
const getFileColor = (file: File): string => {
  const category = getFileCategory(file);
  
  switch (category) {
    case 'image': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
    case 'audio': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
    case 'video': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
    case 'document': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    case 'code': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
    case 'archive': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
    default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
  }
};

export function ChatBot() {
  // Main state
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  
  // Trending and suggestions
  const [trendingPrompts, setTrendingPrompts] = useState<string[]>([]);
  const [featuredPrompts, setFeaturedPrompts] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  
  // Export and sharing
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'md' | 'json'>('md');
  
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

  // Load chat sessions with error handling
  useEffect(() => {
    try {
      const sessions = ChatStorage.getSessions();
      setChatSessions(sessions);
      console.log(`📚 Loaded ${sessions.length} chat sessions`);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, []);

  // Load trending prompts with enhanced categories
  useEffect(() => {
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

    loadTrendingData();
  }, []);

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

  // Handle form submission with enhanced validation
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

    // Prepare message content
    let messageText = trimmedInput;
    if (!messageText && selectedFiles.length > 0) {
      // Generate smart prompt based on file types
      const fileTypes = [...new Set(selectedFiles.map(f => getFileCategory(f)))];
      if (fileTypes.includes('image')) {
        messageText = "Please analyze and describe what you see in the uploaded images.";
      } else if (fileTypes.includes('document')) {
        messageText = "Please read and summarize the uploaded documents.";
      } else if (fileTypes.includes('audio')) {
        messageText = "Please transcribe and analyze the uploaded audio files.";
      } else if (fileTypes.includes('video')) {
        messageText = "Please analyze and describe the content of the uploaded videos.";
      } else if (fileTypes.includes('code')) {
        messageText = "Please review and explain the uploaded code files.";
      } else {
        messageText = "Please analyze the uploaded files and provide insights.";
      }
    }

    const filesToSend = [...selectedFiles];

    // Clear input and files immediately for better UX
    setInput('');
    setSelectedFiles([]);
    setShowSuggestions(false);
    setShowWelcome(false);
    setFileUploadError(null);
    setIsTyping(false);

    try {
      console.log(`📤 Sending message: "${messageText}" with ${filesToSend.length} files`);
      
      await sendMessage(messageText, filesToSend);
      
      // Enhanced session management
      if (currentSessionId) {
        // Update existing session
        const updatedMessages = [...messages, {
          id: generateId(),
          content: messageText,
          role: 'user' as const,
          timestamp: new Date()
        }];
        ChatStorage.updateSession(currentSessionId, updatedMessages);
      } else if (messages.length === 0) {
        // Create new session for first message
        const firstMessage = {
          id: generateId(),
          content: messageText,
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
      // Restore input on error
      setInput(messageText);
      setSelectedFiles(filesToSend);
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

  // Enhanced file selection with validation
  const handleFilesSelected = (files: File[]) => {
    setFileUploadError(null);
    
    // Validate total files
    const maxFiles = isAdmin ? 20 : isAuthenticated ? 15 : 10;
    if (selectedFiles.length + files.length > maxFiles) {
      setFileUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate individual files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Security check
      if (!canProcessFile(file)) {
        errors.push(`${file.name}: File type not supported for processing`);
        continue;
      }

      // Size check with dynamic limits
      const maxSize = getFileCategory(file) === 'video' ? 100 * 1024 * 1024 : 
                     getFileCategory(file) === 'audio' ? 50 * 1024 * 1024 : 
                     25 * 1024 * 1024;
      
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max ${Math.round(maxSize / (1024 * 1024))}MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setFileUploadError(errors.join(', '));
    }

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      
      console.log('📎 Files selected:', validFiles.map(f => ({ 
        name: f.name, 
        type: f.type, 
        size: formatFileSize(f.size),
        category: getFileCategory(f),
        canProcess: canProcessFile(f),
        hint: getFileProcessingHint(f)
      })));

      // Auto-focus input after file selection
      setTimeout(() => {
        if (input.length > 100 && textareaRef.current) {
          textareaRef.current.focus();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  // Remove file with animation
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileUploadError(null);
    console.log(`🗑️ Removed file at index ${index}`);
  };

  // Handle suggestion click with enhanced UX
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    setShowWelcome(false);
    if (suggestion.length > 100 && textareaRef.current) {
      textareaRef.current.focus();
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Auto-scroll to input
    setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  // Start new chat with enhanced cleanup
  const startNewChat = () => {
    clearMessages();
    setCurrentSessionId(null);
    setShowSuggestions(true);
    setShowWelcome(true);
    setSelectedFiles([]);
    setInput('');
    setIsCodeMode(false);
    setFileUploadError(null);
    setIsTyping(false);
    clearError();
    
    // Focus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    console.log('🆕 Started new chat session');
  };

  // Handle session selection with loading state
  const handleSessionSelect = async (session: ChatSession) => {
    try {
      console.log(`📖 Loading session: ${session.id}`);
      clearMessages();
      loadMessages(session.messages);
      setCurrentSessionId(session.id);
      setShowSuggestions(false);
      setShowWelcome(false);
      setSidebarOpen(false);
      setSelectedFiles([]);
      setInput('');
      
      // Scroll to bottom after loading
      setTimeout(scrollToBottom, 200);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  // Delete session with confirmation
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      ChatStorage.deleteSession(sessionId);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        startNewChat();
      }
      
      console.log(`🗑️ Deleted session: ${sessionId}`);
    }
  };

  // Enhanced logout with cleanup
  const handleLogout = () => {
    logout();
    setLogoutConfirm(false);
    startNewChat();
    setSidebarOpen(false);
    console.log('👋 User logged out');
  };

  // Export conversation functionality
  const handleExportConversation = () => {
    if (messages.length === 0) {
      alert('No messages to export');
      return;
    }

    const conversation = exportConversation();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `chat-export-${timestamp}.${exportFormat}`;
    
    let content = '';
    
    switch (exportFormat) {
      case 'txt':
        content = messages.map(msg => 
          `${msg.role.toUpperCase()}: ${msg.content}\n---\n`
        ).join('\n');
        break;
      case 'md':
        content = messages.map(msg => 
          `## ${msg.role === 'user' ? 'You' : 'AI Assistant'}\n\n${msg.content}\n\n---\n\n`
        ).join('');
        break;
      case 'json':
        content = JSON.stringify(conversation, null, 2);
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowExportDialog(false);
    console.log(`📤 Exported conversation as ${exportFormat}`);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  };

  // Handle input typing indicators
  const handleInputChange = (value: string) => {
    setInput(value);
    setIsTyping(value.length > 0);
    
    // Auto-hide welcome message when typing
    if (value.length > 0) {
      setShowWelcome(false);
    }
  };

  // Filter sessions based on search with enhanced matching
  const filteredSessions = chatSessions.filter(session => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(query) ||
      session.messages.some(msg => 
        msg.content.toLowerCase().includes(query)
      ) ||
      formatTimestamp(session.updatedAt).toLowerCase().includes(query)
    );
  });

  // Get conversation stats
  const conversationStats = getConversationSummary();

  return (
    <div 
      className={cn(
        "flex h-screen bg-background relative",
        dragActive && "bg-primary/5"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {dragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary/30 flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              <Upload className="h-16 w-16 text-primary mx-auto" />
              <div className="text-xl font-semibold text-primary">
                Drop files here to upload
              </div>
              <p className="text-sm text-muted-foreground">
                Images, documents, audio, video & code files supported
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar content */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed lg:relative top-0 left-0 z-50 w-80 h-full bg-card/95 backdrop-blur-xl border-r border-border flex flex-col shadow-2xl lg:shadow-none"
            >
              {/* Sidebar header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Logo />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">AI Assistant</span>
                      <span className="text-xs text-muted-foreground">
                        {isAuthenticated ? user?.name : 'Guest'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  onClick={startNewChat}
                  className="w-full justify-start gap-2 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg"
                  variant="default"
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
                    onChange={(e) => debouncedSearch(e.target.value)}
                    className="pl-10 h-9 bg-muted/50"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileUpload(true)}
                    className="justify-start gap-2 h-8"
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExportDialog(true)}
                    className="justify-start gap-2 h-8"
                    disabled={messages.length === 0}
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Chat sessions */}
              <ScrollArea className="flex-1 px-2">
                {filteredSessions.length > 0 ? (
                  <div className="p-2">
                    <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Recent Conversations ({filteredSessions.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredSessions.slice(0, 20).map((session) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ x: 4, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSessionSelect(session)}
                          className={cn(
                            'group p-3 rounded-xl cursor-pointer transition-all duration-200 border file-item',
                            currentSessionId === session.id
                              ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10'
                              : 'bg-muted/30 hover:bg-muted/50 border-transparent hover:border-border'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate mb-1">
                                {session.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                <span>{session.messages.length} messages</span>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>{formatTimestamp(session.updatedAt)}</span>
                              </div>
                              
                              {/* Session preview */}
                              <p className="text-xs text-muted-foreground/70 truncate mt-1">
                                {session.messages[session.messages.length - 1]?.content.slice(0, 50)}...
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {currentSessionId === session.id && (
                                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      {filteredSessions.length === 0 && searchQuery && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium mb-1">No conversations found</p>
                          <p className="text-xs">Try different keywords</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium mb-1">No conversations yet</p>
                    <p className="text-xs">Start a new chat to begin</p>
                  </div>
                )}
              </ScrollArea>

              {/* Sidebar footer */}
              <div className="p-4 border-t border-border space-y-3">
                {/* Usage stats */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Messages today</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
                        style={{ 
                          width: `${Math.max(10, (remainingQuota / (isAdmin ? 500 : isAuthenticated ? 50 : 10)) * 100)}%` 
                        }}
                      />
                    </div>
                    <span className="font-medium">{remainingQuota}</span>
                  </div>
                </div>

                {/* Settings and theme */}
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                    className="h-9 w-9 p-0"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCodeMode(!isCodeMode)}
                    className={cn(
                      "h-9 w-9 p-0",
                      isCodeMode && "bg-primary/10 text-primary"
                    )}
                    title="Toggle Code Mode"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* User info and auth */}
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {user?.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isAdmin ? 'Admin' : 'User'} • {remainingQuota} left
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoutConfirm(true)}
                      className="w-full justify-start gap-2 h-8 text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLoginOpen(true)}
                    className="w-full justify-start gap-2 h-9"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In for More Messages
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-9 w-9 p-0 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div className="hidden lg:flex items-center gap-3">
                <Logo />
                <div className="h-6 w-px bg-border" />
                <h1 className="font-semibold text-lg bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                {currentSessionId && conversationStats && (
                  <div className="text-xs text-muted-foreground">
                    {conversationStats.totalMessages} messages
                  </div>
                )}
              </div>
              
              <div className="lg:hidden">
                <Logo />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status indicators */}
              <div className="hidden sm:flex items-center gap-3">
                {/* Quota indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-xs">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    remainingQuota > 10 ? "bg-green-500" : 
                    remainingQuota > 5 ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <span className="font-medium">{remainingQuota}</span>
                  <span className="text-muted-foreground">left</span>
                </div>

                {/* Online status */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
              
              {/* Code mode toggle */}
              <Button
                variant={isCodeMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsCodeMode(!isCodeMode)}
                className="hidden md:flex h-9 gap-2"
              >
                <Code className="h-4 w-4" />
                {isCodeMode && "Code Mode"}
              </Button>

              {/* Desktop controls */}
              <div className="hidden lg:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="h-9 w-9 p-0"
                  title="Toggle Sidebar"
                >
                  <Sidebar className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="h-9 w-9 p-0"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-4 md:px-6 lg:px-8" ref={chatContainerRef}>
            <div className="max-w-4xl mx-auto py-6 space-y-6">
              {/* Enhanced Welcome Message */}
              {messages.length === 0 && showWelcome && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-8"
                >
                  {/* Hero section */}
                  <div className="space-y-4">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50"
                    >
                      <div className="h-8 w-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                          AI Assistant
                        </span>
                        <div className="text-xs text-muted-foreground">Multimodal AI Helper</div>
                      </div>
                    </motion.div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                      How can I help you today?
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                      I can analyze images, read documents, transcribe audio, explain code, and much more. 
                      Upload files or ask me anything!
                    </p>
                  </div>

                  {/* Enhanced capabilities showcase */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
                  >
                    {[
                      { icon: Image, label: 'Analyze Images', color: 'text-blue-500', desc: 'OCR, objects, scenes' },
                      { icon: FileText, label: 'Read Documents', color: 'text-green-500', desc: 'PDFs, Word, text files' },
                      { icon: Music, label: 'Process Audio', color: 'text-purple-500', desc: 'Transcribe speech' },
                      { icon: Video, label: 'Understand Video', color: 'text-red-500', desc: 'Scene analysis' },
                      { icon: Code, label: 'Review Code', color: 'text-orange-500', desc: 'Debug & optimize' },
                      { icon: FileSpreadsheet, label: 'Analyze Data', color: 'text-emerald-500', desc: 'CSV, Excel files' },
                      { icon: Globe, label: 'Web Research', color: 'text-indigo-500', desc: 'Latest information' },
                      { icon: Sparkles, label: 'Creative Tasks', color: 'text-pink-500', desc: 'Writing & ideas' }
                    ].map((capability, index) => (
                      <motion.div
                        key={capability.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="group p-4 bg-muted/30 hover:bg-muted/50 rounded-2xl border border-border/50 hover:border-border transition-all duration-200 cursor-pointer"
                        onClick={() => handleSuggestionClick(`Help me with ${capability.label.toLowerCase()}`)}
                      >
                        <capability.icon className={cn("h-8 w-8 mx-auto mb-3", capability.color)} />
                        <h3 className="font-medium text-sm mb-1">{capability.label}</h3>
                        <p className="text-xs text-muted-foreground">{capability.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Enhanced trending prompts */}
                  {!loadingTrending && (trendingPrompts.length > 0 || featuredPrompts.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="space-y-6"
                    >
                      {/* Featured multimodal prompts */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          Try These Multimodal Features
                        </h3>
                        <div className="grid gap-3 max-w-3xl mx-auto">
                          {featuredPrompts.map((prompt, index) => (
                            <motion.button
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * index }}
                              onClick={() => handleSuggestionClick(prompt)}
                              className="group p-4 text-left bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 rounded-xl border border-border/50 hover:border-border transition-all duration-200"
                            >
                              <div className="flex items-center gap-3">
                                <Sparkles className="h-4 w-4 text-primary group-hover:text-primary/80 transition-colors" />
                                <span className="text-sm font-medium">{prompt}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Trending topics */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-500" />
                          Trending Topics
                        </h3>
                        <div className="grid gap-3 max-w-3xl mx-auto">
                          {trendingPrompts.slice(0, 6).map((prompt, index) => (
                            <motion.button
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * index }}
                              onClick={() => handleSuggestionClick(prompt)}
                              className="group p-4 text-left bg-muted/50 hover:bg-muted rounded-xl border border-border/50 hover:border-border transition-all duration-200"
                            >
                              <div className="flex items-center gap-3">
                                <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-sm">{prompt}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    index={index}
                    isLastMessage={index === messages.length - 1}
                    showTimestamp={chatSettings.showTimestamps}
                    compactMode={chatSettings.compactMode}
                  />
                ))}
              </AnimatePresence>

              {/* Enhanced loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-6 bg-muted/30 rounded-2xl border border-border/50"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">AI is thinking...</span>
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
                        <div className="h-1 w-1 bg-primary rounded-full animate-bounce delay-100" />
                        <div className="h-1 w-1 bg-primary rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                    {selectedFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Processing {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}...
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Continue button */}
              {canContinue && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <ContinueButton onContinue={continueMessage} />
                </motion.div>
              )}

              {/* Enhanced error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
                >
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive mb-1">Something went wrong</p>
                    <p className="text-sm text-destructive/80">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearError}
                      className="mt-2 h-7 text-xs"
                    >
                      Try Again
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Enhanced Input Area */}
          <div className="border-t border-border bg-card/95 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto p-4">
              {/* Code Mode Indicator */}
              <AnimatePresence>
                {isCodeMode && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-3 flex items-center gap-2 text-sm bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-xl border border-orange-200 dark:border-orange-800"
                  >
                    <Code className="h-4 w-4" />
                    <span className="font-medium">Code Mode Active</span>
                    <span className="text-xs opacity-70">- Optimized for programming tasks</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCodeMode(false)}
                      className="h-5 w-5 p-0 hover:bg-orange-200/50 dark:hover:bg-orange-800/50 ml-auto"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced File Attachments Display */}
              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} attached
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>•</span>
                          <span>{formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))} total</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFiles([])}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedFiles.map((file, index) => (
                        <motion.div
                          key={`${file.name}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="group flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted border border-border/50 hover:border-border rounded-xl transition-all duration-200"
                        >
                          <div className="flex-shrink-0">
                            {getFileIcon(file)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full border font-semibold",
                                getFileColor(file)
                              )}>
                                {getFileTypeLabel(file)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span className="truncate">{file.type || 'Unknown'}</span>
                            </div>
                            {canProcessFile(file) && (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600 dark:text-green-400">Ready for AI analysis</span>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
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

              {/* Main Input Form */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-3">
                  {/* File Upload Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="h-12 w-12 rounded-xl hover:bg-muted shrink-0 group relative"
                    title="Attach files (images, documents, audio, video, code)"
                  >
                    <div className="relative">
                      <Paperclip className="h-4 w-4 transition-transform group-hover:rotate-12" />
                      {selectedFiles.length > 0 && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                          {selectedFiles.length}
                        </div>
                      )}
                    </div>
                  </Button>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.json,.csv,.md,.html,.js,.ts,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.swift,.kt"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(Array.from(e.target.files));
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Enhanced Text Input */}
                  <div className="flex-1 relative">
                    <div className="relative">
                      {input.length > 100 ? (
                        // Textarea for longer input
                        <Textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder={
                            !isAuthenticated && remainingQuota <= 0
                              ? 'Sign in to continue chatting...'
                              : isCodeMode
                              ? 'Describe the code you want help with...'
                              : selectedFiles.length > 0
                              ? 'Ask about your uploaded files...'
                              : 'Ask me anything or upload files to analyze...'
                          }
                          disabled={isLoading || (!isAuthenticated && remainingQuota <= 0)}
                          className="min-h-12 max-h-32 py-3 pr-12 resize-none border-border/50 focus:border-primary/50 bg-background/50 rounded-xl"
                          rows={Math.min(5, Math.max(1, input.split('\n').length))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                        />
                      ) : (
                        // Input for shorter text
                        <Input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder={
                            !isAuthenticated && remainingQuota <= 0
                              ? 'Sign in to continue chatting...'
                              : isCodeMode
                              ? 'Ask for code help, debugging, or explanations...'
                              : selectedFiles.length > 0
                              ? 'Ask about your uploaded files...'
                              : 'Ask me anything or upload files to analyze...'
                          }
                          disabled={isLoading || (!isAuthenticated && remainingQuota <= 0)}
                          className="h-12 pr-12 border-border/50 focus:border-primary/50 bg-background/50 rounded-xl"
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

                  {/* Enhanced Send Button */}
                  <Button
                    type="submit"
                    disabled={
                      isLoading || 
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

                {/* Enhanced Input Footer */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      {!isAuthenticated && remainingQuota <= 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          ⚠️ Sign in to continue
                        </span>
                      ) : (
                        `${remainingQuota} messages remaining`
                      )}
                    </span>
                    
                    {selectedFiles.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} • 
                        {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                      </span>
                    )}
                    
                    {isCodeMode && (
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <Code className="h-3 w-3" />
                        Code mode active
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline">
                      {input.length > 100 ? 'Shift + Enter for new line' : 'Press Enter to send'}
                    </span>
                    
                    {/* Supported file type indicators */}
                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity" title="Supported file types">
                      <Image className="h-3 w-3" />
                      <FileText className="h-3 w-3" />
                      <Music className="h-3 w-3" />
                      <Video className="h-3 w-3" />
                      <Code className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </form>

              {/* Usage Warning */}
              {!isAuthenticated && remainingQuota <= 3 && remainingQuota > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      Only {remainingQuota} free messages left today.
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setLoginOpen(true)}
                      className="p-0 h-auto text-sm underline text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                    >
                      Sign in for more
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Footer Attribution */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  AI Assistant can make mistakes. Please verify important information.
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                    className="p-0 h-auto text-xs underline ml-1"
                  >
                    Privacy & Terms
                  </Button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Dialogs */}
      <SettingsDialog 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      
      <LoginForm 
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />

      {/* Enhanced Logout Confirmation */}
      <AnimatePresence>
        {logoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <LogOut className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to sign out? Your current conversation will be saved.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setLogoutConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="flex-1"
                  >
                    Sign Out
                  </Button>
                </div>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Conversation
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExportDialog(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Export your conversation in your preferred format. 
                  {conversationStats && (
                    <span className="block mt-1 font-medium">
                      {conversationStats.totalMessages} messages to export
                    </span>
                  )}
                </p>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Choose format:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { format: 'txt' as const, label: 'Text', desc: 'Plain text' },
                      { format: 'md' as const, label: 'Markdown', desc: 'Formatted' },
                      { format: 'json' as const, label: 'JSON', desc: 'Data format' }
                    ].map(({ format, label, desc }) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-all",
                          exportFormat === format
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium text-sm">{label}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExportConversation}
                    className="flex-1"
                    disabled={messages.length === 0}
                  >
                    Export
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Upload Dialog */}
      <AnimatePresence>
        {showFileUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFileUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Files
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileUpload(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  selectedFiles={selectedFiles}
                  onRemoveFile={removeFile}
                  maxFiles={isAdmin ? 20 : isAuthenticated ? 15 : 10}
                  maxSize={100}
                />
                
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowFileUpload(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowFileUpload(false)}
                    disabled={selectedFiles.length === 0}
                  >
                    Done ({selectedFiles.length} files)
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