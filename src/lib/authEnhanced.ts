// src/lib/authEnhanced.ts
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { supabaseAdmin, getUserByEmail, getUserById, updateUserLastLogin } from './supabase';
import { cacheManager } from './redis';
import type { User } from './supabase';

// ========================================
// ENHANCED AUTH CONFIGURATION
// ========================================

const JWT_SECRET: Secret = process.env.JWT_SECRET as Secret;
const REFRESH_SECRET: Secret = ((process.env.REFRESH_SECRET as string) || (process.env.JWT_SECRET as string) + '_refresh') as Secret;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Short-lived
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // Long-lived
const SESSION_TIMEOUT_HOURS = parseInt(process.env.SESSION_TIMEOUT_HOURS || '168'); // 7 days
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// ========================================
// ENHANCED INTERFACES
// ========================================

export interface EnhancedAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: string;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  sessionId: string;
  tokenType: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenType: 'refresh';
  iat: number;
  exp: number;
}

export interface EnhancedAuthResult {
  success: boolean;
  user?: EnhancedAuthUser;
  tokens?: TokenPair;
  error?: string;
  errorCode?: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  refreshTokenHash: string;
  accessTokenHash: string;
  expiresAt: Date;
  lastUsed: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
}

// ========================================
// TOKEN MANAGEMENT
// ========================================

export class TokenManager {
  // Generate access token (short-lived)
  static async generateAccessToken(user: User, sessionId: string): Promise<string> {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'admin' | 'user',
      sessionId,
      tokenType: 'access',
    };

    return jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: ACCESS_TOKEN_EXPIRY as string | number,
      issuer: 'ai-chatbot',
      audience: 'ai-chatbot-users',
      subject: user.id,
    } as jwt.SignOptions);
  }

  // Generate refresh token (long-lived)
  static async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      sessionId,
      tokenType: 'refresh',
    };

    return jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'ai-chatbot',
      audience: 'ai-chatbot-users',
      subject: userId,
    } as jwt.SignOptions);
  }

  // Verify access token
  static async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'ai-chatbot',
        audience: 'ai-chatbot-users',
      }) as AccessTokenPayload;

      // Validate token type
      if (decoded.tokenType !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if session is still valid in database
      const session = await SessionManager.getSession(decoded.sessionId);
      if (!session || !session.isActive) {
        throw new Error('Session not found or inactive');
      }

      // Check if token is blacklisted
      const isBlacklisted = await cacheManager.exists(
        `blacklist:${token}`, 
        'auth'
      );
      
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const decoded = jwt.verify(token, REFRESH_SECRET, {
        issuer: 'ai-chatbot',
        audience: 'ai-chatbot-users',
      }) as RefreshTokenPayload;

      // Validate token type
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if session exists and token matches
      const session = await SessionManager.getSession(decoded.sessionId);
      if (!session || !session.isActive) {
        throw new Error('Session not found or inactive');
      }

      // Verify refresh token hash
      const tokenHash = await this.hashToken(token);
      const isValidToken = await bcrypt.compare(token, session.refreshTokenHash);
      
      if (!isValidToken) {
        throw new Error('Invalid refresh token');
      }

      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Hash token for storage
  static async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10); // Lower rounds for tokens
  }

  // Generate secure session ID
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Blacklist token
  static async blacklistToken(token: string, ttlSeconds?: number): Promise<boolean> {
    try {
      // Extract expiry from token for TTL
      let expiryTTL = ttlSeconds;
      
      if (!expiryTTL) {
        try {
          const decoded = jwt.decode(token) as any;
          if (decoded && decoded.exp) {
            const now = Math.floor(Date.now() / 1000);
            expiryTTL = Math.max(decoded.exp - now, 0);
          }
        } catch {
          expiryTTL = 3600; // Default 1 hour
        }
      }

      return await cacheManager.set(
        `blacklist:${token}`, 
        true, 
        expiryTTL || 3600, 
        'auth'
      );
    } catch (error) {
      console.error('Failed to blacklist token:', error);
      return false;
    }
  }
}

// ========================================
// SESSION MANAGEMENT
// ========================================

