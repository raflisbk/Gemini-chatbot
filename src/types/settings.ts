// src/types/settings.ts - Updated with consistent types

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

// ✅ FIXED: AppearanceSettings dengan consistent string types
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg';              // ✅ Consistent string type
  sidebarPosition: 'left' | 'right';
  accentColor: string;
  
  // Optional properties untuk backward compatibility
  fontFamily?: string;
  sidebarCollapsed?: boolean;
  animations?: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  recognition: boolean;
  language: string;
}

export interface PrivacySettings {
  saveHistory: boolean;
  allowAnalytics: boolean;
  shareUsageData: boolean;
  encryptMessages: boolean;
  autoDeleteAfter: number;
}

// Default settings dengan type-safe values
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
  fontSize: 'md',                    // ✅ String default
  sidebarPosition: 'left',
  accentColor: '#10b981',
  
  // Optional defaults
  fontFamily: 'Inter',
  sidebarCollapsed: false,
  animations: true
};

export const defaultVoiceSettings: VoiceSettings = {
  enabled: false,
  autoSpeak: false,
  voice: 'default',
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  recognition: false,
  language: 'id-ID'
};

export const defaultPrivacySettings: PrivacySettings = {
  saveHistory: true,
  allowAnalytics: false,
  shareUsageData: false,
  encryptMessages: true,
  autoDeleteAfter: 30
};

// ✅ Type guards untuk validation
export const isValidFontSize = (value: any): value is 'sm' | 'md' | 'lg' => {
  return ['sm', 'md', 'lg'].includes(value);
};

export const isValidTheme = (value: any): value is 'light' | 'dark' | 'system' => {
  return ['light', 'dark', 'system'].includes(value);
};

export const isValidSidebarPosition = (value: any): value is 'left' | 'right' => {
  return ['left', 'right'].includes(value);
};

// ✅ Settings validation function
export const validateSettings = (settings: {
  model?: Partial<ModelSettings>;
  chat?: Partial<ChatSettings>;
  appearance?: Partial<AppearanceSettings>;
  voice?: Partial<VoiceSettings>;
  privacy?: Partial<PrivacySettings>;
}): string[] => {
  const errors: string[] = [];

  // Validate model settings
  if (settings.model) {
    if (settings.model.temperature !== undefined && (settings.model.temperature < 0 || settings.model.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }
    if (settings.model.maxTokens !== undefined && (settings.model.maxTokens < 256 || settings.model.maxTokens > 8192)) {
      errors.push('Max tokens must be between 256 and 8192');
    }
  }

  // Validate appearance settings
  if (settings.appearance) {
    if (settings.appearance.fontSize !== undefined && !isValidFontSize(settings.appearance.fontSize)) {
      errors.push('Invalid font size value');
    }
    if (settings.appearance.theme !== undefined && !isValidTheme(settings.appearance.theme)) {
      errors.push('Invalid theme value');
    }
    if (settings.appearance.sidebarPosition !== undefined && !isValidSidebarPosition(settings.appearance.sidebarPosition)) {
      errors.push('Invalid sidebar position value');
    }
  }

  // Validate voice settings
  if (settings.voice) {
    if (settings.voice.rate !== undefined && (settings.voice.rate < 0.5 || settings.voice.rate > 2)) {
      errors.push('Speech rate must be between 0.5 and 2');
    }
    if (settings.voice.volume !== undefined && (settings.voice.volume < 0 || settings.voice.volume > 1)) {
      errors.push('Volume must be between 0 and 1');
    }
  }

  // Validate privacy settings
  if (settings.privacy) {
    if (settings.privacy.autoDeleteAfter !== undefined && (settings.privacy.autoDeleteAfter < 1 || settings.privacy.autoDeleteAfter > 365)) {
      errors.push('Auto delete days must be between 1 and 365');
    }
  }

  return errors;
};