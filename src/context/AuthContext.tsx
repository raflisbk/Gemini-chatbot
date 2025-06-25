'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/lib/types';

// Settings interfaces
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

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUsage: () => void;
  remainingQuota: number;
  isAdmin: boolean;
  isGuest: boolean;
  // Settings methods
  modelSettings: ModelSettings;
  chatSettings: ChatSettings;
  appearanceSettings: AppearanceSettings;
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  resetSettingsToDefaults: () => void;
  exportSettings: () => void;
  importSettings: (settingsData: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEY = 'gemini-auth';
const USAGE_KEY = 'gemini-usage';
const GUEST_USAGE_KEY = 'gemini-guest-usage';
const USERS_KEY = 'gemini-users';
const MODEL_SETTINGS_KEY = 'ai-chatbot-model-settings';
const CHAT_SETTINGS_KEY = 'ai-chatbot-chat-settings';
const APPEARANCE_SETTINGS_KEY = 'ai-chatbot-appearance-settings';

// Quotas
const GUEST_QUOTA = 10;
const USER_QUOTA = 50;
const ADMIN_QUOTA = 500;

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

interface StoredAuth {
  user: User & { role: 'admin' | 'user' };
  loginTime: string;
}

interface UsageData {
  date: string;
  count: number;
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  isActive: boolean;
  lastLogin?: string;
  messageCount: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  const [remainingQuota, setRemainingQuota] = useState(GUEST_QUOTA);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // Settings state
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);

  // Initialize everything on mount
  useEffect(() => {
    initializeUsers();
    loadSettings();
    checkAuthStatus();
    updateQuotaDisplay();
  }, []);

  // Apply appearance settings when they change
  useEffect(() => {
    applyAppearanceSettings();
  }, [appearanceSettings]);

  // Update quota when auth state changes
  useEffect(() => {
    updateQuotaDisplay();
  }, [authState, isGuest]);

  // Initialize default admin user
  const initializeUsers = () => {
    try {
      const storedUsers = localStorage.getItem(USERS_KEY);
      if (!storedUsers) {
        const defaultUsers: StoredUser[] = [
          {
            id: 'admin-001',
            email: 'admin@aichatbot.com',
            password: 'admin123!@#',
            name: 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString(),
            isActive: true,
            lastLogin: undefined,
            messageCount: 0
          }
        ];
        localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
        console.log('✅ Default admin user created');
      }
    } catch (error) {
      console.error('Failed to initialize users:', error);
    }
  };

  // Load all settings from localStorage
  const loadSettings = () => {
    try {
      const savedModelSettings = localStorage.getItem(MODEL_SETTINGS_KEY);
      const savedChatSettings = localStorage.getItem(CHAT_SETTINGS_KEY);
      const savedAppearanceSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);

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

  // Apply appearance settings to DOM
  const applyAppearanceSettings = () => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    
    // Apply theme
    const isDark = appearanceSettings.theme === 'dark' || 
      (appearanceSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);

    // Apply font size
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

    // Apply accent color
    const hex = appearanceSettings.accentColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const [h, s, l] = rgbToHsl(r, g, b);
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);

    // Apply sidebar position
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

  // Get users from localStorage
  const getUsers = (): StoredUser[] => {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  };

  // Check authentication status
  const checkAuthStatus = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { user, loginTime }: StoredAuth = JSON.parse(stored);
        
        // Check if login is still valid (24 hours)
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          console.log('✅ Valid session found for:', user.name);
          setAuthState({
            user: user,
            isAuthenticated: true,
            isLoading: false,
          });
          setIsAdmin(user.role === 'admin');
          setIsGuest(false);
        } else {
          console.log('⏰ Session expired, logging out');
          localStorage.removeItem(STORAGE_KEY);
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          setIsAdmin(false);
          setIsGuest(true);
        }
      } else {
        console.log('👤 No session found, using guest mode');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        setIsAdmin(false);
        setIsGuest(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      setIsAdmin(false);
      setIsGuest(true);
    }
  };

  // Update quota display
  const updateQuotaDisplay = () => {
    try {
      const today = new Date().toDateString();
      
      if (isGuest) {
        const stored = localStorage.getItem(GUEST_USAGE_KEY);
        if (stored) {
          const usage: UsageData = JSON.parse(stored);
          if (usage.date === today) {
            setRemainingQuota(Math.max(0, GUEST_QUOTA - usage.count));
          } else {
            setRemainingQuota(GUEST_QUOTA);
          }
        } else {
          setRemainingQuota(GUEST_QUOTA);
        }
      } else {
        const stored = localStorage.getItem(USAGE_KEY);
        const currentUser = authState.user as (User & { role: 'admin' | 'user' }) | null;
        const maxQuota = currentUser?.role === 'admin' ? ADMIN_QUOTA : USER_QUOTA;
        
        if (stored) {
          const usage: UsageData = JSON.parse(stored);
          if (usage.date === today) {
            setRemainingQuota(Math.max(0, maxQuota - usage.count));
          } else {
            setRemainingQuota(maxQuota);
          }
        } else {
          setRemainingQuota(maxQuota);
        }
      }
    } catch (error) {
      console.error('Quota check error:', error);
      setRemainingQuota(GUEST_QUOTA);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔍 Login attempt for:', email);
    try {
      const users = getUsers();
      console.log('📋 Available users:', users.map(u => ({ email: u.email, role: u.role, isActive: u.isActive })));
      
      const user = users.find(u => u.email === email && u.password === password && u.isActive);
      
      if (user) {
        console.log('✅ User found:', { name: user.name, role: user.role });
        
        // Update last login
        const updatedUsers = users.map(u => 
          u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
        );
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
        
        const authUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };

        const authData: StoredAuth = {
          user: authUser,
          loginTime: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
        
        setAuthState({
          user: authUser,
          isAuthenticated: true,
          isLoading: false,
        });

        setIsAdmin(user.role === 'admin');
        setIsGuest(false);
        updateQuotaDisplay();
        
        console.log('🎉 Login successful!');
        return true;
      }
      
      console.log('❌ Login failed: Invalid credentials or inactive user');
      return false;
    } catch (error) {
      console.error('💥 Login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    console.log('👋 Logging out');
    localStorage.removeItem(STORAGE_KEY);
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setIsAdmin(false);
    setIsGuest(true);
    updateQuotaDisplay();
  };

  // Update usage
  const updateUsage = () => {
    try {
      const today = new Date().toDateString();
      const storageKey = isGuest ? GUEST_USAGE_KEY : USAGE_KEY;
      const stored = localStorage.getItem(storageKey);
      
      const currentUser = authState.user as (User & { role: 'admin' | 'user' }) | null;
      const maxQuota = isGuest 
        ? GUEST_QUOTA 
        : currentUser?.role === 'admin' 
          ? ADMIN_QUOTA 
          : USER_QUOTA;
      
      let usage: UsageData;
      if (stored) {
        usage = JSON.parse(stored);
        if (usage.date === today) {
          usage.count += 1;
        } else {
          usage = { date: today, count: 1 };
        }
      } else {
        usage = { date: today, count: 1 };
      }

      localStorage.setItem(storageKey, JSON.stringify(usage));
      setRemainingQuota(Math.max(0, maxQuota - usage.count));
    } catch (error) {
      console.error('Usage update error:', error);
    }
  };

  // Settings management functions
  const updateModelSettings = (newSettings: Partial<ModelSettings>) => {
    const updated = { ...modelSettings, ...newSettings };
    setModelSettings(updated);
    localStorage.setItem(MODEL_SETTINGS_KEY, JSON.stringify(updated));
    console.log('🤖 Model settings updated:', newSettings);
  };

  const updateChatSettings = (newSettings: Partial<ChatSettings>) => {
    const updated = { ...chatSettings, ...newSettings };
    setChatSettings(updated);
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(updated));
    console.log('💬 Chat settings updated:', newSettings);
  };

  const updateAppearanceSettings = (newSettings: Partial<AppearanceSettings>) => {
    const updated = { ...appearanceSettings, ...newSettings };
    setAppearanceSettings(updated);
    localStorage.setItem(APPEARANCE_SETTINGS_KEY, JSON.stringify(updated));
    console.log('🎨 Appearance settings updated:', newSettings);
  };

  const resetSettingsToDefaults = () => {
    setModelSettings(defaultModelSettings);
    setChatSettings(defaultChatSettings);
    setAppearanceSettings(defaultAppearanceSettings);
    
    localStorage.removeItem(MODEL_SETTINGS_KEY);
    localStorage.removeItem(CHAT_SETTINGS_KEY);
    localStorage.removeItem(APPEARANCE_SETTINGS_KEY);
    
    console.log('🔄 Settings reset to defaults');
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
    
    console.log('📄 Settings exported');
  };

  const importSettings = (settingsData: string): boolean => {
    try {
      const data = JSON.parse(settingsData);
      
      if (data.modelSettings) {
        updateModelSettings(data.modelSettings);
      }
      if (data.chatSettings) {
        updateChatSettings(data.chatSettings);
      }
      if (data.appearanceSettings) {
        updateAppearanceSettings(data.appearanceSettings);
      }
      
      console.log('📥 Settings imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    updateUsage,
    remainingQuota,
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
    importSettings
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

// User Management utilities
export class UserManager {
  static addUser(email: string, password: string, name: string, role: 'admin' | 'user' = 'user'): boolean {
    try {
      const users = UserManager.getUsers();
      
      if (users.find(u => u.email === email)) {
        return false;
      }

      const newUser: StoredUser = {
        id: `user-${Date.now()}`,
        email,
        password,
        name,
        role,
        createdAt: new Date().toISOString(),
        isActive: true,
        messageCount: 0
      };

      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      console.log('👤 User added:', { email, name, role });
      return true;
    } catch (error) {
      console.error('Failed to add user:', error);
      return false;
    }
  }

  static getUsers(): StoredUser[] {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  static updateUserStatus(userId: string, isActive: boolean): boolean {
    try {
      const users = UserManager.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        users[userIndex].isActive = isActive;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        console.log(`👤 User ${isActive ? 'activated' : 'deactivated'}:`, users[userIndex].email);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update user status:', error);
      return false;
    }
  }

  static deleteUser(userId: string): boolean {
    try {
      if (userId === 'admin-001') {
        console.warn('Cannot delete default admin user');
        return false;
      }
      
      const users = UserManager.getUsers();
      const filteredUsers = users.filter(u => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
      console.log('👤 User deleted:', userId);
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }
}