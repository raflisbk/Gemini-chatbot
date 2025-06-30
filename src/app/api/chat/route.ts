import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { 
  createMessage, 
  createChatSession, 
  updateChatSession, 
  trackUsage,
  getUserUsage 
} from '@/lib/supabase';
import { getFileMetadata } from '@/lib/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  sessionId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    size: z.number(),
    url: z.string().url()
  })).optional(),
  settings: z.object({
    model: z.string().default('gemini-1.5-flash'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(8192).default(4096),
    systemPrompt: z.string().optional()
  }).optional()
});

interface ChatResponse {
  success: boolean;
  response?: string;
  sessionId?: string;
  messageId?: string;
  usage?: {
    messageCount: number;
    remainingQuota: number;
  };
  error?: string;
  errorType?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    // Parse and validate request
    const body = await request.json();
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          errorType: 'validation_error'
        },
        { status: 400 }
      );
    }

    const { 
      message, 
      sessionId, 
      attachments = [], 
      settings = { model: 'gemini-1.5-flash', temperature: 0.7, maxTokens: 4096 } 
    } = validation.data;

    // Check authentication
    const user = await getUserFromRequest(request);
    
    // Check quota (both authenticated and guest users)
    let canSendMessage = false;
    let currentUsage = { messageCount: 0, fileUploads: 0 };
    
    if (user) {
      // Authenticated user
      currentUsage = await getUserUsage(user.id);
      const maxQuota = user.role === 'admin' ? 1000 : 100;
      canSendMessage = currentUsage.messageCount < maxQuota;
    } else {
      // Guest user - check localStorage quota
      const today = new Date().toDateString();
      const guestUsageKey = `guest_usage_${today}`;
      
      // Note: We can't access localStorage here, so we'll trust the frontend
      // In production, you might want to implement IP-based rate limiting
      canSendMessage = true; // For now, allow guest messages
    }

    if (!canSendMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily message quota exceeded',
          errorType: 'quota_exceeded'
        },
        { status: 429 }
      );
    }

    // Process attachments if any
    const processedAttachments = [];
    for (const attachment of attachments) {
      if (user) {
        const fileMetadata = await getFileMetadata(attachment.id, user.id);
        if (fileMetadata) {
          processedAttachments.push({
            id: fileMetadata.id,
            name: fileMetadata.original_name,
            type: fileMetadata.mime_type,
            size: fileMetadata.file_size,
            url: fileMetadata.blob_url
          });
        }
      }
    }

    // Create or get session
    let currentSessionId = sessionId;
    if (user && !currentSessionId) {
      // Create new session for authenticated users
      const newSession = await createChatSession({
        user_id: user.id,
        title: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      });
      currentSessionId = newSession?.id;
    }

    // Save user message
    let userMessageId: string | undefined;
    if (user && currentSessionId) {
      const userMessage = await createMessage({
        session_id: currentSessionId,
        role: 'user',
        content: message,
        attachments: processedAttachments
      });
      userMessageId = userMessage?.id;
    }

    // Prepare Gemini request
    const model = genAI.getGenerativeModel({ 
      model: settings.model || 'gemini-1.5-flash',
      generationConfig: {
        temperature: settings.temperature || 0.7,
        maxOutputTokens: settings.maxTokens || 4096,
      },
      systemInstruction: settings.systemPrompt
    });

    // Build conversation context for Gemini
    let prompt = message;
    
    // Add attachment context
    if (processedAttachments.length > 0) {
      const attachmentInfo = processedAttachments.map(att => 
        `File: ${att.name} (${att.type}, ${Math.round(att.size / 1024)}KB)`
      ).join('\n');
      prompt = `${message}\n\nAttached files:\n${attachmentInfo}`;
    }

    // Get AI response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiResponse = response.text();

    if (!aiResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'No response generated from AI',
          errorType: 'ai_error'
        },
        { status: 500 }
      );
    }

    // Save AI response
    let aiMessageId: string | undefined;
    if (user && currentSessionId) {
      const aiMessage = await createMessage({
        session_id: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          model: settings.model || 'gemini-1.5-flash',
          temperature: settings.temperature || 0.7,
          attachments: processedAttachments.length > 0 ? processedAttachments : undefined
        }
      });
      aiMessageId = aiMessage?.id;

      // Update session timestamp
      await updateChatSession(currentSessionId, {
        updated_at: new Date().toISOString()
      });

      // Track usage
      await trackUsage(user.id, 'message');
    }

    // Get updated usage for response
    const updatedUsage = user ? await getUserUsage(user.id) : currentUsage;
    const maxQuota = user ? (user.role === 'admin' ? 1000 : 100) : 10;

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId: currentSessionId,
      messageId: aiMessageId,
      usage: {
        messageCount: updatedUsage.messageCount,
        remainingQuota: Math.max(0, maxQuota - updatedUsage.messageCount)
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          {
            success: false,
            error: 'API quota exceeded. Please try again later.',
            errorType: 'quota_exceeded'
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('safety')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Content blocked by safety filters.',
            errorType: 'safety_filter'
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}