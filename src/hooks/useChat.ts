import { useState, useCallback, useRef } from 'react';
import { Message, ChatState } from '@/lib/types';
import { generateId } from '@/lib/utils';

interface FileAttachment {
  file: File;
  type: 'image' | 'document' | 'audio' | 'video' | 'other';
  base64?: string;
  mimeType: string;
}

interface ChatResponse {
  success: boolean;
  message?: string;
  isIncomplete?: boolean;
  error?: string;
  remainingTokens?: number;
}

export function useChat() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  
  const [canContinue, setCanContinue] = useState(false);
  const [lastIncompleteMessage, setLastIncompleteMessage] = useState<string | null>(null);
  const conversationMemory = useRef<Message[]>([]);

  // Validate and process file attachments
  const processFileAttachments = useCallback(async (files: File[]): Promise<FileAttachment[]> => {
    const attachments: FileAttachment[] = [];
    
    for (const file of files) {
      const attachment: FileAttachment = {
        file,
        type: getFileType(file),
        mimeType: file.type || 'application/octet-stream'
      };

      // Convert to base64 for images and supported formats
      if (attachment.type === 'image' || isTextFile(file) || isAudioFile(file)) {
        try {
          attachment.base64 = await fileToBase64(file);
        } catch (error) {
          console.error('Error converting file to base64:', error);
        }
      }

      attachments.push(attachment);
    }
    
    return attachments;
  }, []);

  // Get file type based on MIME type
  const getFileType = (file: File): FileAttachment['type'] => {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      // Support common image formats
      if (['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'].includes(mimeType)) {
        return 'image';
      }
    }
    
    if (mimeType.startsWith('audio/')) {
      // Support common audio formats
      if (['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'].includes(mimeType)) {
        return 'audio';
      }
    }
    
    if (mimeType.startsWith('video/')) {
      // Support common video formats
      if (['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/mkv'].includes(mimeType)) {
        return 'video';
      }
    }
    
    // Document types
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/json',
      'text/markdown',
      'text/html',
      'text/xml',
      'application/rtf'
    ];
    
    if (documentTypes.includes(mimeType)) {
      return 'document';
    }
    
    return 'other';
  };

  const isTextFile = (file: File): boolean => {
    const textTypes = ['text/plain', 'text/csv', 'application/json', 'text/markdown', 'text/html', 'text/xml'];
    return textTypes.includes(file.type.toLowerCase());
  };

  const isAudioFile = (file: File): boolean => {
    return file.type.toLowerCase().startsWith('audio/');
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Build conversation context for API
  const buildConversationContext = useCallback(() => {
    // Include last 10 messages for context while managing token usage
    const contextMessages = conversationMemory.current.slice(-10);
    return contextMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }, []);

  // Validate message structure
  const validateMessage = (message: any): message is Message => {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      typeof message.content === 'string' &&
      (message.role === 'user' || message.role === 'assistant') &&
      (message.timestamp instanceof Date || typeof message.timestamp === 'string')
    );
  };

  // Send message with file attachments and memory
  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    let attachments: FileAttachment[] = [];
    
    // Process file attachments if provided
    if (files && files.length > 0) {
      try {
        attachments = await processFileAttachments(files);
      } catch (error) {
        console.error('Error processing file attachments:', error);
        setChatState(prev => ({
          ...prev,
          error: 'Failed to process file attachments'
        }));
        return;
      }
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    // Add to conversation memory
    conversationMemory.current.push(userMessage);

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    setCanContinue(false);
    setLastIncompleteMessage(null);

    try {
      // Prepare API payload with conversation context
      const payload = {
        message: content.trim(),
        attachments: attachments.map(att => ({
          type: att.type,
          mimeType: att.mimeType,
          fileName: att.file.name,
          fileSize: att.file.size,
          base64: att.base64
        })),
        conversationContext: buildConversationContext(),
        continueFrom: null
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('Token quota exceeded. Please upgrade your plan.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        content: data.message || '',
        role: 'assistant',
        timestamp: new Date(),
      };

      // Add to conversation memory
      conversationMemory.current.push(assistantMessage);

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));

      // Check if response is incomplete (token limit reached)
      if (data.isIncomplete) {
        setCanContinue(true);
        setLastIncompleteMessage(data.message || '');
      }

    } catch (error) {
      console.error('Chat error:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      }));
    }
  }, [processFileAttachments, buildConversationContext]);

  // Continue incomplete message
  const continueMessage = useCallback(async () => {
    if (!canContinue || !lastIncompleteMessage) return;

    setChatState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const payload = {
        message: 'Please continue your previous response.',
        attachments: [],
        conversationContext: buildConversationContext(),
        continueFrom: lastIncompleteMessage
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to continue response');
      }

      // Update the last assistant message with continued content
      setChatState(prev => {
        const messages = [...prev.messages];
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += data.message || '';
          
          // Update conversation memory as well
          const memoryIndex = conversationMemory.current.findIndex(msg => msg.id === lastMessage.id);
          if (memoryIndex !== -1) {
            conversationMemory.current[memoryIndex].content = lastMessage.content;
          }
        }

        return {
          ...prev,
          messages,
          isLoading: false,
        };
      });

      // Check if still incomplete
      if (data.isIncomplete) {
        setLastIncompleteMessage(lastIncompleteMessage + (data.message || ''));
      } else {
        setCanContinue(false);
        setLastIncompleteMessage(null);
      }

    } catch (error) {
      console.error('Continue error:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to continue response',
      }));
    }
  }, [canContinue, lastIncompleteMessage, buildConversationContext]);

  // Clear messages and reset memory
  const clearMessages = useCallback(() => {
    setChatState({
      messages: [],
      isLoading: false,
      error: null,
    });
    conversationMemory.current = [];
    setCanContinue(false);
    setLastIncompleteMessage(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null }));
  }, []);

  // Load messages from storage (with memory restoration) - FIXED VERSION
  const loadMessages = useCallback((messages: Message[]) => {
    // Validasi input messages
    if (!Array.isArray(messages)) {
      console.error('loadMessages: Invalid messages array');
      return;
    }

    // Filter dan validasi setiap message
    const validMessages = messages.filter(msg => {
      if (!validateMessage(msg)) {
        console.warn('Invalid message filtered out:', msg);
        return false;
      }
      return true;
    }).map(msg => ({
      ...msg,
      // Ensure timestamp is a Date object
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
    }));

    // Set state dengan messages yang valid
    setChatState(prev => ({
      ...prev,
      messages: validMessages,
      isLoading: false,
      error: null
    }));

    // Update conversation memory untuk context
    conversationMemory.current = [...validMessages];

    // Reset continue state karena kita load session yang sudah ada
    setCanContinue(false);
    setLastIncompleteMessage(null);

    console.log('Messages loaded successfully:', validMessages.length);
  }, []);

  // Get conversation summary for session management
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

  // Export conversation for backup/sharing
  const exportConversation = useCallback(() => {
    return {
      messages: conversationMemory.current,
      summary: getConversationSummary(),
      exportedAt: new Date(),
      version: '1.0'
    };
  }, [getConversationSummary]);

  // Import conversation from backup
  const importConversation = useCallback((conversationData: any) => {
    try {
      if (conversationData && Array.isArray(conversationData.messages)) {
        loadMessages(conversationData.messages);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing conversation:', error);
      return false;
    }
  }, [loadMessages]);

  // Get current conversation state
  const getConversationState = useCallback(() => {
    return {
      messages: chatState.messages,
      isLoading: chatState.isLoading,
      error: chatState.error,
      canContinue,
      messageCount: chatState.messages.length,
      hasConversation: chatState.messages.length > 0,
      conversationMemory: conversationMemory.current,
      summary: getConversationSummary()
    };
  }, [chatState, canContinue, getConversationSummary]);

  return {
    // Core state
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    error: chatState.error,
    canContinue,
    
    // Core actions
    sendMessage,
    continueMessage,
    clearMessages,
    clearError,
    loadMessages,
    
    // Advanced features
    getConversationSummary,
    getConversationState,
    exportConversation,
    importConversation,
    
    // Utility functions
    validateMessage,
    processFileAttachments
  };
}