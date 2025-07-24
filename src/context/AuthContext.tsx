// src/context/AuthContext.tsx - FIXED VERSION
'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { ClientAuth, ClientAuthUser } from '@/lib/auth-client';

// ========================================
// INTERFACES - KEEP ALL EXISTING TYPES
// ========================================

export interface ModelSettings {
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
}

export interface ChatSettings {
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

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  avatarStyle: 'circle' | 'square';
  sidebarPosition: 'left' | 'right';
  accentColor: string;
  primaryColor: string;
  borderRadius: number;
  compactUI: boolean;
  animations: boolean;
  transparency: number;
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

export interface AuthState {
  user: ClientAuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  guestSession: GuestSession | null;
}

export interface GuestSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  messageCount: number;
  isActive: boolean;
}

export interface Usage {
  used: number;
  limit: number;
  resetAt: Date;
}

export interface AuthContextType {
  // Authentication state
  user: ClientAuthUser | null;
  guestSession: GuestSession | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  
  // FIXED: Quota & Usage - updateUsage MUST accept number parameter
  usage: Usage;
  updateUsage: (increment?: number) => void; // FIXED: number parameter, not string
  refreshUsage: () => Promise<void>;
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
  getQuotaLimit: () => number;
  quotaUsed: number;
  quotaLimit: number;
  
  // Auth token
  getAuthToken: () => string | null;
  
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  initializeGuest: () => void;
}

// ========================================
// DEFAULT SETTINGS - KEEP ALL EXISTING
// ========================================

