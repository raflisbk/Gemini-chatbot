'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/lib/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUsage: () => void;
  remainingQuota: number;
  isAdmin: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'gemini-auth';
const USAGE_KEY = 'gemini-usage';
const GUEST_USAGE_KEY = 'gemini-guest-usage';
const USERS_KEY = 'gemini-users';

const GUEST_QUOTA = 10; // 10 messages per day for guests
const USER_QUOTA = 50; // 50 messages per day for logged in users  
const ADMIN_QUOTA = 500; // 500 messages per day for admin

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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  const [remainingQuota, setRemainingQuota] = useState(GUEST_QUOTA);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // Initialize with admin user and check auth
  useEffect(() => {
    initializeUsers();
    checkAuthStatus();
    updateQuotaDisplay();
  }, []);

  const initializeUsers = () => {
    try {
      const storedUsers = localStorage.getItem(USERS_KEY);
      if (!storedUsers) {
        // Create default admin user
        const defaultUsers: StoredUser[] = [
          {
            id: 'admin-001',
            email: 'admin@aichatbot.com',
            password: 'admin123!@#',
            name: 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString(),
            isActive: true
          }
        ];
        localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
      }
    } catch (error) {
      console.error('Failed to initialize users:', error);
    }
  };

  const getUsers = (): StoredUser[] => {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  };

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
          setAuthState({
            user: user,
            isAuthenticated: true,
            isLoading: false,
          });
          setIsAdmin(user.role === 'admin');
          setIsGuest(false);
        } else {
          // Session expired - back to guest mode
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
        // No auth - guest mode
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

  const updateQuotaDisplay = () => {
    try {
      const today = new Date().toDateString();
      
      if (isGuest) {
        // Guest quota from separate storage
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
        // Logged in user quota
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password && u.isActive);
      
      if (user) {
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
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setIsAdmin(false);
    setIsGuest(true);
    updateQuotaDisplay(); // Reset to guest quota
  };

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
          // New day
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

  // Update quota when auth state changes
  useEffect(() => {
    updateQuotaDisplay();
  }, [authState, isGuest]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        updateUsage,
        remainingQuota,
        isAdmin,
        isGuest,
      }}
    >
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

// Admin utilities untuk manage users (unchanged)
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
        isActive: true
      };

      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

  static deactivateUser(userId: string): boolean {
    try {
      const users = UserManager.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        users[userIndex].isActive = false;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      return false;
    }
  }

  static activateUser(userId: string): boolean {
    try {
      const users = UserManager.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        users[userIndex].isActive = true;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to activate user:', error);
      return false;
    }
  }

  static updateUserRole(userId: string, role: 'admin' | 'user'): boolean {
    try {
      const users = UserManager.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        users[userIndex].role = role;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update user role:', error);
      return false;
    }
  }
}