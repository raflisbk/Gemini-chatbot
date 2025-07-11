// src/components/index.ts - Updated component exports with FIXED imports

// Main Chat Components
export { ChatBot } from './ChatBot';
export { ChatMessage } from './ChatMessage';
export { LoadingDots } from './LoadingDots';

// Enhanced Components
export { CompactSettingsDialog } from './SettingsDialog';
export { 
  VoiceInput, 
  SpeechButton 
} from './VoiceInput';

// FIXED: Export FixedChatSidebar properly
export { default as FixedChatSidebar } from './ChatSidebar';

// FIXED: Use default export/import for MultimodalUpload
export { default as MultimodalUpload } from './MultimodalUpload';

export { 
  ContinueButton, 
  MessageWithContinue, 
  useMessageContinuation 
} from './ContinueButton';

// Layout Components
export { EnhancedNavbar } from './EnhancedNavbar';
export { TrendingCards } from './TrendingCards';

// FIXED: Logo with both default and named exports
export { default as Logo } from './Logo'; // Default export
export { Logo as LogoComponent } from './Logo'; // Named export (alternative)

export { ThemeToggle } from './ThemeToggle';

// Enhanced Components (New)
export { default as EnhancedTextarea } from './EnhancedTextarea';
export { default as SmartFileUpload } from './FileUpload';

// Legacy Components (if still needed)
export { LoginDialog } from './LoginDialog';

// UI Components Re-exports
export * from './ui/button';
export * from './ui/input';
export * from './ui/textarea';
export * from './ui/card';
export * from './ui/badge';
export * from './ui/alert';
export * from './ui/scroll-area';
export * from './ui/dialog';
export * from './ui/dropdown-menu';
export * from './ui/select';
export * from './ui/slider';
export * from './ui/switch';
export * from './ui/tabs';
export * from './ui/label';
export * from './ui/progress';
export * from './ui/tooltip';
export * from './ui/separator';

// Types exports
export type {
  Message,
  FileAttachment,
  ChatSession,
  BrowserSupport
} from '../types/chat';

export type {
  ModelSettings,
  ChatSettings,
  AppearanceSettings,
  VoiceSettings,
  PrivacySettings
} from '../types/settings';