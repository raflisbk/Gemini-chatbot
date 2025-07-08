// src/context/AuthContext.tsx - COMPLETE INTEGRATED VERSION
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
  photoURL?: string;
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
  topP: number;
  topK: number;
}

interface ChatSettings {
  autoSave: boolean;
  soundEnabled: boolean;
  darkMode: boolean;
  language: string;
  showTimestamps: boolean;
  compactMode: boolean;
  enableSounds: boolean;
  autoScroll: boolean;
  messageLimit: number;
  typingIndicator: boolean;
  readReceipts: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  avatarStyle: string;
  sidebarPosition: 'left' | 'right';
  accentColor: string;
  primaryColor: string;
  borderRadius: number;
  compactUI: boolean;
  animations: boolean;
  transparency: number;
}

interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  recognition: boolean;
  language: string;
}

interface PrivacySettings {
  saveHistory: boolean;
  allowAnalytics: boolean;
  shareUsageData: boolean;
  encryptMessages: boolean;
  autoDeleteAfter: number;
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
  
  // Quota & Usage
  usage: UsageStats;
  updateUsage: (type: 'message' | 'file') => void;
  refreshUsage: () => void;
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
  getQuotaLimit: () => number;
  quotaUsed: number;
  quotaLimit: number;
  
  // Settings
  modelSettings: ModelSettings;
  chatSettings: ChatSettings;
  appearanceSettings: AppearanceSettings;
  voiceSettings: VoiceSettings;
  privacySettings: PrivacySettings;
  
  // Settings update functions
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  
  // Settings management
  resetSettingsToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  initializeGuest: () => Promise<void>;
}

// ========================================
// QUOTA CONSTANTS
// ========================================

const QUOTA_LIMITS = {
  guest: 5,
  user: 25,
  admin: Infinity
};

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
  model: 'gemini-2.5-flash',
  temperature: 1.5,
  maxTokens: 1024,
  systemPrompt: 'You are a helpful AI assistant. Respond naturally in Indonesian when appropriate.',
  topP: 1,
  topK: 40,
};

const defaultChatSettings: ChatSettings = {
  autoSave: true,
  soundEnabled: false,
  darkMode: false,
  language: 'id',
  showTimestamps: true,
  compactMode: false,
  enableSounds: false,
  autoScroll: true,
  messageLimit: 100,
  typingIndicator: true,
  readReceipts: true,
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 14,
  fontFamily: 'Inter',
  avatarStyle: 'circle',
  sidebarPosition: 'left',
  accentColor: '#3b82f6',
  primaryColor: '#10b981',
  borderRadius: 8,
  compactUI: false,
  animations: true,
  transparency: 95,
};

const defaultVoiceSettings: VoiceSettings = {
  enabled: false,
  autoSpeak: false,
  voice: 'default',
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  recognition: false,
  language: 'id-ID'
};

