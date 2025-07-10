// src/types/chat.ts - Unified chat-related types

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: FileAttachment[];
  metadata?: Record<string, any>;
  sessionId?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
  base64: string;
  url?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string;
  context_summary?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface BrowserSupport {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  microphone: boolean;
  browserName: string;
  browserVersion?: string;
  isSupported: boolean;
  warnings?: string[];
}

export interface VoiceInputState {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error: string | null;
}

export interface VoiceInputActions {
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  resetError: () => void;
}

export type VoiceInputHook = VoiceInputState & VoiceInputActions;

export interface SpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}

export interface SpeechActions {
  speak: (text: string, config?: SpeechConfig) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

export type SpeechHook = SpeechState & SpeechActions;

export interface SpeechConfig {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export interface FileUpload {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string | null;
}

export interface SendMessageOptions {
  files?: File[];
  sessionId?: string;
  continueFrom?: string;
  systemMessage?: string;
  settings?: Record<string, any>;
}

export interface ChatState {
  messages: Message[];
  currentSessionId: string | null;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  canContinue: boolean;
}

export interface ChatActions {
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  continueMessage: () => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearMessages: () => void;
  loadMessages: (messages: Message[], sessionId?: string) => void;
}

export type ChatHook = ChatState & ChatActions;

export interface ChatResponse {
  success: boolean;
  response: string;
  sessionId?: string;
  messageId?: string;
  canContinue?: boolean;
  responseAnalysis?: Record<string, any>;
  usage?: {
    messageCount: number;
    remainingQuota: number;
    tokensUsed: number;
  };
  metadata?: {
    model: string;
    temperature: number;
    processingTime: number;
    attachmentCount: number;
    wasContinuation?: boolean;
  };
  error?: string;
  errorType?: string;
}

export interface TrendingTopic {
  title: string;
  category: string;
  source: string;
  prompt: string;
  icon?: string;
  color?: string;
}

// Utility types for better TypeScript support
export type MessageRole = Message['role'];
export type FileStatus = FileUpload['status'];
export type BrowserName = 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Unknown';

// Error types for better error handling
export interface ChatError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface VoiceError extends ChatError {
  errorType: 'permission' | 'network' | 'browser' | 'hardware' | 'unknown';
}

export interface FileError extends ChatError {
  fileName: string;
  fileSize: number;
  errorType: 'size' | 'type' | 'network' | 'processing' | 'unknown';
}

// Constants for validation
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES_PER_MESSAGE = 10;
export const SUPPORTED_FILE_TYPES = [
  'image/*',
  'audio/*',
  'video/*',
  'application/pdf',
  'text/*',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.json',
  '.csv'
];

export const VOICE_LANGUAGES = [
  { code: 'id-ID', name: 'Bahasa Indonesia' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'zh-CN', name: '中文 (简体)' },
] as const;

export type VoiceLanguageCode = typeof VOICE_LANGUAGES[number]['code'];

// Helper functions for type checking
export const isUserMessage = (message: Message): boolean => message.role === 'user';
export const isAssistantMessage = (message: Message): boolean => message.role === 'assistant';
export const hasAttachments = (message: Message): boolean => !!message.attachments && message.attachments.length > 0;
export const isFileUploadComplete = (upload: FileUpload): boolean => upload.status === 'completed';
export const isFileUploadError = (upload: FileUpload): boolean => upload.status === 'error';