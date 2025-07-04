// src/types/chatbot.ts - COMPATIBILITY TYPES FOR CHATBOT.TSX
// This file provides type definitions specifically for ChatBot.tsx compatibility

export interface ChatBotSession {
  id: string;
  user_id: string | null;
  title: string;
  message_count: number;
  last_message_at: string | null;
  context_summary: string | null;
  settings: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updatedAt: string; // For compatibility
  messages?: ChatBotMessage[]; // Added for ChatBot.tsx
}

export interface ChatBotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date; // Date type for ChatBot compatibility
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  isActive: boolean;
}

// Utility type converters
export function convertStoredSessionToChatSession(stored: SessionSummary): ChatBotSession {
  return {
    id: stored.id,
    user_id: null,
    title: stored.title,
    message_count: stored.messageCount,
    last_message_at: stored.timestamp,
    context_summary: stored.lastMessage,
    settings: {},
    is_active: stored.isActive,
    created_at: stored.timestamp,
    updated_at: stored.timestamp,
    updatedAt: stored.timestamp,
    messages: []
  };
}

export function convertMessageWithFilesToChatBotMessage(msg: {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: any[];
  tokens_used?: number;
  model_used?: string;
}): ChatBotMessage {
  return {
    ...msg,
    timestamp: new Date(msg.timestamp)
  };
}