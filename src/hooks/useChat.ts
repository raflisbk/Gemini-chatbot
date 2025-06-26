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
  isIncomplete?: boolean;  // NEW: Add this to interface
  error?: string;
  remainingTokens?: number;
}

export function useChat() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  
  // NEW: Add continue states
  const [canContinue, setCanContinue] = useState(false);
  const [lastIncompleteMessage, setLastIncompleteMessage] = useState<string | null>(null);
  const [incompleteMessageId, setIncompleteMessageId] = useState<string | null>(null);
  
  const conversationMemory = useRef<Message[]>([]);

  // NEW: Function to detect incomplete responses
  const detectIncompleteResponse = useCallback((response: string): boolean => {
    if (!response || typeof response !== 'string') return false;
    
    const text = response.trim();
    
    // Check for common indicators of incomplete responses
    const incompleteIndicators = [
      /[^.!?]\s*$/, // Response cuts off mid-sentence
      /```[^`]*$/, // Unfinished code blocks
      /^\d+\.\s+[^.!?]*$/m, // Incomplete numbered lists
      /^[-*]\s+[^.!?]*$/m, // Incomplete bullet points
    ];

    // Very long responses are more likely to be cut off
    const isVeryLong = text.length > 3000;
    
    // Check for incomplete indicators
    const hasIncompleteIndicators = incompleteIndicators.some(pattern => pattern.test(text));
    
    // Additional heuristics
    const endsAbruptly = !text.match(/[.!?]$/);
    const hasUnfinishedCode = text.includes('```') && (text.match(/```/g) || []).length % 2 !== 0;
    
    return isVeryLong && (hasIncompleteIndicators || endsAbruptly || hasUnfinishedCode);
  }, []);

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
      if (['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'].includes(mimeType)) {
        return 'image';
      }
    }
    
    if (mimeType.startsWith('audio/')) {
      if (['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'].includes(mimeType)) {
        return 'audio';
      }
    }
    
    if (mimeType.startsWith('video/')) {
      if (['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/mkv'].includes(mimeType)) {
        return 'video';
      }
    }
    
    const documentTypes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/json', 'text/markdown', 'text/html', 'text/xml', 'application/rtf'
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
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Build conversation context for API
  const buildConversationContext = useCallback(() => {
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

  // MODIFIED: Enhanced sendMessage with continue detection
  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    let attachments: FileAttachment[] = [];
    
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

    conversationMemory.current.push(userMessage);

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    // Reset continue state
    setCanContinue(false);
    setLastIncompleteMessage(null);
    setIncompleteMessageId(null);

    try {
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

      const responseText = data.message || '';
      
      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        content: responseText,
        role: 'assistant',
        timestamp: new Date(),
      };

      conversationMemory.current.push(assistantMessage);

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));

      // NEW: Check if response is incomplete
      const isIncomplete = data.isIncomplete || detectIncompleteResponse(responseText);
      
      if (isIncomplete) {
        setCanContinue(true);
        setLastIncompleteMessage(responseText);
        setIncompleteMessageId(assistantMessage.id);
        console.log('🔄 Response detected as incomplete, Continue button will show');
      }

    } catch (error) {
      console.error('Chat error:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      }));
    }
  }, [processFileAttachments, buildConversationContext, detectIncompleteResponse]);

  // NEW: Continue incomplete message
  const continueMessage = useCallback(async () => {
    if (!canContinue || !lastIncompleteMessage || !incompleteMessageId) {
      console.warn('Cannot continue: missing required state');
      return;
    }

    console.log('🔄 Continuing message...');

    setChatState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Smart continuation prompt
      let continuationPrompt = 'Please continue your previous response exactly where you left off.';
      
      if (lastIncompleteMessage.includes('```')) {
        continuationPrompt = 'Please continue the previous response, completing any unfinished code blocks.';
      } else if (lastIncompleteMessage.match(/^\d+\./m)) {
        continuationPrompt = 'Please continue the previous numbered list from where it was cut off.';
      } else if (lastIncompleteMessage.match(/^[-*]/m)) {
        continuationPrompt = 'Please continue the previous bullet points from where it was interrupted.';
      }

      const payload = {
        message: continuationPrompt,
        attachments: [],
        conversationContext: buildConversationContext(),
        continueFrom: lastIncompleteMessage,
        isContination: true
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

      const continuedText = data.message || '';

      // Update the last assistant message with continued content
      setChatState(prev => {
        const messages = [...prev.messages];
        const messageIndex = messages.findIndex(msg => msg.id === incompleteMessageId);
        
        if (messageIndex !== -1) {
          const updatedContent = messages[messageIndex].content + continuedText;
          messages[messageIndex] = {
            ...messages[messageIndex],
            content: updatedContent
          };
          
          // Update conversation memory as well
          const memoryIndex = conversationMemory.current.findIndex(msg => msg.id === incompleteMessageId);
          if (memoryIndex !== -1) {
            conversationMemory.current[memoryIndex].content = updatedContent;
          }

          // Check if still incomplete
          const stillIncomplete = data.isIncomplete || detectIncompleteResponse(updatedContent);
          
          if (stillIncomplete) {
            setLastIncompleteMessage(updatedContent);
            console.log('🔄 Response still incomplete, Continue button remains');
          } else {
            setCanContinue(false);
            setLastIncompleteMessage(null);
            setIncompleteMessageId(null);
            console.log('✅ Response complete, Continue button hidden');
          }
        }

        return {
          ...prev,
          messages,
          isLoading: false,
        };
      });

    } catch (error) {
      console.error('Continue error:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to continue response',
      }));
    }
  }, [canContinue, lastIncompleteMessage, incompleteMessageId, buildConversationContext, detectIncompleteResponse]);

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
    setIncompleteMessageId(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null }));
  }, []);

  // Load messages from storage
  const loadMessages = useCallback((messages: Message[]) => {
    if (!Array.isArray(messages)) {
      console.error('loadMessages: Invalid messages array');
      return;
    }

    const validMessages = messages.filter(msg => {
      if (!validateMessage(msg)) {
        console.warn('Invalid message filtered out:', msg);
        return false;
      }
      return true;
    }).map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
    }));

    setChatState(prev => ({
      ...prev,
      messages: validMessages,
      isLoading: false,
      error: null
    }));

    conversationMemory.current = [...validMessages];
    
    // Reset continue state when loading existing session
    setCanContinue(false);
    setLastIncompleteMessage(null);
    setIncompleteMessageId(null);

    console.log('Messages loaded successfully:', validMessages.length);
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
      version: '1.0'
    };
  }, [getConversationSummary]);

  // Import conversation
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

  // IMPORTANT: Export the continue states and functions
  return {
    // Core state
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    error: chatState.error,
    canContinue,        // NEW: Export continue state
    
    // Core actions
    sendMessage,
    continueMessage,    // NEW: Export continue function
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