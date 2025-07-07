// src/app/api/auth/login/route.ts - COMPLETE INTEGRATED VERSION
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
// INTERFACES
// ========================================

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  password_hash: string;
  is_active: boolean;
  avatar_url?: string;
  message_count?: number;
  last_login?: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    isActive: boolean;
    avatarUrl?: string;
    messageCount: number;
    lastLogin: string;
    settings?: any;
    created_at: string;
    updated_at: string;
  };
  token?: string;
  error?: string;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
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

    // Only update IP and user agent if provided
    if (ipAddress) {
      updateData.last_ip = ipAddress;
    }
    if (userAgent) {
      updateData.last_user_agent = userAgent;
    }

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

async function logLoginAttempt(
  email: string, 
  success: boolean, 
  ipAddress?: string, 
  userAgent?: string,
  errorReason?: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('login_attempts')
      .insert({
        email: email.toLowerCase(),
        success,
        ip_address: ipAddress,
        user_agent: userAgent,
        error_reason: errorReason,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error logging login attempt:', error);
    }
  } catch (error) {
    console.error('Error in logLoginAttempt:', error);
    // Don't fail the login if logging fails
  }
}

async function checkRateLimit(email: string, ipAddress?: string): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Check failed attempts in last 5 minutes
    let query = supabaseAdmin
      .from('login_attempts')
      .select('id')
      .eq('success', false)
      .gte('created_at', fiveMinutesAgo);

    // Check both email and IP
    if (ipAddress) {
      query = query.or(`email.eq.${email.toLowerCase()},ip_address.eq.${ipAddress}`);
    } else {
      query = query.eq('email', email.toLowerCase());
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
// MAIN LOGIN FUNCTION
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
      await logLoginAttempt(email, false, ipAddress, userAgent, 'Rate limited');
      return {
        success: false,
        error: 'Too many failed login attempts. Please try again in 5 minutes.'
      };
    }

    // Get user from database
    const user = await getUserByEmail(email);
    if (!user) {
      await logLoginAttempt(email, false, ipAddress, userAgent, 'User not found');
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      await logLoginAttempt(email, false, ipAddress, userAgent, 'Invalid password');
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    // Check if user is active
    if (!user.is_active) {
      await logLoginAttempt(email, false, ipAddress, userAgent, 'Account inactive');
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.'
      };
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Update user login information
    await updateUserLoginInfo(user.id, ipAddress, userAgent);

    // Log successful login
    await logLoginAttempt(email, true, ipAddress, userAgent);

    // Return success response
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.is_active,
        avatarUrl: user.avatar_url,
        messageCount: user.message_count || 0,
        lastLogin: new Date().toISOString(),
        settings: user.settings,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
    };
  } catch (error) {
    console.error('Login function error:', error);
    await logLoginAttempt(email, false, ipAddress, userAgent, 'Server error');
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

// ========================================
// API ROUTE HANDLER
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