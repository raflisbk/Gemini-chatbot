// src/app/api/chat/route.ts - Enhanced version with existing features
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// FIXED: Import from your existing supabase functions
import { 
  createChatSession,
  updateChatSession,
  getSessionMessages,
  createMessage,
  getUserById,
  trackUsage
} from '@/lib/supabase';

// FIXED: Import from your existing auth functions
import { verifyToken } from '@/lib/auth';
import { AppErrorHandler, ErrorType } from '@/lib/errorHandler';

// FIXED: Import supabase admin for guest tracking
import { supabaseAdmin } from '@/lib/supabase';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// FIXED: Enhanced rate limiting configuration (match AuthContext)
const RATE_LIMITS = {
  guest: 5,
  user: 25,
  admin: Infinity // unlimited
} as const;

interface ChatRequest {
  message: string;
  sessionId?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    mimeType: string;
    size: number;
    base64: string;
  }>;
  settings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  // FIXED: Add fields for database integration
  userId?: string;
  isGuest?: boolean;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  sessionId?: string | undefined;
  messageId?: string;
  usage?: {
    messageCount: number;
    remainingQuota: number;
    tokensUsed: number;
  };
  metadata?: {
    model: string;
    temperature: number;
    processingTime: number;
    attachmentCount: number;
    userRole?: string;
    remainingMessages?: number;
  };
  error?: string;
  errorType?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  let user: any = null;
  let currentSessionId: string | undefined = undefined;
  let userRole: 'guest' | 'user' | 'admin' = 'guest';
  
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, sessionId, attachments = [], settings = {}, userId, isGuest = false } = body;

    // Validate input
    if (!message?.trim() && attachments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message or attachments required',
          errorType: 'validation_error'
        },
        { status: 400 }
      );
    }

    // FIXED: Enhanced authentication with user role detection
    if (!isGuest && userId) {
      const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
      if (authToken) {
        try {
          const decoded = await verifyToken(authToken);
          if (decoded && decoded.userId === userId) {
            user = await getUserById(userId);
            if (user && user.is_active) {
              userRole = user.role;
            }
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid authentication',
              errorType: 'auth_error'
            },
            { status: 401 }
          );
        }
      }
    }

    // FIXED: Enhanced rate limiting check
    const messageCount = await getCurrentMessageCount(userId, isGuest, request);
    const limit = RATE_LIMITS[userRole];
    
    if (limit !== -1 && messageCount >= limit) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. ${userRole} users are limited to ${limit} messages per day.`,
          errorType: 'rate_limit_error',
          metadata: {
            model: settings.model || 'gemini-2.5-flash',
            temperature: settings.temperature ?? 0.7,
            processingTime: 0,
            attachmentCount: attachments.length,
            userRole,
            remainingMessages: 0
          }
        },
        { status: 429 }
      );
    }

    // FIXED: Enhanced session management
    currentSessionId = sessionId;
    if (user && !currentSessionId) {
      // Create new session for authenticated users
      const newSessionTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      try {
        const newSession = await createChatSession(user.id, newSessionTitle);
        currentSessionId = newSession?.id;
      } catch (error) {
        console.error('Session creation error:', error);
        // Continue with temporary session if creation fails
        currentSessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    } else if (!currentSessionId) {
      // Create temporary session for guests
      currentSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Process attachments with enhanced validation
    const processedAttachments = await processAttachments(attachments);

    // Build conversation context with enhanced memory
    const conversationParts = await buildEnhancedContext(
      currentSessionId || '', 
      message, 
      processedAttachments,
      user?.id
    );

    // Configure AI model with enhanced settings
    const finalSettings = {
      model: settings.model || 'gemini-2.5-flash',
      temperature: settings.temperature ?? 0.7,
      maxTokens: settings.maxTokens || 4096
    };

    // Get AI model
    const model = genAI.getGenerativeModel({ 
      model: finalSettings.model,
      generationConfig: {
        temperature: finalSettings.temperature,
        maxOutputTokens: finalSettings.maxTokens,
      }
    });

    // Generate AI response
    const result = await model.generateContent(conversationParts);
    const aiResponse = result.response.text();

    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    // Calculate tokens used (approximate)
    const tokensUsed = Math.ceil((message.length + aiResponse.length) / 4);

    // FIXED: Enhanced database saving with proper error handling
    let userMessageId: string | undefined;
    let aiMessageId: string | undefined;

    if (user && currentSessionId && !currentSessionId.startsWith('temp_') && !currentSessionId.startsWith('guest_')) {
      try {
        // Save user message
        userMessageId = await saveMessageToDatabase(
          currentSessionId,
          user.id,
          'user',
          message,
          processedAttachments.map(att => ({
            name: att.name,
            type: att.mimeType,
            size: att.size,
            url: att.url || ''
          }))
        );

        // Save AI response
        aiMessageId = await saveMessageToDatabase(
          currentSessionId,
          user.id,
          'assistant',
          aiResponse,
          []
        );

        // Update session metadata
        const messageCount = await getSessionMessageCount(currentSessionId);
        await updateChatSession(currentSessionId, {
          last_message_at: new Date().toISOString(),
          message_count: messageCount + 2,
          context_summary: aiResponse.slice(0, 200) + (aiResponse.length > 200 ? '...' : '')
        });

        // Track usage for authenticated users
        await trackUsage(user.id, 'message');

      } catch (error) {
        console.error('Database save error:', error);
        // Continue without saving if there's an error
      }
    } else if (isGuest) {
      // FIXED: Track guest usage
      await trackGuestUsage(request, currentSessionId);
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;
    const remainingMessages = limit === -1 ? -1 : Math.max(0, limit - messageCount - 1);

    // Return successful response
    const response: ChatResponse = {
      success: true,
      response: aiResponse,
      sessionId: currentSessionId,
      messageId: aiMessageId,
      usage: {
        messageCount: messageCount + 1,
        remainingQuota: remainingMessages,
        tokensUsed
      },
      metadata: {
        model: finalSettings.model,
        temperature: finalSettings.temperature,
        processingTime,
        attachmentCount: processedAttachments.length,
        userRole,
        remainingMessages
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Use error handler for proper classification
    const classifiedError = AppErrorHandler.classifyError(error, 'chat_api');
    
    return NextResponse.json(
      {
        success: false,
        error: classifiedError.message,
        errorType: classifiedError.type,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: classifiedError.statusCode || 500 }
    );
  }
}

// ========================================
// ENHANCED RATE LIMITING FUNCTIONS
// ========================================

// FIXED: Enhanced message count tracking
async function getCurrentMessageCount(
  userId?: string, 
  isGuest: boolean = false, 
  request?: NextRequest
): Promise<number> {
  try {
    if (isGuest) {
      // For guests, track by IP address and session
      const ip = getClientIP(request);
      const today = new Date().toISOString().split('T')[0];
      
      // Check guest sessions table
      const { data: guestSessions, error } = await supabaseAdmin
        .from('guest_sessions')
        .select('message_count')
        .eq('ip_address', ip)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) {
        console.error('Error getting guest message count:', error);
        return 0;
      }

      return guestSessions?.reduce((total, session) => total + session.message_count, 0) || 0;
    } else if (userId) {
      // For authenticated users, count today's messages
      const today = new Date().toISOString().split('T')[0];
      
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (error) {
        console.error('Error getting user message count:', error);
        return 0;
      }

      return messages?.length || 0;
    }

    return 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

// FIXED: Get client IP helper
function getClientIP(request?: NextRequest): string {
  if (!request) return 'unknown';
  
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// FIXED: Track guest usage
async function trackGuestUsage(request: NextRequest, sessionId: string): Promise<void> {
  try {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const today = new Date().toISOString().split('T')[0];
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    // Check if guest session exists today
    const { data: existingSession, error: fetchError } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('ip_address', ip)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .single();

    if (existingSession) {
      // Update existing session
      await supabaseAdmin
        .from('guest_sessions')
        .update({
          message_count: existingSession.message_count + 1,
          last_activity: new Date().toISOString()
        })
        .eq('id', existingSession.id);
    } else {
      // Create new guest session
      await supabaseAdmin
        .from('guest_sessions')
        .insert({
          ip_address: ip,
          user_agent: userAgent,
          message_count: 1,
          expires_at: expiresAt.toISOString(),
          session_token: sessionId
        });
    }
  } catch (error) {
    console.error('Error tracking guest usage:', error);
  }
}

// ========================================
// ENHANCED CONTEXT BUILDING
// ========================================

async function buildEnhancedContext(
  sessionId: string, 
  currentMessage: string, 
  attachments: any[],
  userId?: string
): Promise<any[]> {
  const parts = [];
  
  // Add comprehensive system instruction
  parts.push({
    text: `You are an intelligent AI assistant with advanced capabilities. You can:
