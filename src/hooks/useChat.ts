import { useState, useCallback } from 'react';
import { Message, ChatState } from '@/lib/types';
import { generateId } from '@/lib/utils';

export function useChat() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));

    } catch (error) {
      console.error('Chat error:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setChatState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    error: chatState.error,
    sendMessage,
    clearMessages,
    clearError,
  };
}