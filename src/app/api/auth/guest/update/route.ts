// src/app/api/auth/guest/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const updateGuestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  messageCount: z.number().min(1).optional(),
});

// ========================================
// UPDATE GUEST SESSION
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = updateGuestSchema.safeParse(body);

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

const { token, messageCount } = validation.data;

    // Check if it's a fallback token
    if (token.includes('fallback') || token.includes('emergency')) {
      // For fallback tokens, track in memory/localStorage on client side
      return NextResponse.json({
        success: true,
        session: {
          id: 'fallback-update',
          sessionToken: token,
          messageCount: messageCount || 1,
          maxMessages: 5,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          remainingMessages: 5 - (messageCount || 1),
        },
        message: 'Guest session updated (fallback mode)',
        fallback: true,
      });
    }

    // Get current guest session
    const { data: currentSession, error: fetchError } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('session_token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !currentSession) {
      // Fallback mode if database is not available
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Database error in guest update:', fetchError);
        
        return NextResponse.json({
          success: true,
          session: {
            id: 'fallback-update-db-error',
            sessionToken: token,
            messageCount: messageCount || 1,
            maxMessages: 5,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            remainingMessages: Math.max(0, 5 - (messageCount || 1)),
          },
          message: 'Guest session updated (database fallback)',
          fallback: true,
        });
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired guest session',
          details: fetchError?.message || 'Session not found'
        },
        { status: 404 }
      );
    }

    // Calculate new message count
    const newMessageCount = messageCount ? 
      currentSession.message_count + messageCount : 
      currentSession.message_count;

    // Check if exceeds limit
    if (newMessageCount > 5) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Guest message limit exceeded',
          details: 'Maximum 5 messages allowed for guest users'
        },
        { status: 429 }
      );
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('guest_sessions')
      .update({
        message_count: newMessageCount,
        last_activity: new Date().toISOString()
      })
      .eq('id', currentSession.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating guest session:', updateError);
      
      // Fallback response
      return NextResponse.json({
        success: true,
        session: {
          id: currentSession.id,
          sessionToken: currentSession.session_token,
          messageCount: newMessageCount,
          maxMessages: 5,
          expiresAt: currentSession.expires_at,
          remainingMessages: Math.max(0, 5 - newMessageCount),
        },
        message: 'Guest session updated (database update failed, using fallback)',
        fallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        sessionToken: updatedSession.session_token,
        messageCount: updatedSession.message_count,
        maxMessages: 5,
        expiresAt: updatedSession.expires_at,
        remainingMessages: Math.max(0, 5 - updatedSession.message_count),
      },
      message: 'Guest session updated successfully',
    });

  } catch (error) {
    console.error('Guest session update error:', error);
    
    // Emergency fallback
    return NextResponse.json({
      success: true,
      session: {
        id: 'emergency-update',
        sessionToken: 'emergency-token',
        messageCount: 1,
        maxMessages: 5,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        remainingMessages: 4,
      },
      message: 'Guest session updated (emergency fallback)',
      fallback: true,
    });
  }
}