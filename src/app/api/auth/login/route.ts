// src/app/api/auth/login/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ========================================
// INTERFACES - FIXED
// ========================================

interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  role: string; // Fixed: Database stores as string
  password_hash: string;
  is_active: boolean;
  avatar_url?: string | null;
  message_count?: number;
  last_login?: string | null;
  settings?: any;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user'; // Type-safe interface
  isActive: boolean;
  avatarUrl?: string;
  messageCount: number;
  lastLogin: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

interface SecurityEventInsert {
  event_type: string;
  severity?: string;
  ip_address?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  user_agent?: string | null;
  request_path?: string | null;
  request_method?: string | null;
  details?: any;
  resolved?: boolean;
  created_at?: string;
}

// ========================================
// HELPER FUNCTIONS - FIXED
// ========================================

async function getUserByEmail(email: string): Promise<DatabaseUser | null> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Database error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcryptjs.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

function generateToken(userId: string, role: string): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { 
      userId, 
      role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'ai-chatbot',
      audience: 'ai-chatbot-users'
    }
  );
}

async function updateUserLoginInfo(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  try {
    const updateData: any = {
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user login info:', error);
    }
  } catch (error) {
    console.error('Error in updateUserLoginInfo:', error);
  }
}

// ========================================
// SECURITY EVENT LOGGING - FIXED
// ========================================

async function logSecurityEvent(
  eventType: string,
  email: string, 
  success: boolean, 
  ipAddress?: string, 
  userAgent?: string,
  errorReason?: string,
  userId?: string
): Promise<void> {
  try {
    const securityEvent: SecurityEventInsert = {
      event_type: eventType,
      severity: success ? 'info' : 'warning',
      ip_address: ipAddress || null,
      user_id: userId || null,
      user_agent: userAgent || null,
      request_path: '/api/auth/login',
      request_method: 'POST',
      details: {
        email: email.toLowerCase(),
        success,
        error_reason: errorReason || null,
        timestamp: new Date().toISOString()
      },
      resolved: success,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('security_events')
      .insert(securityEvent);

    if (error) {
      console.error('Error logging security event:', error);
    }
  } catch (error) {
    console.error('Error in logSecurityEvent:', error);
    // Don't fail the login if logging fails
  }
}

async function checkRateLimit(email: string, ipAddress?: string): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Check failed login attempts in last 5 minutes using security_events
    let query = supabaseAdmin
      .from('security_events')
      .select('id')
      .eq('event_type', 'login_attempt')
      .gte('created_at', fiveMinutesAgo)
      .eq('details->success', false);

    // Check both email and IP
    if (ipAddress) {
      query = query.or(`details->email.eq.${email.toLowerCase()},ip_address.eq.${ipAddress}`);
    } else {
      query = query.eq('details->email', email.toLowerCase());
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // Allow login if we can't check rate limit
    }

    // Allow max 5 failed attempts in 5 minutes
    return (attempts?.length || 0) < 5;
  } catch (error) {
    console.error('Error in checkRateLimit:', error);
    return true; // Allow login if rate limit check fails
  }
}

// ========================================
// MAIN LOGIN FUNCTION - FIXED
// ========================================

async function loginUser(
  email: string, 
  password: string, 
  userAgent?: string, 
  ipAddress?: string
): Promise<LoginResponse> {
  try {
    // Check rate limiting
    const isAllowed = await checkRateLimit(email, ipAddress);
    if (!isAllowed) {
      await logSecurityEvent('login_attempt', email, false, ipAddress, userAgent, 'Rate limited');
      return {
        success: false,
        error: 'Too many failed login attempts. Please try again in 5 minutes.'
      };
    }

    // Get user from database
    const dbUser = await getUserByEmail(email);
    if (!dbUser) {
      await logSecurityEvent('login_attempt', email, false, ipAddress, userAgent, 'User not found');
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, dbUser.password_hash);
    if (!isPasswordValid) {
      await logSecurityEvent('login_attempt', email, false, ipAddress, userAgent, 'Invalid password', dbUser.id);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    // Check if user is active
    if (!dbUser.is_active) {
      await logSecurityEvent('login_attempt', email, false, ipAddress, userAgent, 'Account inactive', dbUser.id);
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.'
      };
    }

    // Validate role and ensure it's either 'admin' or 'user'
    const validRole = (dbUser.role === 'admin' || dbUser.role === 'user') ? dbUser.role : 'user';

    // Generate JWT token
    const token = generateToken(dbUser.id, validRole);

    // Update user login information
    await updateUserLoginInfo(dbUser.id, ipAddress, userAgent);

    // Log successful login
    await logSecurityEvent('login_success', email, true, ipAddress, userAgent, undefined, dbUser.id);

    // Convert database user to safe user interface - FIXED TYPE CONVERSION
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: validRole as 'admin' | 'user', // Type-safe conversion
      isActive: dbUser.is_active,
      avatarUrl: dbUser.avatar_url || undefined,
      messageCount: dbUser.message_count || 0,
      lastLogin: new Date().toISOString(),
      settings: dbUser.settings,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
    };

    // Return success response
    return {
      success: true,
      user,
      token,
    };
  } catch (error) {
    console.error('Login function error:', error);
    await logSecurityEvent('login_error', email, false, ipAddress, userAgent, 'Server error');
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

// ========================================
// API ROUTE HANDLER - ENHANCED
// ========================================

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input format', 
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Extract client information
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    // Get IP address from various headers
    const ipAddress = cfConnectingIp || 
                     realIp || 
                     (forwarded ? forwarded.split(',')[0].trim() : undefined) || 
                     request.ip;

    // Perform login
    const result = await loginUser(email, password, userAgent, ipAddress);

    if (result.success) {
      // Set secure HTTP-only cookie for additional security
      const response = NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
      });

      // Set cookie for additional auth layer (optional)
      response.cookies.set('auth-session', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }

    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: result.error 
      },
      { status: 401 }
    );

  } catch (error) {
    console.error('Login API error:', error);
    
    // Don't expose internal error details
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

// ========================================
// ADDITIONAL ROUTE HANDLERS
// ========================================

export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}