const defaultPrivacySettings: PrivacySettings = {
  saveHistory: true,
  allowAnalytics: false,
  shareUsageData: false,
  encryptMessages: true,
  autoDeleteAfter: 30
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
  const [quotaUsed, setQuotaUsed] = useState(0);
  
  // Settings state
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);

  // ========================================
  // DERIVED VALUES
  // ========================================

  const userRole = authState.user?.role || 'guest';
  const isAdmin = authState.user?.role === 'admin';
  const quotaLimit = QUOTA_LIMITS[userRole as keyof typeof QUOTA_LIMITS];

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    initializeAuth();
    loadSettings();
  }, []);

  useEffect(() => {
    loadQuotaUsage();
  }, [authState.user, authState.isGuest]);

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Check for existing auth token
      const token = localStorage.getItem('auth_token');
      if (token) {
        const isValid = await verifyToken(token);
        if (isValid) {
          return; // User is authenticated
        } else {
          localStorage.removeItem('auth_token');
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
  // QUOTA MANAGEMENT
  // ========================================

  const loadQuotaUsage = useCallback(() => {
    try {
      if (userRole === 'guest') {
        const guestUsage = localStorage.getItem('guest-quota-usage');
        const resetDate = localStorage.getItem('guest-quota-reset');
        const today = new Date().toDateString();
        
        // Reset daily quota for guests
        if (resetDate !== today) {
          localStorage.setItem('guest-quota-usage', '0');
          localStorage.setItem('guest-quota-reset', today);
          setQuotaUsed(0);
        } else {
          setQuotaUsed(guestUsage ? parseInt(guestUsage) : 0);
        }
      } else if (authState.user) {
        // For authenticated users, load from database or localStorage
        setQuotaUsed(authState.user.messageCount || 0);
      }
    } catch (error) {
      console.error('Error loading quota usage:', error);
    }
  }, [userRole, authState.user]);

  const canSendMessage = useCallback((): boolean => {
    if (userRole === 'admin') return true;
    return quotaUsed < quotaLimit;
  }, [userRole, quotaUsed, quotaLimit]);

  const getRemainingMessages = useCallback((): number => {
    if (userRole === 'admin') return -1; // Unlimited
    return Math.max(0, quotaLimit - quotaUsed);
  }, [userRole, quotaUsed, quotaLimit]);

  const getQuotaLimit = useCallback((): number => {
    return quotaLimit;
  }, [quotaLimit]);

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
        localStorage.setItem('auth_token', data.token);
        localStorage.removeItem('guest-token');
        localStorage.removeItem('guest-quota-usage');
        localStorage.removeItem('guest-quota-reset');
        
        const user = {
          ...data.user,
          photoURL: data.user.avatarUrl || data.user.avatar_url || null,
          role: data.user.role || 'user' // Ensure role is set
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
        localStorage.setItem('auth_token', data.token);
        localStorage.removeItem('guest-token');
        
        const user = {
          ...data.user,
          photoURL: data.user.avatarUrl || data.user.avatar_url || null,
          role: data.user.role || 'user'
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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('guest-token');
    
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      isGuest: false,
      guestSession: null,
      error: null,
    }));
    
    setQuotaUsed(0);
    initializeGuest();
  }, []);

  // ========================================
  // USAGE TRACKING
  // ========================================

  const refreshUsage = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data.usage);
        setQuotaUsed(data.usage.messageCount || 0);
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
      
      if (type === 'message') {
        setQuotaUsed(prev => prev + 1);
      }
    } else if (authState.isGuest) {
      const newUsage = quotaUsed + 1;
      setQuotaUsed(newUsage);
      localStorage.setItem('guest-quota-usage', newUsage.toString());
      
      if (authState.guestSession) {
        setAuthState(prev => ({
          ...prev,
          guestSession: prev.guestSession ? {
            ...prev.guestSession,
            messageCount: prev.guestSession.messageCount + 1,
          } : null,
        }));
      }
    }
  }, [authState, quotaUsed]);

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================

  const loadSettings = useCallback(() => {
    try {
      const savedModelSettings = localStorage.getItem('ai-chatbot-model-settings');
      const savedChatSettings = localStorage.getItem('ai-chatbot-chat-settings');
      const savedAppearanceSettings = localStorage.getItem('ai-chatbot-appearance-settings');
      const savedVoiceSettings = localStorage.getItem('ai-chatbot-voice-settings');
      const savedPrivacySettings = localStorage.getItem('ai-chatbot-privacy-settings');

      if (savedModelSettings) {
        setModelSettings({ ...defaultModelSettings, ...JSON.parse(savedModelSettings) });
      }
      if (savedChatSettings) {
        setChatSettings({ ...defaultChatSettings, ...JSON.parse(savedChatSettings) });
      }
      if (savedAppearanceSettings) {
        setAppearanceSettings({ ...defaultAppearanceSettings, ...JSON.parse(savedAppearanceSettings) });
      }
      if (savedVoiceSettings) {
        setVoiceSettings({ ...defaultVoiceSettings, ...JSON.parse(savedVoiceSettings) });
      }
      if (savedPrivacySettings) {
        setPrivacySettings({ ...defaultPrivacySettings, ...JSON.parse(savedPrivacySettings) });
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

  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('ai-chatbot-voice-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const updatePrivacySettings = useCallback((settings: Partial<PrivacySettings>) => {
    setPrivacySettings(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('ai-chatbot-privacy-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // ========================================
  // SETTINGS MANAGEMENT FUNCTIONS
  // ========================================

  const resetSettingsToDefaults = useCallback(() => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    setVoiceSettings(defaultVoiceSettings);
    setPrivacySettings(defaultPrivacySettings);
    
    localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(defaultModelSettings));
    localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(defaultChatSettings));
    localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(defaultAppearanceSettings));
    localStorage.setItem('ai-chatbot-voice-settings', JSON.stringify(defaultVoiceSettings));
    localStorage.setItem('ai-chatbot-privacy-settings', JSON.stringify(defaultPrivacySettings));
  }, []);

  const exportSettings = useCallback((): string => {
    const settings = {
      model: modelSettings,
      chat: chatSettings,
      appearance: appearanceSettings,
      voice: voiceSettings,
      privacy: privacySettings,
      exportedAt: new Date().toISOString(),
      version: '2.1'
    };
    return JSON.stringify(settings, null, 2);
  }, [modelSettings, chatSettings, appearanceSettings, voiceSettings, privacySettings]);

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

      if (settings.voice) {
        const newVoiceSettings = { ...defaultVoiceSettings, ...settings.voice };
        setVoiceSettings(newVoiceSettings);
        localStorage.setItem('ai-chatbot-voice-settings', JSON.stringify(newVoiceSettings));
      }

      if (settings.privacy) {
        const newPrivacySettings = { ...defaultPrivacySettings, ...settings.privacy };
        setPrivacySettings(newPrivacySettings);
        localStorage.setItem('ai-chatbot-privacy-settings', JSON.stringify(newPrivacySettings));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

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
    
    // Quota & Usage
    usage,
    updateUsage,
    refreshUsage,
    canSendMessage,
    getRemainingMessages,
    getQuotaLimit,
    quotaUsed,
    quotaLimit,
    
    // Settings
    modelSettings,
    chatSettings,
    appearanceSettings,
    voiceSettings,
    privacySettings,
    
    // Settings update functions
    updateModelSettings,
    updateChatSettings,
    updateAppearanceSettings,
    updateVoiceSettings,
    updatePrivacySettings,
    
    // Settings management
    resetSettingsToDefaults,
    exportSettings,
    importSettings,
    
    // Auth actions
    login,
    logout,
    register,
    initializeGuest,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};