export class SessionManager {
  // Create new session
  static async createSession(
    user: User,
    userAgent?: string,
    ipAddress?: string
  ): Promise<EnhancedAuthResult> {
    try {
      const sessionId = TokenManager.generateSessionId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_TIMEOUT_HOURS);

      // Generate tokens
      const accessToken = await TokenManager.generateAccessToken(user, sessionId);
      const refreshToken = await TokenManager.generateRefreshToken(user.id, sessionId);

      // Hash tokens for storage
      const refreshTokenHash = await TokenManager.hashToken(refreshToken);
      const accessTokenHash = await TokenManager.hashToken(accessToken);

      // Create session record
      const { data: session, error } = await supabaseAdmin
        .from('user_sessions')
        .insert({
          id: sessionId,
          user_id: user.id,
          token_hash: accessTokenHash, // Keep for backward compatibility
          refresh_token_hash: refreshTokenHash,
          expires_at: expiresAt.toISOString(),
          user_agent: userAgent,
          ip_address: ipAddress,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Session creation error:', error);
        return {
          success: false,
          error: 'Failed to create session',
          errorCode: 'SESSION_CREATION_FAILED',
        };
      }

      // Update user last login
      await updateUserLastLogin(user.id);

      // Cache session for quick access
      await cacheManager.set(
        `session:${sessionId}`,
        {
          id: sessionId,
          userId: user.id,
          refreshTokenHash,
          accessTokenHash,
          expiresAt,
          lastUsed: new Date(),
          userAgent,
          ipAddress,
          isActive: true,
        },
        SESSION_TIMEOUT_HOURS * 3600,
        'auth'
      );

      const tokenPair: TokenPair = {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
        tokenType: 'Bearer',
      };

      const authUser: EnhancedAuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'user',
        isActive: user.is_active,
        lastLogin: new Date().toISOString(),
        sessionId,
      };

      return {
        success: true,
        user: authUser,
        tokens: tokenPair,
      };
    } catch (error) {
      console.error('Session creation error:', error);
      return {
        success: false,
        error: 'Failed to create session',
        errorCode: 'SESSION_CREATION_ERROR',
      };
    }
  }

  // Get session
  static async getSession(sessionId: string): Promise<SessionInfo | null> {
    try {
      // Try cache first
      let session = await cacheManager.get<SessionInfo>(`session:${sessionId}`, 'auth');
      
      if (session) {
        return session;
      }

      // Fallback to database
      type UserSessionRow = {
        id: string;
        user_id: string;
        refresh_token_hash: string;
        token_hash: string;
        expires_at: string;
        last_used: string;
        user_agent?: string;
        ip_address?: string;
        is_active: boolean;
      };

      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .select('id, user_id, refresh_token_hash, token_hash, expires_at, last_used, user_agent, ip_address, is_active')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single<UserSessionRow>();

      if (error || !data || typeof data !== 'object' || !('id' in data)) {
        return null;
      }

      session = {
        id: data.id,
        userId: data.user_id ?? '',
        refreshTokenHash: data.refresh_token_hash || '',
        accessTokenHash: data.token_hash,
        expiresAt: new Date(data.expires_at),
        lastUsed: new Date(data.last_used),
        userAgent: data.user_agent ?? undefined,
        ipAddress: data.ip_address ?? undefined,
        isActive: data.is_active,
      };

      // Cache for future use
      let ttl = 0;
      if (session) {
        ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        await cacheManager.set(`session:${sessionId}`, session, ttl, 'auth');
      }

      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken: string): Promise<EnhancedAuthResult> {
    try {
      // Verify refresh token
      const payload = await TokenManager.verifyRefreshToken(refreshToken);
      if (!payload) {
        return {
          success: false,
          error: 'Invalid refresh token',
          errorCode: 'INVALID_REFRESH_TOKEN',
        };
      }

      // Get user and session
      const user = await getUserById(payload.userId);
      if (!user || !user.is_active) {
        return {
          success: false,
          error: 'User not found or inactive',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      const session = await this.getSession(payload.sessionId);
      if (!session || !session.isActive) {
        return {
          success: false,
          error: 'Session not found or inactive',
          errorCode: 'SESSION_NOT_FOUND',
        };
      }

      // Generate new access token
      const newAccessToken = await TokenManager.generateAccessToken(user, payload.sessionId);
      const newAccessTokenHash = await TokenManager.hashToken(newAccessToken);

      // Update session with new access token hash
      await supabaseAdmin
        .from('user_sessions')
        .update({
          token_hash: newAccessTokenHash,
          last_used: new Date().toISOString(),
        })
        .eq('id', payload.sessionId);

      // Update cache
      const updatedSession = {
        ...session,
        accessTokenHash: newAccessTokenHash,
        lastUsed: new Date(),
      };
      
      const ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
      await cacheManager.set(`session:${payload.sessionId}`, updatedSession, ttl, 'auth');

      const tokenPair: TokenPair = {
        accessToken: newAccessToken,
        refreshToken, // Keep the same refresh token
        expiresIn: 15 * 60, // 15 minutes
        tokenType: 'Bearer',
      };

      const authUser: EnhancedAuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'user',
        isActive: user.is_active,
        sessionId: payload.sessionId,
      };

      return {
        success: true,
        user: authUser,
        tokens: tokenPair,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Failed to refresh token',
        errorCode: 'TOKEN_REFRESH_ERROR',
      };
    }
  }

  // Invalidate session
  static async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      // Get session to blacklist current tokens
      const session = await this.getSession(sessionId);
      
      if (session) {
        // Blacklist any existing tokens (optional, for extra security)
        // This would require storing current token info in session
      }

      // Deactivate in database
      await supabaseAdmin
        .from('user_sessions')
        .update({ is_active: false } as any)
        .eq('id', sessionId);

      // Remove from cache
      await cacheManager.del(`session:${sessionId}`, 'auth');

      return true;
    } catch (error) {
      console.error('Session invalidation error:', error);
      return false;
    }
  }

  // Cleanup expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Session cleanup error:', error);
        return 0;
      }

      // Remove from cache as well
      if (data) {
        for (const session of data) {
          await cacheManager.del(`session:${session.id}`, 'auth');
        }
      }

      const cleanedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
      
      return cleanedCount;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }
}

