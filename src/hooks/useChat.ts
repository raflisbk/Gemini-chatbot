// src/hooks/useChat.ts - Enhanced Version with existing features preserved
import { useState, useCallback, useRef, useEffect } from 'react';
import { generateId } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: FileAttachment[];
  metadata?: {
    model?: string;
    temperature?: number;
    processingTime?: number;
    tokenCount?: number;
    isComplete?: boolean;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  mimeType?: string;
  base64?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  canContinue: boolean;
  currentSessionId: string | null;
}

export interface SendMessageOptions {
  files?: File[];
  continueFrom?: string;
  sessionId?: string;
  settings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface UseChatOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  maxRetries?: number;
  retryDelay?: number;
}

export function useChat(options: UseChatOptions = {}) {
  const {
    onError,
    onSuccess,
    onTypingChange,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  // FIXED: Get auth context for proper authentication
  const { user, isGuest, getAuthToken } = useAuth();

  // Core state
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isTyping: false,
    error: null,
    canContinue: false,
    currentSessionId: null
  });

  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  
  // Conversation memory for context
  const conversationMemory = useRef<Message[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update typing state callback
  useEffect(() => {
    onTypingChange?.(chatState.isTyping);
  }, [chatState.isTyping, onTypingChange]);

  // File processing utility
  const processFileAttachments = useCallback(async (files: File[]): Promise<FileAttachment[]> => {
    const attachments: FileAttachment[] = [];

    for (const file of files) {
      try {
        // Validate file
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          throw new Error(`File ${file.name} is too large (max 50MB)`);
        }

        // Convert to base64 for API
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
          url: URL.createObjectURL(file) // For client-side preview
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        throw error;
      }
    }

    return attachments;
  }, []);

  // Build conversation context for API
  const buildConversationContext = useCallback(() => {
    const contextMessages = conversationMemory.current.slice(-10); // Last 10 messages
    return contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
  }, []);

  // Enhanced send message function
  const sendMessage = useCallback(async (
    content: string, 
    options: SendMessageOptions = {}
  ): Promise<void> => {
    if (!content.trim() && (!options.files || options.files.length === 0)) {
      throw new Error('Message content or files required');
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setChatState(prev => ({
      ...prev,
      isLoading: true,
      isTyping: true,
      error: null
    }));

    setRetryCount(0);

    try {
      // Process file attachments
      let attachments: FileAttachment[] = [];
      if (options.files && options.files.length > 0) {
        attachments = await processFileAttachments(options.files);
      }

      // Create user message
      const userMessage: Message = {
        id: generateId(),
        content: content.trim(),
        role: 'user',
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined
      };

      // Add to conversation memory and state
      conversationMemory.current.push(userMessage);
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage]
      }));

      // FIXED: Prepare API payload with enhanced structure
      const payload = {
        message: content.trim(),
        sessionId: options.sessionId || chatState.currentSessionId,
        attachments: attachments.map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          mimeType: att.mimeType,
          size: att.size,
          base64: att.base64
        })),
        settings: {
          model: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 4096,
          ...options.settings
        },
        // FIXED: Add authentication fields
        userId: user?.id,
        isGuest: isGuest || !user
      };

      // FIXED: Enhanced authentication headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add auth token for authenticated users
      if (user && !isGuest) {
        try {
          const token = await getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
      }

      // Make API request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
          case 400:
            throw new Error(errorData.error || 'Invalid request format');
          case 401:
            throw new Error('Authentication required. Please login.');
          case 429:
            throw new Error(errorData.error || 'Rate limit exceeded. Please try again later.');
          case 503:
            throw new Error('Service temporarily unavailable. Please try again.');
          default:
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response from AI');
      }

      // FIXED: Create AI response message with enhanced metadata
      const aiMessage: Message = {
        id: data.messageId || generateId(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          model: data.metadata?.model || payload.settings.model,
          temperature: data.metadata?.temperature || payload.settings.temperature,
          processingTime: data.metadata?.processingTime,
          tokenCount: data.usage?.tokensUsed,
          isComplete: !data.response.endsWith('...')
        }
      };

      // Update conversation memory and state
      conversationMemory.current.push(aiMessage);
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        currentSessionId: data.sessionId || prev.currentSessionId,
        canContinue: !aiMessage.metadata?.isComplete
      }));

      // Success callback
      onSuccess?.(data.response);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't update error state
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      
      setChatState(prev => ({
        ...prev,
        error: errorMessage
      }));

      onError?.(errorMessage);
      throw error; // Re-throw for component handling
    } finally {
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        isTyping: false
      }));
      abortControllerRef.current = null;
    }
  }, [
    chatState.currentSessionId, 
    user, 
    isGuest, 
    getAuthToken,
    processFileAttachments, 
    buildConversationContext, 
    onSuccess, 
    onError
  ]);

  // Continue message function
  const continueMessage = useCallback(async (): Promise<void> => {
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'assistant' || !chatState.canContinue) {
      throw new Error('Cannot continue message');
    }

    await sendMessage('Please continue your previous response.', {
      continueFrom: lastMessage.content,
      sessionId: chatState.currentSessionId ?? undefined
    });
  }, [chatState.messages, chatState.canContinue, chatState.currentSessionId, sendMessage]);

  // Retry last message
  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (retryCount >= maxRetries) {
      throw new Error(`Maximum retry attempts (${maxRetries}) exceeded`);
    }

    const userMessages = chatState.messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    if (!lastUserMessage) {
      throw new Error('No user message to retry');
    }

    setRetryCount(prev => prev + 1);

    // Wait before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    // Remove the last AI response if it exists
    const newMessages = chatState.messages.filter(msg => 
      !(msg.role === 'assistant' && msg.timestamp > lastUserMessage.timestamp)
    );

    setChatState(prev => ({
      ...prev,
      messages: newMessages
    }));

    // Update conversation memory
    conversationMemory.current = [...newMessages];

    // Retry the message
    await sendMessage(lastUserMessage.content, {
      files: lastUserMessage.attachments?.map(att => {
        // Convert back to File object if possible
        try {
          const blob = new Blob([''], { type: att.type });
          return new File([blob], att.name, { type: att.type });
        } catch (error) {
          console.error('Error converting attachment back to file:', error);
          return null;
        }
      }).filter(Boolean) as File[],
      sessionId: chatState.currentSessionId ?? undefined
    });
  }, [retryCount, maxRetries, retryDelay, chatState.messages, chatState.currentSessionId, sendMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      messages: [],
      error: null,
      canContinue: false
    }));
    conversationMemory.current = [];
    setRetryCount(0);
  }, []);

  // Load messages from storage/session
  const loadMessages = useCallback((messages: Message[], sessionId?: string) => {
    if (!Array.isArray(messages)) {
      console.error('loadMessages: Invalid messages array');
      return;
    }

    const validMessages = messages.filter(msg => {
      return (
        msg &&
        typeof msg === 'object' &&
        typeof msg.id === 'string' &&
        typeof msg.content === 'string' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        (msg.timestamp instanceof Date || typeof msg.timestamp === 'string')
      );
    }).map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
    }));

    setChatState(prev => ({
      ...prev,
      messages: validMessages,
      currentSessionId: sessionId || null,
      error: null,
      canContinue: validMessages.length > 0 && 
                  validMessages[validMessages.length - 1]?.role === 'assistant' &&
                  !validMessages[validMessages.length - 1]?.metadata?.isComplete
    }));

    conversationMemory.current = [...validMessages];
    setRetryCount(0);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Cancel current request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        isTyping: false
      }));
    }
  }, []);

  // Get conversation summary
  const getConversationSummary = useCallback(() => {
    if (conversationMemory.current.length === 0) return null;
    
    const userMessages = conversationMemory.current.filter(msg => msg.role === 'user');
    const assistantMessages = conversationMemory.current.filter(msg => msg.role === 'assistant');
    
    return {
      totalMessages: conversationMemory.current.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      firstMessage: conversationMemory.current[0],
      lastMessage: conversationMemory.current[conversationMemory.current.length - 1],
      createdAt: conversationMemory.current[0]?.timestamp,
      updatedAt: conversationMemory.current[conversationMemory.current.length - 1]?.timestamp
    };
  }, []);

  // Export conversation
  const exportConversation = useCallback(() => {
    return {
      messages: conversationMemory.current,
      summary: getConversationSummary(),
      exportedAt: new Date(),
      version: '2.0'
    };
  }, [getConversationSummary]);

  // FIXED: Enhanced message search functionality
  const searchMessages = useCallback((query: string): Message[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    return conversationMemory.current.filter(msg => 
      msg.content.toLowerCase().includes(searchTerm) ||
      msg.attachments?.some(att => att.name.toLowerCase().includes(searchTerm))
    );
  }, []);

  // FIXED: Get message statistics
  const getMessageStats = useCallback(() => {
    const messages = conversationMemory.current;
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const totalAttachments = messages.reduce((sum, msg) => sum + (msg.attachments?.length || 0), 0);
    
    return {
      totalMessages: messages.length,
      totalCharacters: totalChars,
      totalAttachments,
      averageMessageLength: messages.length > 0 ? Math.round(totalChars / messages.length) : 0,
      userMessages: messages.filter(msg => msg.role === 'user').length,
      assistantMessages: messages.filter(msg => msg.role === 'assistant').length
    };
  }, []);

  // FIXED: Update session ID
  const updateSessionId = useCallback((sessionId: string | null) => {
    setChatState(prev => ({
      ...prev,
      currentSessionId: sessionId
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    isTyping: chatState.isTyping,
    error: chatState.error,
    canContinue: chatState.canContinue,
    currentSessionId: chatState.currentSessionId,
    retryCount,
    
    // Actions
    sendMessage,
    continueMessage,
    retryLastMessage,
    clearMessages,
    loadMessages,
    clearError,
    cancelRequest,
    updateSessionId,
    
    // Utilities
    getConversationSummary,
    exportConversation,
    processFileAttachments,
    searchMessages,
    getMessageStats,
    
    // Computed values
    canRetry: retryCount < maxRetries,
    conversationLength: chatState.messages.length,
    hasMessages: chatState.messages.length > 0,
    lastMessage: chatState.messages[chatState.messages.length - 1] || null
  };
}