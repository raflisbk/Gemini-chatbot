// src/app/api/chat/route.ts
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
import { cacheManager } from '@/lib/redis';
import { RateLimiter } from '@/lib/rateLimiter';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Rate limiter for chat API
const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30, // 30 requests per minute per IP
  keyGenerator: (req) => `chat_${req.headers.get('x-forwarded-for') || req.ip || 'unknown'}`,
  customMessage: 'Too many chat requests. Please slow down.'
});

// Enhanced request validation schemas
const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'File name is required'),
  type: z.string().min(1, 'File type is required'),
  size: z.number().positive('File size must be positive'),
  url: z.string().url().optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  base64: z.string().optional()
}).refine(data => data.base64 || data.url, {
  message: "Either base64 or url must be provided"
});

const contextMessageSchema = z.object({
  role: z.enum(['user', 'assistant'], {
    errorMap: () => ({ message: 'Role must be either "user" or "assistant"' })
  }),
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
  continueFrom: z.string().optional(),
  settings: settingsSchema.optional().default({})
});

// Response interface
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

// Helper function to validate and process attachments
async function processAttachments(attachments: any[]): Promise<any[]> {
  const processedAttachments = [];
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/webm',
    'application/pdf', 'text/plain', 'text/csv',
    'application/json', 'text/markdown'
  ];
  
  for (const attachment of attachments) {
    try {
      // Validate file size
      if (attachment.size > maxFileSize) {
        throw new Error(`File ${attachment.name} exceeds maximum size of 50MB`);
      }

      // Validate file type
      const fileType = attachment.type || attachment.mimeType;
      if (!allowedTypes.includes(fileType)) {
        throw new Error(`File type ${fileType} is not supported`);
      }

      // Process attachment
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

// Helper function to build conversation context for Gemini
function buildGeminiContext(context: any[], currentMessage: string, attachments: any[]): string {
  let prompt = '';
  
  // Add system context
  prompt += "You are an intelligent AI assistant. You can communicate in Indonesian and English. Be helpful, informative, and concise.\n\n";
  
  // Add conversation history (last 15 messages for better context)
  if (context && context.length > 0) {
    const recentContext = context.slice(-15);
    prompt += "Previous conversation:\n";
    
    for (const msg of recentContext) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      prompt += `[${timestamp}] ${role}: ${msg.content}\n`;
    }
    
    prompt += "\n---\n\n";
  }
  
  // Add current message
  prompt += `Current message: ${currentMessage}`;
  
  // Add attachment information
  if (attachments && attachments.length > 0) {
    prompt += "\n\nAttached files:\n";
    for (const attachment of attachments) {
      const sizeKB = Math.round(attachment.size / 1024);
      prompt += `- ${attachment.name} (${attachment.type}, ${sizeKB}KB)\n`;
      
      // Add specific handling instructions based on file type
      if (attachment.type.startsWith('image/')) {
        prompt += "  → Please analyze and describe this image\n";
      } else if (attachment.type.startsWith('audio/')) {
        prompt += "  → Please transcribe or analyze this audio file\n";
      } else if (attachment.type === 'application/pdf' || attachment.type === 'text/plain') {
        prompt += "  → Please read and summarize the content of this document\n";
      }
    }
    
    prompt += "\nPlease address the attached files in your response when relevant.\n";
  }
  
  return prompt;
}

// Helper function to check user quota
async function checkUserQuota(user: any): Promise<{ allowed: boolean; usage: any; quota: number }> {
  try {
    const usage = user ? await getUserUsage(user.id) : { messageCount: 0, fileUploads: 0 };
    const quota = user?.role === 'admin' ? 1000 : (user ? 100 : 10);
    
    return {
      allowed: usage.messageCount < quota,
      usage,
      quota
    };
  } catch (error) {
    console.error('Error checking user quota:', error);
    // Default to allowing the request if quota check fails
    return {
      allowed: true,
      usage: { messageCount: 0, fileUploads: 0 },
      quota: user?.role === 'admin' ? 1000 : (user ? 100 : 10)
    };
  }
}

// Helper function to save message to database
async function saveMessage(
  sessionId: string | undefined,
  role: 'user' | 'assistant',
  content: string,
  attachments?: any[],
  metadata?: any
): Promise<string | undefined> {
  if (!sessionId) return undefined;

  try {
    const message = await createMessage({
      session_id: sessionId,
      role,
      content,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      metadata
    });
    return message?.id;
  } catch (error) {
    console.error('Error saving message:', error);
    return undefined;
  }
}

// Main POST handler
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResult = await chatRateLimiter.checkLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please slow down.',
          errorType: 'rate_limit_exceeded',
          details: {
            retryAfter: rateLimitResult.retryAfter,
            remainingRequests: rateLimitResult.remaining
          }
        },
        { status: 429 }
      );
    }

    // Parse request body with enhanced error handling
    let body;
    try {
      const rawBody = await request.text();
      
      if (!rawBody.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Request body cannot be empty',
            errorType: 'validation_error',
            details: 'Please provide a valid JSON request body'
          },
          { status: 400 }
        );
      }
      
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON format in request body',
            errorType: 'parse_error',
            details: parseError instanceof Error ? parseError.message : 'Failed to parse JSON'
          },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to read request body',
          errorType: 'request_error',
          details: error instanceof Error ? error.message : 'Unknown request error'
        },
        { status: 400 }
      );
    }

    // Validate request structure with Zod
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      const errorDetails = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          errorType: 'validation_error',
          details: errorDetails
        },
        { status: 400 }
      );
    }

    const { 
      message, 
      sessionId, 
      attachments = [], 
      conversationContext = [],
      continueFrom,
      settings = {} 
    } = validation.data;

    // Set default settings with validation
    const finalSettings: { model: string; temperature: number; maxTokens: number; systemPrompt?: string } = {
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 4096,
      ...settings
    };

    // Validate model selection
    const allowedModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    if (!allowedModels.includes(finalSettings.model)) {
      finalSettings.model = 'gemini-1.5-flash';
    }

    // Get and validate user authentication
    const user = await getUserFromRequest(request);
    
    // Check user quota
    const quotaCheck = await checkUserQuota(user);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message quota exceeded. Please upgrade your plan or try again later.',
          errorType: 'quota_exceeded',
          details: {
            current: quotaCheck.usage.messageCount,
            limit: quotaCheck.quota,
            resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        },
        { status: 429 }
      );
    }

    // Process and validate attachments
    let processedAttachments: any[] = [];
    try {
      if (attachments.length > 0) {
        processedAttachments = await processAttachments(attachments);
        
        // Check file upload quota for users with attachments
        if (user && processedAttachments.length > 0) {
          const fileQuota = user.role === 'admin' ? 1000 : 50;
          if (quotaCheck.usage.fileUploads >= fileQuota) {
            return NextResponse.json(
              {
                success: false,
                error: 'File upload quota exceeded',
                errorType: 'file_quota_exceeded'
              },
              { status: 429 }
            );
          }
        }
      }
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

    // Handle session management
    let currentSessionId = sessionId;
    
    if (user && !currentSessionId) {
      try {
        // Create new session for authenticated users
        const sessionTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        const newSession = await createChatSession(
          user.id,
          sessionTitle
        );
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

    // Prepare and send request to Gemini AI
    try {
      // Get the AI model
      const model = genAI.getGenerativeModel({ 
        model: finalSettings.model,
        generationConfig: {
          temperature: finalSettings.temperature,
          maxOutputTokens: finalSettings.maxTokens,
        },
        systemInstruction: finalSettings.systemPrompt || 
          "You are a helpful AI assistant. Respond naturally in Indonesian when appropriate, but you can also use English or other languages as needed. Be informative, concise, and helpful. When analyzing files or attachments, provide detailed and useful insights."
      });

      // Build enhanced prompt with full context
      let prompt = buildGeminiContext(conversationContext, message, processedAttachments);

      // Handle continue functionality
      if (continueFrom) {
        prompt = `Continue the following response naturally and seamlessly: "${continueFrom}"\n\nOriginal context: ${prompt}`;
      }

      // Generate AI response with timeout
      const aiStartTime = Date.now();
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI request timeout')), 30000) // 30 second timeout
        )
      ]) as any;

      const response = result.response;
      const aiResponse = response.text();

      if (!aiResponse || aiResponse.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI generated empty response. Please try rephrasing your message.',
            errorType: 'ai_empty_response'
          },
          { status: 500 }
        );
      }

      const aiProcessingTime = Date.now() - aiStartTime;

      // Save AI response to database
      let aiMessageId: string | undefined;
      if (user && currentSessionId) {
        aiMessageId = await saveMessage(
          currentSessionId,
          'assistant',
          aiResponse,
          undefined,
          {
            model: finalSettings.model,
            temperature: finalSettings.temperature,
            processingTime: aiProcessingTime,
            attachmentCount: processedAttachments.length,
            conversationLength: conversationContext.length,
            continueFrom: continueFrom || null
          }
        );

        // Update session timestamp and metadata
        try {
          await updateChatSession(currentSessionId, {
            updated_at: new Date().toISOString(),
            metadata: {
              lastModel: finalSettings.model,
              messageCount: conversationContext.length + 2,
              lastActivity: new Date().toISOString(),
              hasAttachments: processedAttachments.length > 0
            }
          });
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }

      // Track usage for authenticated users
      if (user) {
        try {
          await trackUsage(user.id, 'message');
          if (processedAttachments.length > 0) {
            await trackUsage(user.id, 'file_upload');
          }
        } catch (error) {
          console.error('Error tracking usage:', error);
        }
      }

      // Get updated usage for response
      let updatedUsage = quotaCheck.usage;
      if (user) {
        try {
          updatedUsage = await getUserUsage(user.id);
        } catch (error) {
          console.error('Error getting updated usage:', error);
        }
      }

      const totalProcessingTime = Date.now() - startTime;

      // Cache successful response for potential retry scenarios
      if (user && currentSessionId) {
        try {
          const cacheKey = `chat_response:${currentSessionId}:${userMessageId}`;
          await cacheManager.set(cacheKey, {
            response: aiResponse,
            timestamp: new Date().toISOString()
          }, 300); // Cache for 5 minutes
        } catch (error) {
          console.error('Error caching response:', error);
        }
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        response: aiResponse,
        sessionId: currentSessionId,
        messageId: aiMessageId,
        usage: {
          messageCount: updatedUsage.messageCount + 1,
          remainingQuota: Math.max(0, quotaCheck.quota - (updatedUsage.messageCount + 1))
        },
        metadata: {
          model: finalSettings.model,
          temperature: finalSettings.temperature,
          processingTime: totalProcessingTime,
          attachmentCount: processedAttachments.length
        }
      });

    } catch (aiError) {
      console.error('Gemini AI error:', aiError);
      
      // Handle specific AI service errors
      if (aiError instanceof Error) {
        const errorMessage = aiError.message.toLowerCase();
        
        if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Content blocked by safety filters. Please rephrase your message to comply with content guidelines.',
              errorType: 'safety_filter'
            },
            { status: 400 }
          );
        }
        
        if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
          return NextResponse.json(
            {
              success: false,
              error: 'AI service quota exceeded. Please try again later.',
              errorType: 'quota_exceeded'
            },
            { status: 429 }
          );
        }

        if (errorMessage.includes('invalid') || errorMessage.includes('argument')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid input provided to AI service. Please check your message and try again.',
              errorType: 'invalid_input'
            },
            { status: 400 }
          );
        }

        if (errorMessage.includes('timeout')) {
          return NextResponse.json(
            {
              success: false,
              error: 'AI service request timed out. Please try again with a shorter message.',
              errorType: 'timeout_error'
            },
            { status: 408 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'AI service temporarily unavailable. Please try again in a moment.',
          errorType: 'ai_service_error',
          details: process.env.NODE_ENV === 'development' 
            ? (aiError instanceof Error ? aiError.message : 'Unknown AI error')
            : undefined
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Chat API critical error:', error);
    
    // Handle different types of system errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('auth')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication token invalid or expired. Please login again.',
            errorType: 'auth_error'
          },
          { status: 401 }
        );
      }

      if (errorMessage.includes('database') || errorMessage.includes('connection') || errorMessage.includes('supabase')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database temporarily unavailable. Please try again.',
            errorType: 'database_error'
          },
          { status: 503 }
        );
      }

      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Network error occurred. Please check your connection and try again.',
            errorType: 'network_error'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred. Please try again.',
        errorType: 'server_error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com' 
        : '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// Handle GET requests (for API health check)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Chat API is running',
    version: '2.0',
    timestamp: new Date().toISOString(),
    features: [
      'file_attachments',
      'conversation_context',
      'rate_limiting',
      'user_authentication',
      'session_management',
      'usage_tracking'
    ]
  });
}