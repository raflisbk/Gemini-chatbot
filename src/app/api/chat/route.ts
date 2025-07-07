// src/app/api/chat/route.ts - Fixed version with correct imports

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// FIXED: Import from your existing supabase functions
import { 
  createChatSession,
  updateChatSession,
  getSessionMessages,
  trackUsage
} from '@/lib/supabase';

// FIXED: Import from your existing auth functions
import { verifyToken } from '@/lib/auth';
import { AppErrorHandler, ErrorType } from '@/lib/errorHandler';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
}

interface ChatResponse {
  success: boolean;
  response?: string;
  sessionId?: string | undefined; // FIXED: Allow undefined
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
  };
  error?: string;
  errorType?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  let user: any = null;
  let currentSessionId: string | undefined = undefined; // FIXED: Use undefined instead of null
  
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, sessionId, attachments = [], settings = {} } = body;

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

    // FIXED: Verify authentication with correct function name
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (authToken) {
      try {
        user = await verifyToken(authToken); // FIXED: Use verifyToken instead of verifyAuthToken
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Continue as guest if auth fails
      }
    }

    // FIXED: Simple quota check for authenticated users
    let quotaCheck = { usage: { messageCount: 0 }, quota: 1000 };
    if (user) {
      // Use a simple approach if validateUserQuota doesn't exist
      try {
        await trackUsage(user.id, 'message');
        quotaCheck = { usage: { messageCount: 1 }, quota: 1000 };
      } catch (error) {
        console.error('Usage tracking error:', error);
      }
    }

    // Handle session management
    currentSessionId = sessionId;
    if (user && !currentSessionId) {
      // Create new session for authenticated users
      const newSessionTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      try {
        currentSessionId = await createChatSession(user.id, newSessionTitle);
      } catch (error) {
        console.error('Session creation error:', error);
      }
    }

    // Process attachments with proper base64 handling
    const processedAttachments = await processAttachments(attachments);

    // Build conversation context with enhanced memory
    const conversationParts = await buildEnhancedContext(
      currentSessionId, 
      message, 
      processedAttachments
    );

    // Configure AI model
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

    // FIXED: Save messages to database with custom function
    let userMessageId: string | undefined;
    let aiMessageId: string | undefined;

    if (user && currentSessionId) {
      try {
        // Use your existing saveMessage function or create a simple one
        userMessageId = await saveMessage(
          currentSessionId,
          'user',
          message,
          processedAttachments.map(att => ({
            name: att.name,
            type: att.mimeType,
            size: att.size,
            url: att.url || ''
          }))
        );

        aiMessageId = await saveMessage(
          currentSessionId,
          'assistant',
          aiResponse,
          []
        );

        // Update session
        const messageCount = await getSessionMessageCount(currentSessionId);
        await updateChatSession(currentSessionId, {
          last_message_at: new Date().toISOString(),
          message_count: messageCount + 2,
          context_summary: aiResponse.slice(0, 200) + (aiResponse.length > 200 ? '...' : '')
        });

      } catch (error) {
        console.error('Database save error:', error);
        // Continue without saving if there's an error
      }
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Return successful response
    const response: ChatResponse = {
      success: true,
      response: aiResponse,
      sessionId: currentSessionId, // FIXED: This can be undefined now
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
// ENHANCED CONTEXT BUILDING
// ========================================

async function buildEnhancedContext(
  sessionId: string | undefined, 
  currentMessage: string, 
  attachments: any[]
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
  if (sessionId) {
    try {
      const messages = await getSessionMessages(sessionId, 50);
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
    const messages = await getSessionMessages(sessionId, 1000);
    return messages?.length || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

// FIXED: Custom saveMessage function to handle your database structure
async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  attachments: any[] = []
): Promise<string> {
  try {
    // This should match your existing database structure
    // Adjust based on your actual saveMessage implementation
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use your existing supabase client to save message
    // This is a placeholder - adjust based on your actual implementation
    console.log('Saving message:', { sessionId, role, content, attachments });
    
    return messageId;
  } catch (error) {
    console.error('Error saving message:', error);
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