import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from '@/lib/gemini';

interface FileAttachment {
  type: 'image' | 'document' | 'audio' | 'video' | 'other';
  mimeType: string;
  fileName: string;
  fileSize: number;
  base64: string;
}

interface ChatRequest {
  message: string;
  attachments?: FileAttachment[];
  conversationContext?: any[];
  continueFrom?: string;
  isContination?: boolean;
}

// FIXED: Enhanced error handling with structured error types
interface ErrorResponse {
  success: false;
  error: string;
  errorType: string;
  details?: any;
}

interface SuccessResponse {
  success: true;
  message: string;
  isIncomplete?: boolean;
  hasAttachments?: boolean;
  processedAttachments?: number;
  attachmentErrors?: string[];
  contextLength?: number;
  metadata?: {
    attachmentTypes: string[];
    totalAttachmentSize: number;
  };
}

type ChatResponse = ErrorResponse | SuccessResponse;

// FIXED: Centralized error handler with specific error types
function createErrorResponse(
  error: unknown, 
  context: string,
  statusCode: number = 500
): { response: NextResponse<ErrorResponse>; logged: boolean } {
  let errorMessage = 'Internal server error';
  let errorType = 'server_error';
  let details: any = undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    
    // Classify error types for better handling
    if (error.message.includes('quota') || error.message.includes('limit')) {
      errorType = 'quota_exceeded';
      statusCode = 429;
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message.includes('safety') || error.message.includes('blocked')) {
      errorType = 'safety_filter';
      statusCode = 400;
      errorMessage = 'Response blocked by safety filters. Please try different content.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'network_error';
      statusCode = 503;
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('timeout')) {
      errorType = 'timeout_error';
      statusCode = 408;
      errorMessage = 'Request timeout. Please try again.';
    } else if (error.message.includes('file') || error.message.includes('attachment')) {
      errorType = 'file_error';
      statusCode = 400;
      errorMessage = 'Error processing files. Please check file format and size.';
    } else if (error.message.includes('size') || error.message.includes('large')) {
      errorType = 'file_too_large';
      statusCode = 413;
      errorMessage = 'File too large. Please upload smaller files.';
    } else if (error.message.includes('vision') || error.message.includes('image')) {
      errorType = 'vision_error';
      statusCode = 400;
      errorMessage = 'Unable to process images. Please ensure they are valid image files.';
    } else if (error.message.includes('audio')) {
      errorType = 'audio_error';
      statusCode = 400;
      errorMessage = 'Unable to process audio. Please ensure it\'s a supported audio format.';
    } else if (error.message.includes('video')) {
      errorType = 'video_error';
      statusCode = 400;
      errorMessage = 'Unable to process video. Please ensure it\'s a supported video format.';
    }
  }

  // Log error with context
  console.error(`🚨 ${context} Error [${errorType}]:`, {
    message: errorMessage,
    originalError: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    errorType,
    statusCode
  });

  return {
    response: NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorType,
        details
      } as ErrorResponse,
      { status: statusCode }
    ),
    logged: true
  };
}

// FIXED: Enhanced validation with detailed error messages
function validateRequest(body: any): { isValid: boolean; error?: string; data?: ChatRequest } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }

  const { message, attachments, conversationContext, continueFrom, isContination } = body;

  // Validate message
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'Message is required and must be a string' };
  }

  if (message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (message.length > 10000) {
    return { isValid: false, error: 'Message too long (max 10,000 characters)' };
  }

  // Validate attachments if present
  if (attachments && !Array.isArray(attachments)) {
    return { isValid: false, error: 'Attachments must be an array' };
  }

  if (attachments && attachments.length > 20) {
    return { isValid: false, error: 'Too many attachments (max 20)' };
  }

  // Validate conversation context if present
  if (conversationContext && !Array.isArray(conversationContext)) {
    return { isValid: false, error: 'Conversation context must be an array' };
  }

  return {
    isValid: true,
    data: {
      message: message.trim(),
      attachments: attachments || [],
      conversationContext: conversationContext || [],
      continueFrom,
      isContination: Boolean(isContination)
    }
  };
}

