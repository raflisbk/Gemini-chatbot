// src/context/AuthContext.tsx - ENHANCED VERSION with Database Integration
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyToken } from '@/lib/auth';
import { getUserById, trackUsage } from '@/lib/supabase';

// ========================================
// INTERFACES & TYPES (Keep existing structure)
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
  
  // FIXED: Add auth token getter for API calls
  getAuthToken: () => Promise<string | null>;
  
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
// QUOTA CONSTANTS (Keep existing values)
// ========================================

const QUOTA_LIMITS = {
  guest: 5,
  user: 25,
  admin: Infinity
};

// ========================================
// DEFAULT VALUES (Keep existing structure)
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
  // FIXED: Enhanced auth token getter for API calls
  // ========================================

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      // Verify token is still valid
      const decoded = await verifyToken(token);
      if (!decoded) {
        localStorage.removeItem('auth_token');
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      localStorage.removeItem('auth_token');
      return null;
    }
  }, []);

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

  // FIXED: Enhanced initialization with proper database integration
  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Check for existing auth token
      const token = localStorage.getItem('auth_token');
      if (token) {
        const isValid = await verifyToken(token);
        if (isValid) {
          // Load user data from database
          const userData = await getUserById(isValid.userId);
          if (userData && userData.is_active) {
            const user = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role as 'admin' | 'user',
              isActive: userData.is_active,
              avatarUrl: userData.avatar_url,
              photoURL: userData.avatar_url,
              messageCount: userData.message_count,
              lastLogin: userData.last_login,
              settings: userData.settings,
              created_at: userData.created_at,
              updated_at: userData.updated_at
            };
            
            setAuthState(prev => ({
              ...prev,
              isAuthenticated: true,
              user,
              isGuest: false,
              guestSession: null,
              isLoading: false
            }));
            
            await refreshUsage();
            return;
          }
        }
        // If token is invalid, remove it
        localStorage.removeItem('auth_token');
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

  // ========================================
  // QUOTA MANAGEMENT (Enhanced with database tracking)
  // ========================================

  const loadQuotaUsage = useCallback(async () => {
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
        // FIXED: Load from database for authenticated users
        try {
          const token = await getAuthToken();
          if (token) {
            const response = await fetch('/api/usage', {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (response.ok) {
              const data = await response.json();
              setQuotaUsed(data.usage?.messageCount || 0);
              setUsage(data.usage);
            } else {
              // Fallback to stored value
              setQuotaUsed(authState.user.messageCount || 0);
            }
          }
        } catch (error) {
          console.error('Error loading user quota from database:', error);
          setQuotaUsed(authState.user.messageCount || 0);
        }
      }
    } catch (error) {
      console.error('Error loading quota usage:', error);
    }
  }, [userRole, authState.user, getAuthToken]);

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
  // GUEST SESSION MANAGEMENT (Enhanced)
  // ========================================

  const initializeGuest = async (): Promise<void> => {
    try {
      // Try to create guest session via API
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
  // AUTHENTICATION ACTIONS (Enhanced)
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
        
        // FIXED: Get user data from database after login
        const userData = await getUserById(data.user.id);
        const user = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role as 'admin' | 'user',
          isActive: userData.is_active,
          avatarUrl: userData.avatar_url,
          photoURL: userData.avatar_url,
          messageCount: userData.message_count,
          lastLogin: userData.last_login,
          settings: userData.settings,
          created_at: userData.created_at,
          updated_at: userData.updated_at
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
        
        // FIXED: Get user data from database after registration
        const userDataFromDB = await getUserById(data.user.id);
        const user = {
          id: userDataFromDB.id,
          email: userDataFromDB.email,
          name: userDataFromDB.name,
          role: userDataFromDB.role as 'admin' | 'user',
          isActive: userDataFromDB.is_active,
          avatarUrl: userDataFromDB.avatar_url,
          photoURL: userDataFromDB.avatar_url,
          messageCount: userDataFromDB.message_count,
          lastLogin: userDataFromDB.last_login,
          settings: userDataFromDB.settings,
          created_at: userDataFromDB.created_at,
          updated_at: userDataFromDB.updated_at
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
  // USAGE TRACKING (Enhanced with database)
  // ========================================

  const refreshUsage = useCallback(async () => {
    try {
      const token = await getAuthToken();
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
  }, [getAuthToken]);

  // FIXED: Enhanced usage tracking with database integration
  const updateUsage = useCallback(async (type: 'message' | 'file') => {
    if (authState.isAuthenticated && authState.user) {
      // Update local state immediately
      setUsage(prev => ({
        ...prev,
        messageCount: type === 'message' ? prev.messageCount + 1 : prev.messageCount,
        fileUploads: type === 'file' ? prev.fileUploads + 1 : prev.fileUploads,
      }));
      
      if (type === 'message') {
        setQuotaUsed(prev => prev + 1);
      }

      // FIXED: Track usage in database with correct parameter type
      try {
        await trackUsage(authState.user.id, type === 'file' ? 'file_upload' : type);
      } catch (error) {
        console.error('Error tracking usage in database:', error);
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
  // SETTINGS MANAGEMENT (Keep existing functionality)
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
  // SETTINGS MANAGEMENT FUNCTIONS (Keep existing)
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
    
    // FIXED: Add auth token getter
    getAuthToken,
    
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