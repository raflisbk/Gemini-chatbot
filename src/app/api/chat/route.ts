// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { 
  createMessage, 
  createChatSession, 
  updateChatSession, 
  trackUsage,
  getUserUsage,
  getSessionMessages
} from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ========================================
// VALIDATION SCHEMAS
// ========================================

const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'File name is required'),
  type: z.string().min(1, 'File type is required'),
  size: z.number().positive('File size must be positive').max(10 * 1024 * 1024, 'File must be under 10MB'),
  url: z.string().url().optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  base64: z.string().optional()
}).refine(data => data.base64 || data.url, {
  message: "Either base64 or url must be provided"
});

const contextMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content cannot be empty'),
  timestamp: z.union([z.string(), z.date()]).optional()
});

const settingsSchema = z.object({
  model: z.string().default('gemini-1.5-flash'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8192).default(4096),
  systemPrompt: z.string().optional()
});

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  sessionId: z.string().uuid('Invalid session ID format').optional(),
  attachments: z.array(attachmentSchema).optional().default([]),
  conversationContext: z.array(contextMessageSchema).optional().default([]),
  settings: settingsSchema.optional().default({})
});

// ========================================
// INTERFACES
// ========================================

interface ChatResponse {
  success: boolean;
  response?: string;
  sessionId?: string;
  messageId?: string;
  usage?: {
    messageCount: number;
    remainingQuota: number;
    tokensUsed?: number;
  };
  error?: string;
  errorType?: string;
  details?: any;
  metadata?: {
    model: string;
    temperature: number;
    processingTime: number;
    attachmentCount: number;
  };
}

interface GuestSession {
  id: string;
  sessionToken: string;
  messageCount: number;
  maxMessages: number;
  expiresAt: string;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function checkUserQuota(user: any): Promise<{ allowed: boolean; usage: any; quota: number }> {
  const usage = await getUserUsage(user?.id);
  const quota = user?.role === 'admin' ? 1000 : (user ? 100 : 5); // Guest: 5, User: 100, Admin: 1000
  
  return {
    allowed: usage.messageCount < quota,
    usage,
    quota
  };
}

async function checkGuestQuota(request: NextRequest): Promise<{ allowed: boolean; session: GuestSession | null }> {
  const guestToken = request.headers.get('x-guest-token') || request.cookies.get('guest-token')?.value;
  
  if (!guestToken) {
    return { allowed: false, session: null };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/guest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: guestToken })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        allowed: data.session.messageCount < data.session.maxMessages,
        session: data.session
      };
    }
  } catch (error) {
    console.error('Guest quota check error:', error);
  }

  return { allowed: false, session: null };
}