// FIXED: Enhanced attachment validation
function validateAttachment(attachment: any): { isValid: boolean; error?: string; attachment?: FileAttachment } {
  if (!attachment || typeof attachment !== 'object') {
    return { isValid: false, error: 'Invalid attachment object' };
  }

  const { type, mimeType, fileName, fileSize, base64 } = attachment;

  // Validate required fields
  if (!type || !['image', 'document', 'audio', 'video', 'other'].includes(type)) {
    return { isValid: false, error: `Invalid attachment type: ${type}` };
  }

  if (!mimeType || typeof mimeType !== 'string') {
    return { isValid: false, error: 'Missing or invalid mimeType' };
  }

  if (!fileName || typeof fileName !== 'string') {
    return { isValid: false, error: 'Missing or invalid fileName' };
  }

  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return { isValid: false, error: 'Invalid fileSize' };
  }

  if (!base64 || typeof base64 !== 'string') {
    return { isValid: false, error: 'Missing or invalid base64 data' };
  }

  // Validate file size limits
  const maxSizes = {
    image: 10 * 1024 * 1024,    // 10MB
    document: 25 * 1024 * 1024, // 25MB
    audio: 50 * 1024 * 1024,    // 50MB
    video: 100 * 1024 * 1024,   // 100MB
    other: 10 * 1024 * 1024     // 10MB
  };

  if (fileSize > maxSizes[type as keyof typeof maxSizes]) {
    return { 
      isValid: false, 
      error: `File too large: ${fileName} (max ${Math.round(maxSizes[type as keyof typeof maxSizes] / 1024 / 1024)}MB for ${type})` 
    };
  }

  // Validate MIME type matches category
  const validMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
    video: ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/mkv'],
    document: [
      'application/pdf', 'application/msword', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json', 'text/markdown', 'text/html', 'text/xml'
    ],
    other: [] // Allow any MIME type for 'other'
  };

  if (
    type !== 'other' &&
    !(validMimeTypes[type as keyof typeof validMimeTypes] as string[]).includes(mimeType)
  ) {
    return {
      isValid: false,
      error: `Unsupported MIME type ${mimeType} for ${type} file: ${fileName}`
    };
  }

  return {
    isValid: true,
    attachment: {
      type,
      mimeType,
      fileName,
      fileSize,
      base64
    }
  };
}

// Generate attachment summary for prompt enhancement
function summarizeAttachments(attachments: FileAttachment[]): string {
  if (attachments.length === 0) return '';
  
  const summary = attachments
    .map(att => `${att.fileName} (${att.type}${att.fileSize ? `, ${Math.round(att.fileSize / 1024)}KB` : ''})`)
    .join(', ');
  
  return `[User has uploaded ${attachments.length} file${attachments.length !== 1 ? 's' : ''}: ${summary}. Please analyze and provide insights about the uploaded content.]`;
}

// Generate fallback response based on attachment types
function generateFallbackResponse(attachments: FileAttachment[]): string {
  if (attachments.length === 0) {
    return "I'm experiencing some technical difficulties. Please try again or rephrase your question.";
  }
  
  const hasImages = attachments.some(att => att.type === 'image');
  const hasDocuments = attachments.some(att => att.type === 'document');
  const hasAudio = attachments.some(att => att.type === 'audio');
  const hasVideo = attachments.some(att => att.type === 'video');
  
  if (hasImages) {
    return "I'm having trouble analyzing the uploaded images right now. Please try uploading different images or describe what you'd like me to help you with.";
  }
  
  if (hasDocuments) {
    return "I'm having trouble processing the uploaded documents. Please try converting them to text format or describe what you'd like me to help you with.";
  }
  
  if (hasAudio) {
    return "I'm having trouble processing the uploaded audio files. Please describe what's in the audio or what you'd like me to help you with.";
  }
  
  if (hasVideo) {
    return "I'm having trouble processing the uploaded video files. Please describe what's in the video or what you'd like me to help you with.";
  }
  
  return "I'm having trouble processing the uploaded files. Please describe what you'd like me to help you with regarding the uploaded content.";
}

