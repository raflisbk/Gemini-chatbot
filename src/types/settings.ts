// src/types/settings.ts
// Unified Settings Types - Fix untuk error TypeScript

export interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  systemPrompt: string;
  useStreaming: boolean;
}

export interface ChatSettings {
  autoSave: boolean;
  showTimestamps: boolean;
  enableSounds: boolean;
  compactMode: boolean;
  autoScroll: boolean;
  markdownEnabled: boolean;
  maxHistoryLength: number;
  language: string;
}

// ✅ UNIFIED AppearanceSettings - Menggabungkan semua property yang dibutuhkan
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg';           // Konsisten dengan SettingsDialog
  sidebarPosition: 'left' | 'right';      // ✅ Property yang missing
  accentColor: string;
  
  // Optional properties dari AuthContext (untuk backward compatibility)
  fontFamily?: string;
  sidebarCollapsed?: boolean;
  animations?: boolean;
}

// Default settings
export const defaultModelSettings: ModelSettings = {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 8192,
  topP: 0.95,
  topK: 40,
  systemPrompt: 'You are a helpful AI assistant focused on Indonesian topics and trending discussions. Always respond in a friendly and informative manner.',
  useStreaming: true
};

export const defaultChatSettings: ChatSettings = {
  autoSave: true,
  showTimestamps: true,
  enableSounds: false,
  compactMode: false,
  autoScroll: true,
  markdownEnabled: true,
  maxHistoryLength: 100,
  language: 'id'
};

export const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 'md',
  sidebarPosition: 'left',    // ✅ Default value
  accentColor: '#10b981',
  
  // Optional defaults
  fontFamily: 'Inter',
  sidebarCollapsed: false,
  animations: true
};