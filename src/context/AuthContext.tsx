'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, AuthUser, RegisterData } from '@/lib/auth';
import { getUserUsage, trackUsage } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

// Keep existing interfaces for backward compatibility
export interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  useStreaming: boolean;
}

export interface ChatSettings {
  autoScroll: any;
  showTimestamps: boolean;
  compactMode: boolean;
  autoSave: boolean;
  maxHistoryLength: number;
  enableSounds: boolean;
  language: string;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  accentColor: string;
  sidebarCollapsed: boolean;
  animations: boolean;
}

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
  
  // Settings management (keep existing functionality)
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

// Default settings (keep existing)
const defaultModelSettings: ModelSettings = {
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 8192,
  systemPrompt: 'You are a helpful AI assistant.',
  useStreaming: true,
};

const defaultChatSettings: ChatSettings = {
  autoScroll: true,
  showTimestamps: true,
  compactMode: false,
  autoSave: true,
  maxHistoryLength: 50,
  enableSounds: true,
  language: 'id',
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 'medium',
  fontFamily: 'Inter',
  accentColor: 'emerald',
  sidebarCollapsed: false,
  animations: true,
};

// Storage keys for settings (keep existing for localStorage fallback)
const MODEL_SETTINGS_KEY = 'ai-chatbot-model-settings';
const CHAT_SETTINGS_KEY = 'ai-chatbot-chat-settings';
const APPEARANCE_SETTINGS_KEY = 'ai-chatbot-appearance-settings';

// Quota constants
const USER_QUOTA = 100;
const ADMIN_QUOTA = 1000;
const GUEST_QUOTA = 10;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [usage, setUsage] = useState<UsageInfo>({
    messageCount: 0,
    fileUploads: 0,
    remainingQuota: GUEST_QUOTA,
    storageUsage: 0,
  });

  // Settings state (keep existing)
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);

  const isAdmin = authState.user?.role === 'admin';
  const isGuest = !authState.isAuthenticated;

  // Load settings from localStorage (keep existing functionality)
  const loadSettings = useCallback(() => {
    try {
      const stored = localStorage.getItem(MODEL_SETTINGS_KEY);
      if (stored) {
        setModelSettings({ ...defaultModelSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load model settings:', error);
    }

    try {
      const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
      if (stored) {
        setChatSettings({ ...defaultChatSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load chat settings:', error);
    }

    try {
      const stored = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
      if (stored) {
        setAppearanceSettings({ ...defaultAppearanceSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load appearance settings:', error);
    }
  }, []);

  // Check authentication status on mount
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { user } = await response.json();
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        await refreshUsage();
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Refresh usage data
  const refreshUsage = useCallback(async () => {
    try {
      if (authState.user) {
        const usageData = await getUserUsage(authState.user.id);
        const maxQuota = isAdmin ? ADMIN_QUOTA : USER_QUOTA;
        
        setUsage({
          messageCount: usageData.messageCount,
          fileUploads: usageData.fileUploads,
          remainingQuota: Math.max(0, maxQuota - usageData.messageCount),
          storageUsage: 0, // Will be updated by storage hook
        });
      } else {
        // Guest usage from localStorage
        const today = new Date().toDateString();
        const stored = localStorage.getItem(`guest_usage_${today}`);
        const guestUsage = stored ? JSON.parse(stored) : { messageCount: 0, fileUploads: 0 };
        
        setUsage({
          messageCount: guestUsage.messageCount,
          fileUploads: guestUsage.fileUploads,
          remainingQuota: Math.max(0, GUEST_QUOTA - guestUsage.messageCount),
          storageUsage: 0,
        });
      }
    } catch (error) {
      console.error('Error refreshing usage:', error);
    }
  }, [authState.user, isAdmin]);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await loginUser(email, password);
      
      if (result.success && result.user && result.token) {
        localStorage.setItem('auth_token', result.token);
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        await refreshUsage();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await registerUser(userData);
      
      if (result.success && result.user && result.token) {
        localStorage.setItem('auth_token', result.token);
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        await refreshUsage();
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Call logout API to invalidate session
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      // Reset to guest quota
      setUsage({
        messageCount: 0,
        fileUploads: 0,
        remainingQuota: GUEST_QUOTA,
        storageUsage: 0,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update usage function
  const updateUsage = async (type: 'message' | 'file_upload'): Promise<void> => {
    try {
      if (authState.user) {
        await trackUsage(authState.user.id, type);
        await refreshUsage();
      } else {
        // Guest usage tracking
        const today = new Date().toDateString();
        const storageKey = `guest_usage_${today}`;
        const stored = localStorage.getItem(storageKey);
        const guestUsage = stored ? JSON.parse(stored) : { messageCount: 0, fileUploads: 0 };
        
        if (type === 'message') {
          guestUsage.messageCount += 1;
        } else if (type === 'file_upload') {
          guestUsage.fileUploads += 1;
        }
        
        localStorage.setItem(storageKey, JSON.stringify(guestUsage));
        await refreshUsage();
      }
    } catch (error) {
      console.error('Error updating usage:', error);
    }
  };

  // Settings management functions (keep existing)
  const updateModelSettings = (newSettings: Partial<ModelSettings>) => {
    const updated = { ...modelSettings, ...newSettings };
    setModelSettings(updated);
    localStorage.setItem(MODEL_SETTINGS_KEY, JSON.stringify(updated));
  };

  const updateChatSettings = (newSettings: Partial<ChatSettings>) => {
    const updated = { ...chatSettings, ...newSettings };
    setChatSettings(updated);
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(updated));
  };

  const updateAppearanceSettings = (newSettings: Partial<AppearanceSettings>) => {
    const updated = { ...appearanceSettings, ...newSettings };
    setAppearanceSettings(updated);
    localStorage.setItem(APPEARANCE_SETTINGS_KEY, JSON.stringify(updated));
  };

  const resetSettingsToDefaults = () => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    localStorage.removeItem(MODEL_SETTINGS_KEY);
    localStorage.removeItem(CHAT_SETTINGS_KEY);
    localStorage.removeItem(APPEARANCE_SETTINGS_KEY);
  };

  const exportSettings = (): string => {
    return JSON.stringify({
      model: modelSettings,
      chat: chatSettings,
      appearance: appearanceSettings,
      exportedAt: new Date().toISOString(),
    });
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const parsed = JSON.parse(settingsJson);
      if (parsed.model) updateModelSettings(parsed.model);
      if (parsed.chat) updateChatSettings(parsed.chat);
      if (parsed.appearance) updateAppearanceSettings(parsed.appearance);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadSettings();
    checkAuthStatus();
  }, [loadSettings, checkAuthStatus]);

  // Set up Supabase auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          await logout();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUsage,
    refreshUsage,
    usage,
    isAdmin,
    isGuest,
    modelSettings,
    chatSettings,
    appearanceSettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    resetSettingsToDefaults,
    exportSettings,
    importSettings,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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