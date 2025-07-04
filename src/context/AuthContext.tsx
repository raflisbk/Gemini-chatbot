// src/context/AuthContext.tsx - COMPLETE FIXED VERSION
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ========================================
// INTERFACES & TYPES
// ========================================

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  avatarUrl?: string;
  photoURL?: string; // Added for compatibility
  messageCount?: number;
  lastLogin?: string;
  settings?: any;
  created_at?: string;
  updated_at?: string;
}

interface GuestSession {
  id: string;
  sessionToken: string;
  messageCount: number;
  maxMessages: number;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  user: User | null;
  guestSession: GuestSession | null;
  isLoading: boolean;
  error: string | null;
}

interface UsageStats {
  messageCount: number;
  fileUploads: number;
  tokensUsed: number;
  storageUsed: number;
  remainingQuota: number;
}

interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  topP: number; // Added for SettingsDialog
  topK: number; // Added for SettingsDialog
}

interface ChatSettings {
  autoSave: boolean;
  soundEnabled: boolean;
  darkMode: boolean;
  language: string;
}

interface AppearanceSettings {
  theme: string;
  fontSize: string;
  avatarStyle: string;
  sidebarPosition: 'left' | 'right'; // Added for SettingsDialog
  accentColor: string; // Added for SettingsDialog
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

interface AuthContextType {
  // Authentication state
  user: User | null;
  guestSession: GuestSession | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Usage tracking
  usage: UsageStats;
  updateUsage: (type: 'message' | 'file') => void;
  refreshUsage: () => void;
  
  // Settings
  modelSettings: ModelSettings;
  chatSettings: ChatSettings;
  appearanceSettings: AppearanceSettings;
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  
  // Settings management functions - Added for SettingsDialog
  resetSettingsToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  
  // Guest actions
  initializeGuest: () => Promise<void>;
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
}

// ========================================
// DEFAULT VALUES
// ========================================

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  isGuest: false,
  user: null,
  guestSession: null,
  isLoading: true,
  error: null,
};

const defaultUsageStats: UsageStats = {
  messageCount: 0,
  fileUploads: 0,
  tokensUsed: 0,
  storageUsed: 0,
  remainingQuota: 0,
};

const defaultModelSettings: ModelSettings = {
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: 'You are a helpful AI assistant. Respond naturally in Indonesian when appropriate.',
  topP: 0.9,
  topK: 40,
};

const defaultChatSettings: ChatSettings = {
  autoSave: true,
  soundEnabled: false,
  darkMode: false,
  language: 'id',
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'light',
  fontSize: 'medium',
  avatarStyle: 'circle',
  sidebarPosition: 'left',
  accentColor: '#3b82f6',
};

