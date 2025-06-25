'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  systemPrompt: string;
}

interface ChatSettings {
  autoSave: boolean;
  showTimestamps: boolean;
  enableSounds: boolean;
  compactMode: boolean;
  autoScroll: boolean;
  markdownEnabled: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  sidebarPosition: 'left' | 'right';
  accentColor: string;
}

interface SettingsContextType {
  modelSettings: ModelSettings;
  chatSettings: ChatSettings;
  appearanceSettings: AppearanceSettings;
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  resetToDefaults: () => void;
  exportSettings: () => void;
  importSettings: (settingsData: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Default settings
const defaultModelSettings: ModelSettings = {
  temperature: 0.7,
  maxTokens: 1024,
  topP: 0.95,
  topK: 40,
  systemPrompt: 'You are a helpful AI assistant focused on Indonesian topics and trending discussions. Always respond in a friendly and informative manner.'
};

const defaultChatSettings: ChatSettings = {
  autoSave: true,
  showTimestamps: true,
  enableSounds: false,
  compactMode: false,
  autoScroll: true,
  markdownEnabled: true
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 'md',
  sidebarPosition: 'left',
  accentColor: '#10b981'
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Apply theme changes immediately
  useEffect(() => {
    applyTheme();
  }, [appearanceSettings.theme]);

  // Apply font size changes
  useEffect(() => {
    applyFontSize();
  }, [appearanceSettings.fontSize]);

  // Apply accent color changes
  useEffect(() => {
    applyAccentColor();
  }, [appearanceSettings.accentColor]);

  // Apply sidebar position
  useEffect(() => {
    applySidebarPosition();
  }, [appearanceSettings.sidebarPosition]);

  const loadSettings = () => {
    try {
      const savedModelSettings = localStorage.getItem('ai-chatbot-model-settings');
      const savedChatSettings = localStorage.getItem('ai-chatbot-chat-settings');
      const savedAppearanceSettings = localStorage.getItem('ai-chatbot-appearance-settings');

      if (savedModelSettings) {
        setModelSettings({ ...defaultModelSettings, ...JSON.parse(savedModelSettings) });
      }
      if (savedChatSettings) {
        setChatSettings({ ...defaultChatSettings, ...JSON.parse(savedChatSettings) });
      }
      if (savedAppearanceSettings) {
        setAppearanceSettings({ ...defaultAppearanceSettings, ...JSON.parse(savedAppearanceSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(modelSettings));
      localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(chatSettings));
      localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(appearanceSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const applyTheme = () => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    const isDark = appearanceSettings.theme === 'dark' || 
      (appearanceSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
  };

  const applyFontSize = () => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    
    // Apply new font size
    switch (appearanceSettings.fontSize) {
      case 'sm':
        root.style.fontSize = '14px';
        break;
      case 'lg':
        root.style.fontSize = '18px';
        break;
      default:
        root.style.fontSize = '16px';
        break;
    }
  };

  const applyAccentColor = () => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hex = appearanceSettings.accentColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // Update CSS custom properties
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
  };

  const applySidebarPosition = () => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    root.setAttribute('data-sidebar-position', appearanceSettings.sidebarPosition);
  };

  // Helper function to convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const updateModelSettings = (newSettings: Partial<ModelSettings>) => {
    setModelSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateChatSettings = (newSettings: Partial<ChatSettings>) => {
    setChatSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateAppearanceSettings = (newSettings: Partial<AppearanceSettings>) => {
    setAppearanceSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const resetToDefaults = () => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    
    // Clear localStorage
    localStorage.removeItem('ai-chatbot-model-settings');
    localStorage.removeItem('ai-chatbot-chat-settings');
    localStorage.removeItem('ai-chatbot-appearance-settings');
  };

  const exportSettings = () => {
    const settingsData = {
      modelSettings,
      chatSettings,
      appearanceSettings,
      exportDate: new Date().toISOString(),
      version: '2.0.0'
    };
    
    const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chatbot-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = (settingsData: string): boolean => {
    try {
      const data = JSON.parse(settingsData);
      
      if (data.modelSettings) {
        setModelSettings({ ...defaultModelSettings, ...data.modelSettings });
      }
      if (data.chatSettings) {
        setChatSettings({ ...defaultChatSettings, ...data.chatSettings });
      }
      if (data.appearanceSettings) {
        setAppearanceSettings({ ...defaultAppearanceSettings, ...data.appearanceSettings });
      }
      
      saveSettings();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [modelSettings, chatSettings, appearanceSettings]);

  const contextValue: SettingsContextType = {
    modelSettings,
    chatSettings,
    appearanceSettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    resetToDefaults,
    exportSettings,
    importSettings
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}