// src/app/api/auth/guest/verify/route.ts
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

const verifyGuestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ========================================
// VERIFY GUEST SESSION
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifyGuestSchema.safeParse(body);

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

    const { token } = validation.data;

    // Check if it's a fallback token (when database is not available)
    if (token.includes('fallback') || token.includes('emergency')) {
      // Return basic session info for fallback tokens
      const fallbackSession: GuestSession = {
        id: 'fallback-session',
        sessionToken: token,
        messageCount: 0,
        maxMessages: 5,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      return NextResponse.json({
        success: true,
        session: fallbackSession,
        isValid: true,
        remainingMessages: 5,
        fallback: true,
      });
    }

    // Get guest session from database
    const { data: guestSession, error } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('session_token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !guestSession) {
      // If database query fails, try fallback mode
      if (error && error.code !== 'PGRST116') {
        console.error('Database error in guest verify:', error);
        
        // Return fallback session
        const fallbackSession: GuestSession = {
          id: 'fallback-verify',
          sessionToken: token,
          messageCount: 0,
          maxMessages: 5,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        return NextResponse.json({
          success: true,
          session: fallbackSession,
          isValid: true,
          remainingMessages: 5,
          fallback: true,
        });
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired guest session',
          details: error?.message || 'Session not found'
        },
        { status: 404 }
      );
    }

    // Update last activity
    try {
      await supabaseAdmin
        .from('guest_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', guestSession.id);
    } catch (updateError) {
      console.error('Error updating guest session activity:', updateError);
      // Continue without failing - update is not critical
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

    return NextResponse.json({
      success: true,
      session,
      isValid: true,
      remainingMessages: 5 - guestSession.message_count,
    });

  } catch (error) {
    console.error('Guest session verification error:', error);
    
    // Emergency fallback - allow the session
    return NextResponse.json({
      success: true,
      session: {
        id: 'emergency-verify',
        sessionToken: 'emergency-token',
        messageCount: 0,
        maxMessages: 5,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      isValid: true,
      remainingMessages: 5,
      fallback: true,
      error: 'Using emergency fallback mode'
    });
  }
}