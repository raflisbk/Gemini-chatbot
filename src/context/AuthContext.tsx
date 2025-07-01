'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  ModelSettings, 
  ChatSettings, 
  AppearanceSettings,
  defaultModelSettings,
  defaultChatSettings,
  defaultAppearanceSettings
} from '@/types/settings';

// ===========================
// TYPES & INTERFACES
// ===========================

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UsageInfo {
  messageCount: number;
  fileUploads: number;
  remainingQuota: number;
  storageUsage: number;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
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
  clearError: () => void;
  
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

// ===========================
// CONTEXT CREATION
// ===========================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================
// AUTH PROVIDER - FIXED VERSION
// ===========================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🔍 AuthProvider initializing...');
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const [usage, setUsage] = useState<UsageInfo>({
    messageCount: 0,
    fileUploads: 0,
    remainingQuota: 100,
    storageUsage: 0
  });

  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);

  // Track initialization to prevent infinite loops
  const [hasInitialized, setHasInitialized] = useState(false);

  // ===========================
  // INITIALIZATION WITH TIMEOUT
  // ===========================

  useEffect(() => {
    console.log('🔍 AuthProvider useEffect triggered');
    
    if (hasInitialized) {
      console.log('🔍 Already initialized, skipping...');
      return;
    }

    let timeoutId: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      console.log('🔍 Starting auth initialization...');
      
      try {
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('⚠️ Auth initialization timeout - setting as guest');
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: null
          }));
          setHasInitialized(true);
        }, 5000); // 5 second timeout

        // Check for existing token
        const token = localStorage.getItem('auth-token');
        console.log('🔍 Token check:', !!token);
        
        if (!token) {
          console.log('🔍 No token found, setting as guest');
          clearTimeout(timeoutId);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: null
          }));
          setHasInitialized(true);
          return;
        }

        // Verify token with API
        console.log('🔍 Verifying token...');
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('🔍 Token verification response:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Token verification successful:', !!data.user);
          
          if (data.user) {
            clearTimeout(timeoutId);
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              isAuthenticated: true,
              user: data.user,
              error: null
            }));
            setHasInitialized(true);
            return;
          }
        }

        // Token verification failed
        console.log('🔍 Token verification failed, removing token');
        localStorage.removeItem('auth-token');
        clearTimeout(timeoutId);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null
        }));
        setHasInitialized(true);

      } catch (error) {
        console.error('🔍 Auth initialization error:', error);
        clearTimeout(timeoutId);
        localStorage.removeItem('auth-token');
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null
        }));
        setHasInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Empty dependency array - only run once

  // ===========================
  // SETTINGS MANAGEMENT
  // ===========================

  useEffect(() => {
    loadSettings();
  }, []);

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

  // ===========================
  // AUTH FUNCTIONS
  // ===========================

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('🔍 Login attempt for:', email);
    
    try {
      setAuthState(prev => ({ ...prev, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('auth-token', data.token);
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: data.user,
          error: null
        }));
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          error: data.error || 'Login failed'
        }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Network error occurred'
      }));
      return false;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('auth-token', data.token);
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: data.user,
          error: null
        }));
        return { success: true };
      } else {
        const errorMessage = data.error || 'Registration failed';
        setAuthState(prev => ({
          ...prev,
          error: errorMessage
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = 'Network error occurred';
      setAuthState(prev => ({
        ...prev,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth-token');
      
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth-token');
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        error: null
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // ===========================
  // USAGE FUNCTIONS (MOCK)
  // ===========================

  const updateUsage = useCallback(async (type: 'message' | 'file_upload'): Promise<void> => {
    try {
      if (authState.user) {
        // Mock usage update
        setUsage(prev => ({
          ...prev,
          messageCount: type === 'message' ? prev.messageCount + 1 : prev.messageCount,
          fileUploads: type === 'file_upload' ? prev.fileUploads + 1 : prev.fileUploads,
        }));
      }
    } catch (error) {
      console.error('Update usage error:', error);
    }
  }, [authState.user]);

  const refreshUsage = useCallback(async (): Promise<void> => {
    try {
      if (authState.user) {
        // Mock refresh
        console.log('Refreshing usage...');
      }
    } catch (error) {
      console.error('Refresh usage error:', error);
    }
  }, [authState.user]);

  // ===========================
  // SETTINGS FUNCTIONS
  // ===========================

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

  // ===========================
  // CONTEXT VALUE
  // ===========================

  const value: AuthContextType = {
    ...authState,
    usage,
    isAdmin: authState.user?.role === 'admin',
    isGuest: !authState.isAuthenticated,
    
    // Auth functions
    login,
    register,
    logout,
    clearError,
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
    importSettings,
  };

  console.log('🔍 AuthProvider rendering, isLoading:', authState.isLoading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ===========================
// HOOK
// ===========================

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}