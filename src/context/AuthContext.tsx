// src/context/AuthContext.tsx - FIXED VERSION
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, AuthUser, RegisterData } from '@/lib/auth';
import { getUserUsage, trackUsage } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

// ✅ IMPORT dari file types yang unified
import { 
  ModelSettings, 
  ChatSettings, 
  AppearanceSettings,
  defaultModelSettings,
  defaultChatSettings,
  defaultAppearanceSettings
} from '@/types/settings';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface UsageInfo {
  messageCount: number;
  fileUploads: number;
  remainingQuota: number;
  storageUsage: number;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUsage: (type: 'message' | 'file_upload') => Promise<void>;
  refreshUsage: () => Promise<void>;
  usage: UsageInfo;
  isAdmin: boolean;
  isGuest: boolean;
  
  // Settings management
  modelSettings: ModelSettings;
  chatSettings: ChatSettings;
  appearanceSettings: AppearanceSettings;
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  resetSettingsToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [usage, setUsage] = useState<UsageInfo>({
    messageCount: 0,
    fileUploads: 0,
    remainingQuota: 100,
    storageUsage: 0
  });

  // ✅ Settings state menggunakan interface yang sudah diperbaiki
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);

  // Load settings from localStorage
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

  // ✅ Apply sidebar position - sekarang tidak akan error
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
    
    const hex = appearanceSettings.accentColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const [h, s, l] = rgbToHsl(r, g, b);
    
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
  };

  // ✅ Function ini sekarang akan bekerja karena sidebarPosition ada di interface
  const applySidebarPosition = () => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    root.setAttribute('data-sidebar-position', appearanceSettings.sidebarPosition || 'left');
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

  // ✅ Update functions sekarang akan bekerja dengan interface yang benar
  const updateModelSettings = useCallback((newSettings: Partial<ModelSettings>) => {
    setModelSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateChatSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setChatSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateAppearanceSettings = useCallback((newSettings: Partial<AppearanceSettings>) => {
    setAppearanceSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetSettingsToDefaults = useCallback(() => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    
    localStorage.removeItem('ai-chatbot-model-settings');
    localStorage.removeItem('ai-chatbot-chat-settings');
    localStorage.removeItem('ai-chatbot-appearance-settings');
  }, []);

  const exportSettings = useCallback(() => {
    const settings = {
      model: modelSettings,
      chat: chatSettings,
      appearance: appearanceSettings,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(settings, null, 2);
  }, [modelSettings, chatSettings, appearanceSettings]);

  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const settings = JSON.parse(settingsJson);
      
      if (settings.model) updateModelSettings(settings.model);
      if (settings.chat) updateChatSettings(settings.chat);
      if (settings.appearance) updateAppearanceSettings(settings.appearance);
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, [updateModelSettings, updateChatSettings, updateAppearanceSettings]);

  // Auth functions (existing implementation)
  const login = async (email: string, password: string): Promise<boolean> => {
    // Implementation existing
    return true;
  };

  const register = async (userData: RegisterData) => {
    // Implementation existing
    return { success: true };
  };

  const logout = async () => {
    // Implementation existing
  };

  const updateUsage = async (type: 'message' | 'file_upload') => {
    // Implementation existing
  };

  const refreshUsage = async () => {
    // Implementation existing
  };

  const value: AuthContextType = {
    ...authState,
    usage,
    isAdmin: authState.user?.role === 'admin',
    isGuest: authState.user?.id === 'guest',
    login,
    register,
    logout,
    updateUsage,
    refreshUsage,
    
    // Settings
    modelSettings,
    chatSettings,
    appearanceSettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    resetSettingsToDefaults,
    exportSettings,
    importSettings
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};