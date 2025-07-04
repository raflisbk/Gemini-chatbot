// src/app/api/auth/guest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// ========================================
// INTERFACES
// ========================================

interface GuestSession {
  id: string;
  sessionToken: string;
  messageCount: number;
  maxMessages: number;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createGuestSchema = z.object({
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function generateGuestToken(): string {
  return 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return request.ip || 'unknown';
}

// ========================================
// CREATE GUEST SESSION
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = createGuestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = getClientIP(request);
    const sessionToken = generateGuestToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create guest session in database
    const { data: guestSession, error } = await supabaseAdmin
      .from('guest_sessions')
      .insert({
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        message_count: 0,
        expires_at: expiresAt.toISOString(),
        last_activity: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating guest session:', error);
      
      // Fallback: create in-memory session if database fails
      const fallbackSession: GuestSession = {
        id: 'fallback-' + Date.now(),
        sessionToken: sessionToken,
        messageCount: 0,
        maxMessages: 5,
        expiresAt: expiresAt.toISOString(),
        ipAddress: ipAddress,
        userAgent: userAgent,
      };

      const response = NextResponse.json({
        success: true,
        session: fallbackSession,
        message: 'Guest session created (fallback mode)',
        fallback: true,
      });

      // Set cookie
      response.cookies.set('guest-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      return response;
    }

    // Format response
    const session: GuestSession = {
      id: guestSession.id,
      sessionToken: guestSession.session_token,
      messageCount: guestSession.message_count,
      maxMessages: 5,
      expiresAt: guestSession.expires_at,
      ipAddress: guestSession.ip_address || undefined,
      userAgent: guestSession.user_agent || undefined,
    };

    const response = NextResponse.json({
      success: true,
      session,
      message: 'Guest session created successfully',
    });

    // Set cookie
    response.cookies.set('guest-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Guest session creation error:', error);
    
    // Emergency fallback - create basic guest session
    const fallbackToken = 'guest_fallback_' + Date.now();
    const fallbackSession: GuestSession = {
      id: 'emergency-' + Date.now(),
      sessionToken: fallbackToken,
      messageCount: 0,
      maxMessages: 5,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      session: fallbackSession,
      message: 'Guest session created (emergency fallback)',
      fallback: true,
    });

    response.cookies.set('guest-token', fallbackToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  }
}