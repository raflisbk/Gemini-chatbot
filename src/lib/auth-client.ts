// src/lib/auth-client.ts - CLIENT-SAFE AUTH UTILITIES
// File baru untuk handling auth di client-side tanpa JWT_SECRET

export interface ClientAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  sessionId?: string;
}

export interface ClientAuthResult {
  success: boolean;
  user?: ClientAuthUser;
  token?: string;
  error?: string;
}

// Client-side auth utilities yang tidak memerlukan JWT_SECRET
export class ClientAuth {
  // Check if token exists dan valid format (tanpa verify signature)
  static hasValidTokenFormat(token: string): boolean {
    try {
      if (!token) return false;
      
      // Basic JWT format check (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Try to decode payload (tanpa verify signature)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token has required fields
      return !!(payload.userId && payload.email && payload.exp);
    } catch {
      return false;
    }
  }

  // Get token payload tanpa verification (hanya untuk UI purposes)
  static getTokenPayload(token: string): any | null {
    try {
      if (!this.hasValidTokenFormat(token)) return null;
      
      const parts = token.split('.');
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  }

  // Check if token is expired (client-side check only)
  static isTokenExpired(token: string): boolean {
    try {
      const payload = this.getTokenPayload(token);
      if (!payload?.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  // Login function that calls server API
  static async login(email: string, password: string): Promise<ClientAuthResult> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token in localStorage for client-side access
        if (data.token) {
          localStorage.setItem('auth-token', data.token);
        }

        return {
          success: true,
          user: data.user,
          token: data.token,
        };
      }

      return {
        success: false,
        error: data.error || 'Login failed',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  // Register function
  static async register(email: string, password: string, name: string): Promise<ClientAuthResult> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.token) {
          localStorage.setItem('auth-token', data.token);
        }

        return {
          success: true,
          user: data.user,
          token: data.token,
        };
      }

      return {
        success: false,
        error: data.error || 'Registration failed',
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  // Verify token with server
  static async verifyToken(token: string): Promise<ClientAuthResult> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          token: token,
        };
      }

      // Token invalid, remove from storage
      localStorage.removeItem('auth-token');
      
      return {
        success: false,
        error: data.error || 'Token verification failed',
      };
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('auth-token');
      
      return {
        success: false,
        error: 'Network error during verification',
      };
    }
  }

  // Logout function
  static async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('auth-token');
      
      if (token) {
        // Call logout endpoint
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
      // Always clear local storage
      localStorage.removeItem('auth-token');
    }
  }

  // Get stored token
  static getStoredToken(): string | null {
    try {
      return localStorage.getItem('auth-token');
    } catch {
      return null;
    }
  }

  // Get user from stored token (client-side only)
  static getUserFromToken(): ClientAuthUser | null {
    try {
      const token = this.getStoredToken();
      if (!token || !this.hasValidTokenFormat(token)) return null;
      
      const payload = this.getTokenPayload(token);
      if (!payload) return null;
      
      return {
        id: payload.userId,
        email: payload.email,
        name: payload.name || payload.email,
        role: payload.role || 'user',
        isActive: true,
        sessionId: payload.sessionId,
      };
    } catch {
      return null;
    }
  }
}