// ========================================
// ENHANCED AUTH FUNCTIONS
// ========================================

export class EnhancedAuth {
  // Login with enhanced token management
  static async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<EnhancedAuthResult> {
    try {
      // Get user
      const user = await getUserByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          error: 'Account is deactivated',
          errorCode: 'ACCOUNT_DEACTIVATED',
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Create session
      return await SessionManager.createSession(user, userAgent, ipAddress);
    } catch (error) {
      console.error('Enhanced login error:', error);
      return {
        success: false,
        error: 'Login failed',
        errorCode: 'LOGIN_ERROR',
      };
    }
  }

  // Logout with token blacklisting
  static async logout(
    accessToken: string,
    refreshToken?: string
  ): Promise<boolean> {
    try {
      // Verify access token to get session info
      const payload = await TokenManager.verifyAccessToken(accessToken);
      
      if (payload) {
        // Invalidate session
        await SessionManager.invalidateSession(payload.sessionId);
      }

      // Blacklist tokens
      await TokenManager.blacklistToken(accessToken);
      if (refreshToken) {
        await TokenManager.blacklistToken(refreshToken);
      }

      return true;
    } catch (error) {
      console.error('Enhanced logout error:', error);
      return false;
    }
  }

  // Get user from access token
  static async getUserFromToken(accessToken: string): Promise<EnhancedAuthUser | null> {
    try {
      const payload = await TokenManager.verifyAccessToken(accessToken);
      if (!payload) {
        return null;
      }

      const user = await getUserById(payload.userId);
      if (!user || !user.is_active) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'user',
        isActive: user.is_active,
        lastLogin: user.last_login ?? undefined,
        sessionId: payload.sessionId,
      };
    } catch (error) {
      console.error('Get user from token error:', error);
      return null;
    }
  }

  // Get user from request with enhanced validation
  static async getUserFromRequest(request: NextRequest): Promise<EnhancedAuthUser | null> {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      return await this.getUserFromToken(token);
    } catch (error) {
      console.error('Get user from request error:', error);
      return null;
    }
  }
}

// ========================================
// INITIALIZATION & CLEANUP
// ========================================

// Start cleanup job for expired sessions
export function startSessionCleanup(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  return setInterval(async () => {
    await SessionManager.cleanupExpiredSessions();
  }, intervalMs);
}

// Export convenience functions
export const {
  login,
  logout,
  getUserFromToken,
  getUserFromRequest,
} = EnhancedAuth;

export const {
  refreshAccessToken,
  invalidateSession,
  cleanupExpiredSessions,
} = SessionManager;