const defaultModelSettings: ModelSettings = {
  model: 'gemini-2.5-flash',
  maxTokens: 8000,
  temperature: 0.7,
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
// AUTH PROVIDER COMPONENT - FIXED
// ========================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ========================================
  // AUTH STATE
  // ========================================
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isGuest: false,
    isLoading: true,
    error: null,
    guestSession: null,
  });

  // ========================================
  // SETTINGS STATE - KEEP ALL EXISTING
  // ========================================
  
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);

  // ========================================
  // USAGE STATE - KEEP ALL EXISTING
  // ========================================
  
  const [usage, setUsage] = useState<Usage>({
    used: 0,
    limit: 25,
    resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  const isAdmin = authState.user?.role === 'admin';
  const quotaUsed = usage.used;
  const quotaLimit = usage.limit;

  // ========================================
  // INITIALIZE AUTH - FIXED TO USE CLIENT-SAFE AUTH
  // ========================================
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        // Check for stored token
        const token = ClientAuth.getStoredToken();
        
        if (token && !ClientAuth.isTokenExpired(token)) {
          // Verify token with server
          const result = await ClientAuth.verifyToken(token);
          
          if (result.success && result.user) {
            setAuthState({
              user: result.user,
              isAuthenticated: true,
              isGuest: false,
              isLoading: false,
              error: null,
              guestSession: null,
            });
            
            // Load user usage
            await refreshUsage();
            return;
          }
        }

        // No valid auth, check for guest session
        const guestData = localStorage.getItem('guest-session');
        if (guestData) {
          try {
            const guestSession: GuestSession = JSON.parse(guestData);
            if (new Date() < new Date(guestSession.expiresAt) && guestSession.isActive) {
              setAuthState({
                user: null,
                isAuthenticated: false,
                isGuest: true,
                isLoading: false,
                error: null,
                guestSession,
              });
              
              // Set guest usage
              setUsage({
                used: guestSession.messageCount,
                limit: 5, // Guest limit
                resetAt: new Date(guestSession.expiresAt),
              });
              return;
            }
          } catch (error) {
            console.error('Invalid guest session data:', error);
            localStorage.removeItem('guest-session');
          }
        }

        // No valid session found
        setAuthState({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          isLoading: false,
          error: null,
          guestSession: null,
        });

      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
          guestSession: null,
        });
      }
    };

    initializeAuth();
  }, []);

  // ========================================
  // LOAD SETTINGS - KEEP ALL EXISTING
  // ========================================
  
  useEffect(() => {
    const loadSettings = () => {
      try {
        // Load model settings
        const savedModelSettings = localStorage.getItem('ai-chatbot-model-settings');
        if (savedModelSettings) {
          const parsed = JSON.parse(savedModelSettings);
          setModelSettings({ ...defaultModelSettings, ...parsed });
        }

        // Load chat settings
        const savedChatSettings = localStorage.getItem('ai-chatbot-chat-settings');
        if (savedChatSettings) {
          const parsed = JSON.parse(savedChatSettings);
          setChatSettings({ ...defaultChatSettings, ...parsed });
        }

        // Load appearance settings
        const savedAppearanceSettings = localStorage.getItem('ai-chatbot-appearance-settings');
        if (savedAppearanceSettings) {
          const parsed = JSON.parse(savedAppearanceSettings);
          setAppearanceSettings({ ...defaultAppearanceSettings, ...parsed });
        }

        // Load voice settings
        const savedVoiceSettings = localStorage.getItem('ai-chatbot-voice-settings');
        if (savedVoiceSettings) {
          const parsed = JSON.parse(savedVoiceSettings);
          setVoiceSettings({ ...defaultVoiceSettings, ...parsed });
        }

        // Load privacy settings
        const savedPrivacySettings = localStorage.getItem('ai-chatbot-privacy-settings');
        if (savedPrivacySettings) {
          const parsed = JSON.parse(savedPrivacySettings);
          setPrivacySettings({ ...defaultPrivacySettings, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  // ========================================
  // AUTH FUNCTIONS - UPDATED TO USE CLIENT AUTH
  // ========================================
  
  const getAuthToken = useCallback((): string | null => {
    return ClientAuth.getStoredToken();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const result = await ClientAuth.login(email, password);

      if (result.success && result.user) {
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isGuest: false,
          isLoading: false,
          error: null,
          guestSession: null,
        });

        // Clear guest session if exists
        localStorage.removeItem('guest-session');
        
        // Load user usage
        await refreshUsage();

        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Login failed',
        }));

        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error during login';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const result = await ClientAuth.register(email, password, name);

      if (result.success && result.user) {
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isGuest: false,
          isLoading: false,
          error: null,
          guestSession: null,
        });

        // Clear guest session if exists
        localStorage.removeItem('guest-session');
        
        // Load user usage
        await refreshUsage();

        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Registration failed',
        }));

        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error during registration';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await ClientAuth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isGuest: false,
        isLoading: false,
        error: null,
        guestSession: null,
      });
    }
  }, []);

  const initializeGuest = useCallback(() => {
    const guestSession: GuestSession = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      messageCount: 0,
      isActive: true,
    };

    localStorage.setItem('guest-session', JSON.stringify(guestSession));

    setAuthState({
      user: null,
      isAuthenticated: false,
      isGuest: true,
      isLoading: false,
      error: null,
      guestSession,
    });

    setUsage({
      used: 0,
      limit: 5, // Guest limit
      resetAt: guestSession.expiresAt,
    });
  }, []);

  // ========================================
  // USAGE FUNCTIONS - FIXED updateUsage PARAMETER TYPE
  // ========================================
  
  const updateUsage = useCallback((increment: number = 1) => {
    setUsage(prev => {
      const newUsed = Math.min(prev.used + increment, prev.limit);
      
      // Update guest session if in guest mode
      if (authState.isGuest && authState.guestSession) {
        const updatedGuestSession = {
          ...authState.guestSession,
          messageCount: newUsed,
        };
        localStorage.setItem('guest-session', JSON.stringify(updatedGuestSession));
        
        setAuthState(prev => ({
          ...prev,
          guestSession: updatedGuestSession,
        }));
      }
      
      return {
        ...prev,
        used: newUsed,
      };
    });
  }, [authState.isGuest, authState.guestSession]);

  const refreshUsage = useCallback(async () => {
    if (authState.isAuthenticated && authState.user) {
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch('/api/user/usage', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUsage({
            used: data.used || 0,
            limit: data.limit || 25,
            resetAt: new Date(data.resetAt || Date.now() + 24 * 60 * 60 * 1000),
          });
        }
      } catch (error) {
        console.error('Failed to refresh usage:', error);
      }
    }
  }, [authState.isAuthenticated, authState.user, getAuthToken]);

  const canSendMessage = useCallback((): boolean => {
    return usage.used < usage.limit;
  }, [usage.used, usage.limit]);

  const getRemainingMessages = useCallback((): number => {
    return Math.max(0, usage.limit - usage.used);
  }, [usage.used, usage.limit]);

  const getQuotaLimit = useCallback((): number => {
    return usage.limit;
  }, [usage.limit]);

  // ========================================
  // SETTINGS FUNCTIONS - KEEP ALL EXISTING
  // ========================================
  
  const updateModelSettings = useCallback((settings: Partial<ModelSettings>) => {
    const newSettings = { ...modelSettings, ...settings };
    setModelSettings(newSettings);
    localStorage.setItem('ai-chatbot-model-settings', JSON.stringify(newSettings));
  }, [modelSettings]);

  const updateChatSettings = useCallback((settings: Partial<ChatSettings>) => {
    const newSettings = { ...chatSettings, ...settings };
    setChatSettings(newSettings);
    localStorage.setItem('ai-chatbot-chat-settings', JSON.stringify(newSettings));
  }, [chatSettings]);

  const updateAppearanceSettings = useCallback((settings: Partial<AppearanceSettings>) => {
    const newSettings = { ...appearanceSettings, ...settings };
    setAppearanceSettings(newSettings);
    localStorage.setItem('ai-chatbot-appearance-settings', JSON.stringify(newSettings));
  }, [appearanceSettings]);

  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    const newSettings = { ...voiceSettings, ...settings };
    setVoiceSettings(newSettings);
    localStorage.setItem('ai-chatbot-voice-settings', JSON.stringify(newSettings));
  }, [voiceSettings]);

  const updatePrivacySettings = useCallback((settings: Partial<PrivacySettings>) => {
    const newSettings = { ...privacySettings, ...settings };
    setPrivacySettings(newSettings);
    localStorage.setItem('ai-chatbot-privacy-settings', JSON.stringify(newSettings));
  }, [privacySettings]);

  const resetSettingsToDefaults = useCallback(() => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    setVoiceSettings(defaultVoiceSettings);
    setPrivacySettings(defaultPrivacySettings);

    localStorage.removeItem('ai-chatbot-model-settings');
    localStorage.removeItem('ai-chatbot-chat-settings');
    localStorage.removeItem('ai-chatbot-appearance-settings');
    localStorage.removeItem('ai-chatbot-voice-settings');
    localStorage.removeItem('ai-chatbot-privacy-settings');
  }, []);

  const exportSettings = useCallback(() => {
    const allSettings = {
      model: modelSettings,
      chat: chatSettings,
      appearance: appearanceSettings,
      voice: voiceSettings,
      privacy: privacySettings,
    };
    return JSON.stringify(allSettings, null, 2);
  }, [modelSettings, chatSettings, appearanceSettings, voiceSettings, privacySettings]);

  const importSettings = useCallback((settingsJson: string) => {
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
    
    // Auth token getter
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