async function processAttachments(attachments: any[]): Promise<any[]> {
  const processedAttachments = [];
  const maxFileSize = 10 * 1024 * 1024; // 10MB limit
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  for (const attachment of attachments) {
    try {
      // Validate file size
      if (attachment.size > maxFileSize) {
        throw new Error(`File ${attachment.name} exceeds maximum size of 10MB`);
      }

      // Validate file type
      const fileType = attachment.type || attachment.mimeType;
      if (!allowedTypes.includes(fileType)) {
        throw new Error(`File type ${fileType} is not supported`);
      }

      // Process attachment for Gemini
      const processed = {
        id: attachment.id || crypto.randomUUID(),
        name: attachment.name || attachment.fileName || 'unknown_file',
        type: fileType,
        size: attachment.size || attachment.fileSize || 0,
        url: attachment.url,
        base64: attachment.base64,
        mimeType: fileType
      };
      
      processedAttachments.push(processed);
    } catch (error) {
      console.error('Error processing attachment:', error);
      throw new Error(`Failed to process attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return processedAttachments;
}

async function buildContextForGemini(sessionId: string, currentMessage: string, attachments: any[]): Promise<any[]> {
  const parts = [];
  
  // Add system instruction
  parts.push({
    text: "You are a helpful AI assistant. You can communicate in Indonesian and English. Be informative, concise, and helpful. When analyzing files, provide detailed insights. Always maintain conversation context and refer to previous messages when relevant."
  });

  // Get conversation history for context (last 20 messages)
  if (sessionId) {
    try {
      const messages = await getSessionMessages(sessionId, 20);
      if (messages && messages.length > 0) {
        parts.push({
          text: "\n=== Previous Conversation ===\n"
        });
        
        for (const msg of messages) {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          parts.push({
            text: `${role}: ${msg.content}\n`
          });
        }
        
        parts.push({
          text: "=== Current Message ===\n"
        });
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }

  // Process attachments first
  for (const attachment of attachments) {
    try {
      if (attachment.base64) {
        // For images, videos, and audio - direct Gemini processing
        if (attachment.mimeType.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
          parts.push({
            text: `[Image uploaded: ${attachment.name}] Please analyze this image and provide insights.`
          });
        } else if (attachment.mimeType.startsWith('video/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
          parts.push({
            text: `[Video uploaded: ${attachment.name}] Please analyze this video content.`
          });
        } else if (attachment.mimeType.startsWith('audio/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
          parts.push({
            text: `[Audio uploaded: ${attachment.name}] Please transcribe and analyze this audio.`
          });
        } else {
          // For other file types, decode base64 and extract text
          try {
            const decodedContent = Buffer.from(attachment.base64, 'base64').toString('utf-8');
            parts.push({
              text: `[File: ${attachment.name}]\nContent:\n${decodedContent.substring(0, 5000)}${decodedContent.length > 5000 ? '...[truncated]' : ''}`
            });
          } catch (error) {
            parts.push({
              text: `[File: ${attachment.name}] - Unable to process file content directly.`
            });
          }
        }
      } else if (attachment.url) {
        parts.push({
          text: `[File attached: ${attachment.name} (${attachment.mimeType})] - Processing from URL not implemented yet.`
        });
      }
    } catch (error) {
      console.error('Error processing attachment for Gemini:', error);
      parts.push({
        text: `[File: ${attachment.name}] - Error processing file.`
      });
    }
  }

  // Add current message
  parts.push({
    text: currentMessage
  });

  return parts;
}

async function saveMessage(sessionId: string, role: string, content: string, attachments?: any[]): Promise<string | undefined> {
  try {
    const message = await createMessage({
      session_id: sessionId,
      role,
      content,
      attachments: attachments || []
    });
    return message?.id;
  } catch (error) {
    console.error('Error saving message:', error);
    return undefined;
  }
}

// ========================================
// MAIN API HANDLER
// ========================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          errorType: 'validation_error',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { message, sessionId, attachments = [], settings = {} } = validation.data;

    // Set final settings
    const finalSettings = {
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 4096,
      ...settings
    };

    // Get user (could be null for guest)
    const user = await getUserFromRequest(request);
    
    // Check quota
    let quotaCheck;
    if (user) {
      quotaCheck = await checkUserQuota(user);
    } else {
      const guestCheck = await checkGuestQuota(request);
      quotaCheck = {
        allowed: guestCheck.allowed,
        usage: { messageCount: guestCheck.session?.messageCount || 0 },
        quota: 5
      };
    }

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: user ? 'Message quota exceeded' : 'Guest quota exceeded (5 messages max)',
          errorType: 'quota_exceeded',
          details: {
            current: quotaCheck.usage.messageCount,
            limit: quotaCheck.quota
          }
        },
        { status: 429 }
      );
    }

    // Process attachments
    let processedAttachments: any[] = [];
    if (attachments.length > 0) {
      try {
        processedAttachments = await processAttachments(attachments);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to process file attachments',
            errorType: 'attachment_error',
            details: error instanceof Error ? error.message : 'Unknown attachment error'
          },
          { status: 400 }
        );
      }
    }

    // Handle session management
    let currentSessionId = sessionId;
    if (user && !currentSessionId) {
      try {
        const sessionTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        const newSession = await createChatSession(user.id, sessionTitle);
        currentSessionId = newSession?.id;
      } catch (error) {
        console.error('Error creating session:', error);
        // Continue without session for now
      }
    }

    // Save user message to database
    let userMessageId: string | undefined;
    if (user && currentSessionId) {
      userMessageId = await saveMessage(
        currentSessionId,
        'user',
        message,
        processedAttachments.length > 0 ? processedAttachments : undefined
      );
    }

    // Build context for Gemini
    const contextParts = await buildContextForGemini(currentSessionId || '', message, processedAttachments);

    // Generate AI response
    let aiResponse = '';
    let tokensUsed = 0;

    try {
      const model = genAI.getGenerativeModel({ 
        model: finalSettings.model,
        generationConfig: {
          temperature: finalSettings.temperature,
          maxOutputTokens: finalSettings.maxTokens,
        }
      });

      const result = await model.generateContent(contextParts);
      const response = await result.response;
      aiResponse = response.text();

      // Estimate tokens used (approximate)
      tokensUsed = Math.ceil((message.length + aiResponse.length) / 4);

    } catch (error) {
      console.error('Gemini API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate AI response',
          errorType: 'ai_error',
          details: error instanceof Error ? error.message : 'Unknown AI error'
        },
        { status: 500 }
      );
    }

    // Save AI response to database
    let aiMessageId: string | undefined;
    if (user && currentSessionId) {
      aiMessageId = await saveMessage(currentSessionId, 'assistant', aiResponse);
      
      // Update session with last message time
      await updateChatSession(currentSessionId, {
        last_message_at: new Date().toISOString(),
        message_count: (await getSessionMessages(currentSessionId, 1000)).length + 1
      });
    }

    // Track usage
    if (user) {
      await trackUsage(user.id, 'message');
      if (processedAttachments.length > 0) {
        await trackUsage(user.id, 'file_upload');
      }
    } else {
      // Update guest session
      const guestToken = request.headers.get('x-guest-token') || request.cookies.get('guest-token')?.value;
      if (guestToken) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/guest/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: guestToken, messageCount: 1 })
          });
        } catch (error) {
          console.error('Guest session update error:', error);
        }
      }
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Return successful response
    const response: ChatResponse = {
      success: true,
      response: aiResponse,
      sessionId: currentSessionId,
      messageId: aiMessageId,
      usage: {
        messageCount: quotaCheck.usage.messageCount + 1,
        remainingQuota: quotaCheck.quota - quotaCheck.usage.messageCount - 1,
        tokensUsed
      },
      metadata: {
        model: finalSettings.model,
        temperature: finalSettings.temperature,
        processingTime,
        attachmentCount: processedAttachments.length
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorType: 'server_error',
        details: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
}