// ========================================
// CONTEXT CREATION
// ========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ========================================
// AUTH PROVIDER COMPONENT
// ========================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [usage, setUsage] = useState<UsageStats>(defaultUsageStats);
  
  // Settings state
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    initializeAuth();
    loadSettings();
  }, []);

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Check for existing auth token
      const token = localStorage.getItem('auth-token');
      if (token) {
        const isValid = await verifyToken(token);
        if (isValid) {
          return; // User is authenticated
        } else {
          localStorage.removeItem('auth-token');
        }
      }
      
      // Initialize as guest
      await initializeGuest();
    } catch (error) {
      console.error('Auth initialization error:', error);
      await initializeGuest();
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Ensure user object has photoURL for compatibility
        const user = {
          ...data.user,
          photoURL: data.user.avatarUrl || data.user.avatar_url || null
        };
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user,
          isGuest: false,
          guestSession: null,
        }));
        await refreshUsage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  };

  // ========================================
  // GUEST SESSION MANAGEMENT
  // ========================================

  const initializeGuest = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState(prev => ({
          ...prev,
          isGuest: true,
          guestSession: data.session,
          isAuthenticated: false,
          user: null,
        }));
        localStorage.setItem('guest-token', data.session.sessionToken);
      } else {
        throw new Error('Failed to initialize guest session');
      }
    } catch (error) {
      console.error('Guest initialization error:', error);
      // Fallback to basic guest session
      const fallbackSession: GuestSession = {
        id: 'guest-' + Date.now(),
        sessionToken: 'guest-token-' + Date.now(),
        messageCount: 0,
        maxMessages: 5,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      
      setAuthState(prev => ({
        ...prev,
        isGuest: true,
        guestSession: fallbackSession,
        isAuthenticated: false,
        user: null,
      }));
      localStorage.setItem('guest-token', fallbackSession.sessionToken);
    }
  };

  const canSendMessage = useCallback((): boolean => {
    if (authState.isAuthenticated) return true;
    if (authState.isGuest && authState.guestSession) {
      return authState.guestSession.messageCount < authState.guestSession.maxMessages;
    }
    return false;
  }, [authState]);

  const getRemainingMessages = useCallback((): number => {
    if (authState.isAuthenticated) return -1; // Unlimited
    if (authState.isGuest && authState.guestSession) {
      return authState.guestSession.maxMessages - authState.guestSession.messageCount;
    }
    return 0;
  }, [authState]);

  // ========================================
  // AUTHENTICATION ACTIONS
  // ========================================

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, error: null, isLoading: true }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('auth-token', data.token);
        localStorage.removeItem('guest-token'); // Clear guest session
        
        // Ensure user object has photoURL for compatibility
        const user = {
          ...data.user,
          photoURL: data.user.avatarUrl || data.user.avatar_url || null
        };
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user,
          isGuest: false,
          guestSession: null,
          isLoading: false,
          error: null,
        }));
        
        await refreshUsage();
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          error: data.error || 'Login failed',
          isLoading: false,
        }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Network error occurred',
        isLoading: false,
      }));
      return false;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, error: null, isLoading: true }));

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('auth-token', data.token);
        localStorage.removeItem('guest-token');
        
        // Ensure user object has photoURL for compatibility
        const user = {
          ...data.user,
          photoURL: data.user.avatarUrl || data.user.avatar_url || null
        };
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user,
          isGuest: false,
          guestSession: null,
          isLoading: false,
          error: null,
        }));
        
        await refreshUsage();
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          error: data.error || 'Registration failed',
          isLoading: false,
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = 'Network error occurred';
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('guest-token');
    
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      isGuest: false,
      guestSession: null,
      error: null,
    }));
    
    // Reinitialize as guest
    initializeGuest();
  }, []);

  // ========================================
  // USAGE TRACKING
  // ========================================

  const refreshUsage = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      const response = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data.usage);
      }
    } catch (error) {
      console.error('Usage refresh error:', error);
    }
  }, []);

  const updateUsage = useCallback((type: 'message' | 'file') => {
    if (authState.isAuthenticated) {
      setUsage(prev => ({
        ...prev,
        messageCount: type === 'message' ? prev.messageCount + 1 : prev.messageCount,
        fileUploads: type === 'file' ? prev.fileUploads + 1 : prev.fileUploads,
      }));
    } else if (authState.isGuest && authState.guestSession) {
      setAuthState(prev => ({
        ...prev,
        guestSession: prev.guestSession ? {
          ...prev.guestSession,
          messageCount: prev.guestSession.messageCount + 1,
        } : null,
      }));
    }
  }, [authState]);

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================

  const loadSettings = useCallback(() => {
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
  }, []);

  const updateModelSettings = useCallback((settings: Partial<ModelSettings>) => {
    setModelSettings(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const updateChatSettings = useCallback((settings: Partial<ChatSettings>) => {
    setChatSettings(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const updateAppearanceSettings = useCallback((settings: Partial<AppearanceSettings>) => {
    setAppearanceSettings(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // ========================================
  // SETTINGS MANAGEMENT FUNCTIONS (Added for SettingsDialog)
  // ========================================

  const resetSettingsToDefaults = useCallback(() => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    
    localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(defaultModelSettings));
    localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(defaultChatSettings));
    localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(defaultAppearanceSettings));
  }, []);

  const exportSettings = useCallback((): string => {
    const settings = {
      model: modelSettings,
      chat: chatSettings,
      appearance: appearanceSettings,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
    return JSON.stringify(settings, null, 2);
  }, [modelSettings, chatSettings, appearanceSettings]);

  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const settings = JSON.parse(settingsJson);
      
      if (settings.model) {
        const newModelSettings = { ...defaultModelSettings, ...settings.model };
        setModelSettings(newModelSettings);
        localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(newModelSettings));
      }
      
      if (settings.chat) {
        const newChatSettings = { ...defaultChatSettings, ...settings.chat };
        setChatSettings(newChatSettings);
        localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(newChatSettings));
      }
      
      if (settings.appearance) {
        const newAppearanceSettings = { ...defaultAppearanceSettings, ...settings.appearance };
        setAppearanceSettings(newAppearanceSettings);
        localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(newAppearanceSettings));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

  // ========================================
  // DERIVED VALUES
  // ========================================

  const isAdmin = authState.user?.role === 'admin';

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: AuthContextType = {
    // Authentication state
    user: authState.user,
    guestSession: authState.guestSession,
    isAuthenticated: authState.isAuthenticated,
    isGuest: authState.isGuest,
    isAdmin,
    isLoading: authState.isLoading,
    error: authState.error,
    
    // Usage tracking
    usage,
    updateUsage,
    refreshUsage,
    
    // Settings
    modelSettings,
    chatSettings,
    appearanceSettings,
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    
    // Settings management functions
    resetSettingsToDefaults,
    exportSettings,
    importSettings,
    
    // Auth actions
    login,
    logout,
    register,
    
    // Guest actions
    initializeGuest,
    canSendMessage,
    getRemainingMessages,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};