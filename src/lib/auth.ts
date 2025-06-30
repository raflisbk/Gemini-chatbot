import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { supabaseAdmin, getUserByEmail, getUserById, updateUserLastLogin } from './supabase';
import type { User } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET!;
const SESSION_TIMEOUT_HOURS = parseInt(process.env.SESSION_TIMEOUT_HOURS || '24');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT utilities
export const generateToken = async (user: User, sessionId: string): Promise<string> => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'user',
    sessionId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${SESSION_TIMEOUT_HOURS}h`,
    issuer: 'ai-chatbot',
    audience: 'ai-chatbot-users',
  });
};

export const verifyToken = async (token: string): Promise<JWTPayload | null> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'ai-chatbot',
      audience: 'ai-chatbot-users',
    }) as JWTPayload;

    // Check if session is still valid in database
    const { data: session } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('id', decoded.sessionId)
      .eq('user_id', decoded.userId)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return null;
    }

    // Update last used timestamp
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_used: new Date().toISOString() })
      .eq('id', decoded.sessionId);

    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Authentication functions
export const registerUser = async (userData: RegisterData): Promise<AuthResult> => {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Create user in database
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: userData.email,
        password_hash: passwordHash,
        name: userData.name,
        role: userData.role || 'user',
        is_active: true,
      })
      .select()
      .single();

    if (error || !newUser) {
      return {
        success: false,
        error: 'Failed to create user account',
      };
    }

    // Create session
    const sessionResult = await createUserSession(newUser);
    if (!sessionResult.success) {
      return sessionResult;
    }

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as 'admin' | 'user',
        isActive: newUser.is_active,
      },
      token: sessionResult.token,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Internal server error during registration',
    };
  }
};

export const loginUser = async (email: string, password: string, userAgent?: string, ipAddress?: string): Promise<AuthResult> => {
  try {
    // Get user from database
    const user = await getUserByEmail(email);
    if (!user || !user.is_active) {
      return {
        success: false,
        error: 'Invalid credentials or account is inactive',
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // Update last login
    await updateUserLastLogin(user.id);

    // Create session
    const sessionResult = await createUserSession(user, userAgent, ipAddress);
    if (!sessionResult.success) {
      return sessionResult;
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'user',
        isActive: user.is_active,
      },
      token: sessionResult.token,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Internal server error during login',
    };
  }
};

export const createUserSession = async (
  user: User, 
  userAgent?: string, 
  ipAddress?: string
): Promise<AuthResult> => {
  try {
    // Create session record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_TIMEOUT_HOURS);

    const { data: session, error } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token_hash: '', // Will be updated after JWT generation
        expires_at: expiresAt.toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (error || !session) {
      return {
        success: false,
        error: 'Failed to create session',
      };
    }

    // Generate JWT token
    const token = await generateToken(user, session.id);
    
    // Hash the token for storage
    const tokenHash = await hashPassword(token);

    // Update session with token hash
    await supabaseAdmin
      .from('user_sessions')
      .update({ token_hash: tokenHash })
      .eq('id', session.id);

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Session creation error:', error);
    return {
      success: false,
      error: 'Failed to create session',
    };
  }
};

export const logoutUser = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);

    return !error;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

export const getUserFromRequest = async (request: NextRequest): Promise<AuthUser | null> => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    
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
    };
  } catch (error) {
    console.error('Get user from request error:', error);
    return null;
  }
};

// Middleware helper for protected routes
export const requireAuth = async (request: NextRequest): Promise<{ user: AuthUser | null; error?: string }> => {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return {
      user: null,
      error: 'Authentication required',
    };
  }

  return { user };
};

export const requireRole = async (
  request: NextRequest, 
  requiredRole: 'admin' | 'user'
): Promise<{ user: AuthUser | null; error?: string }> => {
  const { user, error } = await requireAuth(request);
  
  if (error || !user) {
    return { user: null, error: error || 'Authentication required' };
  }

  if (user.role !== requiredRole && requiredRole === 'admin') {
    return {
      user: null,
      error: 'Insufficient permissions',
    };
  }

  return { user };
};

// Cleanup expired sessions (call this periodically)
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
  }
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};