- Communicate fluently in Indonesian and English
- Analyze images, documents, and multimedia content
- Provide detailed, helpful, and contextual responses
- Remember and reference previous conversations
- Adapt your communication style to user preferences

Always maintain context awareness and provide informative, accurate responses. When analyzing attachments, be thorough and detailed in your insights.`
  });

  // FIXED: Load conversation history with proper error handling
  if (sessionId && userId && !sessionId.startsWith('temp_') && !sessionId.startsWith('guest_')) {
    try {
      const messages = await getSessionMessages(sessionId);
      if (messages && messages.length > 0) {
        parts.push({
          text: "\n=== Previous Conversation Context ===\n"
        });
        
        // Add conversation history in chronological order
        for (const msg of messages.slice(-20)) {
          const role = msg.role === 'user' ? 'Human' : 'Assistant';
          const timestamp = new Date(msg.created_at).toLocaleString();
          
          parts.push({
            text: `[${timestamp}] ${role}: ${msg.content}\n`
          });
          
          // Include attachment context if present
          if (msg.attachments && msg.attachments.length > 0) {
            parts.push({
              text: `[Attachments: ${msg.attachments.map((att: any) => att.name).join(', ')}]\n`
            });
          }
        }
        
        parts.push({
          text: "\n=== End Previous Context ===\n=== Current Message ===\n"
        });
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Continue without context if loading fails
    }
  }

  // Enhanced attachment processing
  for (const attachment of attachments) {
    try {
      if (attachment.base64 && attachment.mimeType) {
        if (attachment.mimeType.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
          parts.push({
            text: `[Image uploaded: ${attachment.name}] Please analyze this image thoroughly and provide detailed insights about what you see, including objects, text, colors, composition, and any relevant information.`
          });
        } else if (attachment.mimeType.startsWith('video/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
          parts.push({
            text: `[Video uploaded: ${attachment.name}] Please analyze this video content, describing key scenes, actions, and any text or audio content you can detect.`
          });
        } else if (attachment.mimeType.startsWith('audio/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
          parts.push({
            text: `[Audio uploaded: ${attachment.name}] Please transcribe this audio and analyze its content, including speech, music, or other sounds.`
          });
        } else {
          // For text-based files, decode and include content
          try {
            const textContent = Buffer.from(attachment.base64, 'base64').toString('utf-8');
            const truncatedContent = textContent.length > 10000 
              ? textContent.substring(0, 10000) + '\n...[Content truncated]'
              : textContent;
            
            parts.push({
              text: `[Document uploaded: ${attachment.name}]\nContent:\n${truncatedContent}`
            });
          } catch (decodeError) {
            console.error('Error decoding text file:', decodeError);
            parts.push({
              text: `[File uploaded: ${attachment.name}] - Unable to process this file type for text extraction.`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing attachment:', attachment.name, error);
      parts.push({
        text: `[File: ${attachment.name}] - Error processing this attachment.`
      });
    }
  }

  // Add current user message
  parts.push({
    text: `Current message: ${currentMessage}`
  });

  return parts;
}

// ========================================
// ENHANCED ATTACHMENT PROCESSING
// ========================================

async function processAttachments(attachments: any[]): Promise<any[]> {
  const processedAttachments = [];
  
  for (const attachment of attachments) {
    try {
      // Validate attachment
      if (!attachment.base64 || !attachment.mimeType) {
        console.warn('Invalid attachment:', attachment.name);
        continue;
      }

      // Validate base64 format
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(attachment.base64)) {
        console.warn('Invalid base64 format for:', attachment.name);
        continue;
      }

      // Validate file size (max 20MB for Gemini)
      const sizeInBytes = (attachment.base64.length * 3) / 4;
      if (sizeInBytes > 20 * 1024 * 1024) {
        console.warn('File too large for processing:', attachment.name);
        continue;
      }

      processedAttachments.push({
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        base64: attachment.base64,
        url: attachment.url || ''
      });

    } catch (error) {
      console.error('Error processing attachment:', attachment.name, error);
    }
  }
  
  return processedAttachments;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function getSessionMessageCount(sessionId: string): Promise<number> {
  try {
    const messages = await getSessionMessages(sessionId);
    return messages?.length || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

// FIXED: Enhanced saveMessage function with proper database structure
async function saveMessageToDatabase(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  attachments: any[] = []
): Promise<string> {
  try {
    const message = await createMessage({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      attachments,
      metadata: {
        timestamp: new Date().toISOString(),
        attachmentCount: attachments.length
      }
    });
    
    return message?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } catch (error) {
    console.error('Error saving message to database:', error);
    throw error;
  }
}

// ========================================
// ERROR HANDLING
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

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}