// FIXED: Enhanced incomplete response detection
function detectIncompleteResponse(response: string): boolean {
  if (!response || typeof response !== 'string') return false;
  
  const text = response.trim();
  
  // Check for common indicators of incomplete responses
  const incompleteIndicators = [
    /[^.!?]\s*$/, // Response cuts off mid-sentence
    /```[^`]*$/, // Unfinished code blocks
    /^\d+\.\s+[^.!?]*$/m, // Incomplete numbered lists
    /^[-*]\s+[^.!?]*$/m, // Incomplete bullet points
    /^#{1,6}\s+[^.!?]*$/m, // Incomplete headers
  ];

  // Check length - responses over 3000 chars are more likely to be cut off
  const isVeryLong = text.length > 3000;
  
  // Check for incomplete indicators
  const hasIncompleteIndicators = incompleteIndicators.some(pattern => pattern.test(text));
  
  // Additional heuristics
  const endsAbruptly = !text.match(/[.!?]$/);
  const hasUnfinishedCode = text.includes('```') && (text.match(/```/g) || []).length % 2 !== 0;
  
  return isVeryLong && (hasIncompleteIndicators || endsAbruptly || hasUnfinishedCode);
}

// FIXED: Main API handler with comprehensive error handling
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    // Parse request body with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });

    const body = await Promise.race([
      request.json(),
      timeoutPromise
    ]);

    // Validate request
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error!,
          errorType: 'validation_error'
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const { message, attachments = [], conversationContext, continueFrom, isContination } = validation.data!;

    console.log('📨 Processing chat request:', {
      messageLength: message.length,
      attachmentCount: attachments.length,
      contextLength: (conversationContext ?? []).length,
      isContination
    });

    // FIXED: Process and validate attachments with detailed error tracking
    const validAttachments: FileAttachment[] = [];
    const attachmentErrors: string[] = [];

    for (const [index, attachment] of attachments.entries()) {
      const attachmentValidation = validateAttachment(attachment);
      if (attachmentValidation.isValid) {
        validAttachments.push(attachmentValidation.attachment!);
      } else {
        attachmentErrors.push(`Attachment ${index + 1}: ${attachmentValidation.error}`);
      }
    }

    // If all attachments failed validation, return error
    if (attachments.length > 0 && validAttachments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `All attachments failed validation: ${attachmentErrors.join('; ')}`,
          errorType: 'attachment_validation_error',
          details: attachmentErrors
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Prepare enhanced prompt
    let enhancedPrompt = message;

    try {
      // FIXED: Generate response with proper error handling
      let response: string;

      if (isContination && continueFrom) {
        // Handle continuation requests
        console.log('🔄 Processing continuation request');
        enhancedPrompt = `${message}\n\nPrevious incomplete response:\n${continueFrom}\n\nPlease continue exactly where the previous response left off.`;
        response = await generateResponse(enhancedPrompt, []);
      } else {
        // Handle regular messages with attachments
        console.log('💬 Processing regular message with attachments');
        
        // Add context about attachments to prompt if any
        if (validAttachments.length > 0) {
          const attachmentSummary = summarizeAttachments(validAttachments);
          enhancedPrompt += `\n\n${attachmentSummary}`;
        }
        
        // Add conversation context if available
        if ((conversationContext ?? []).length > 0) {
          const contextText = (conversationContext ?? [])
            .slice(-5) // Last 5 messages for context
            .map((msg: any) => `${msg.role}: ${msg.content}`)
            .join('\n');
          enhancedPrompt = `Previous conversation:\n${contextText}\n\nCurrent message: ${enhancedPrompt}`;
        }
        
        // Generate response with multimodal support
        response = await generateResponse(enhancedPrompt, validAttachments);
      }

      // FIXED: Enhanced response validation and error handling
      if (!response || response.trim().length === 0) {
        console.warn('⚠️ Empty response from Gemini, using fallback');
        
        const fallbackMessage = validAttachments.length > 0 
          ? "I can see you've uploaded some files, but I'm having trouble processing them right now. Could you describe what you'd like me to help you with?"
          : "I apologize, but I encountered an issue generating a response. Could you please rephrase your question or try again?";
          
        response = fallbackMessage;
      }

      // Detect if response might be incomplete
      const isIncomplete = detectIncompleteResponse(response);

      console.log('📤 Response generated successfully:', {
        length: response.length,
        isIncomplete,
        isContination,
        hasAttachments: validAttachments.length > 0,
        processedAttachments: validAttachments.length,
        attachmentErrors: attachmentErrors.length,
        endsWithPunctuation: /[.!?]$/.test(response.trim())
      });

      // FIXED: Return structured success response
      return NextResponse.json({
        success: true,
        message: response,
        isIncomplete,
        hasAttachments: validAttachments.length > 0,
        processedAttachments: validAttachments.length,
        attachmentErrors: attachmentErrors.length > 0 ? attachmentErrors : undefined,
        contextLength: (conversationContext ?? []).length,
        metadata: {
          attachmentTypes: validAttachments.map(att => att.type),
          totalAttachmentSize: validAttachments.reduce((sum, att) => sum + att.fileSize, 0)
        }
      } as SuccessResponse);

    } catch (geminiError) {
      console.error('💥 Gemini Error:', geminiError);
      
      // FIXED: Provide helpful fallback response based on content type instead of just error
      const fallbackResponse = generateFallbackResponse(validAttachments);
      
      // Return fallback response as success with warning
      return NextResponse.json({
        success: true,
        message: fallbackResponse,
        isIncomplete: false,
        hasAttachments: validAttachments.length > 0,
        processedAttachments: 0,
        attachmentErrors: [`AI processing error: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`],
        contextLength: (conversationContext ?? []).length,
        metadata: {
          attachmentTypes: validAttachments.map(att => att.type),
          totalAttachmentSize: validAttachments.reduce((sum, att) => sum + att.fileSize, 0)
        }
      } as SuccessResponse);
    }

  } catch (error) {
    // FIXED: Use centralized error handling
    const errorResponse = createErrorResponse(error, 'API Chat Route');
    return errorResponse.response;
  }
}

// FIXED: Add proper error handling for unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to send messages.',
      errorType: 'method_not_allowed'
    } as ErrorResponse,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to send messages.',
      errorType: 'method_not_allowed'
    } as ErrorResponse,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to send messages.',
      errorType: 'method_not_allowed'
    } as ErrorResponse,
    { status: 405 }
  );
}