// src/app/api/chat/route.ts - Enhanced with full multimodal support

import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from '@/lib/gemini';

interface FileAttachment {
  type: 'image' | 'document' | 'audio' | 'video' | 'other';
  mimeType: string;
  fileName: string;
  fileSize: number;
  base64: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      attachments = [], 
      conversationContext = [], 
      continueFrom = null,
      isContination = false 
    } = body;

    console.log('📨 API Request:', { 
      messageLength: message?.length, 
      attachmentCount: attachments.length,
      attachmentTypes: attachments.map((att: FileAttachment) => att.type),
      hasImages: attachments.some((att: FileAttachment) => att.type === 'image'),
      hasDocuments: attachments.some((att: FileAttachment) => att.type === 'document'),
      hasAudio: attachments.some((att: FileAttachment) => att.type === 'audio'),
      hasVideo: attachments.some((att: FileAttachment) => att.type === 'video'),
      isContination, 
      hasContext: conversationContext.length > 0 
    });

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Validate and process attachments
    const validAttachments: FileAttachment[] = [];
    const attachmentErrors: string[] = [];
    
    for (const attachment of attachments) {
      const validationResult = validateAttachment(attachment);
      if (validationResult.isValid) {
        validAttachments.push(attachment);
      } else {
        console.warn('Invalid attachment filtered out:', attachment.fileName, validationResult.error);
        attachmentErrors.push(`${attachment.fileName}: ${validationResult.error}`);
      }
    }

    let response: string;
    let enhancedPrompt = message;

    try {
      // Handle continuation requests
      if (isContination && continueFrom) {
        console.log('🔄 Processing continuation request');
        
        enhancedPrompt = `${message}\n\nPrevious incomplete response (continue from here):\n"...${continueFrom.slice(-300)}"\n\nPlease continue seamlessly from where it ended, without repeating what was already said.`;
        
        // Don't include attachments in continuation to avoid confusion
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
        if (conversationContext.length > 0) {
          const contextText = conversationContext
            .slice(-5) // Last 5 messages for context
            .map((msg: any) => `${msg.role}: ${msg.content}`)
            .join('\n');
          enhancedPrompt = `Previous conversation:\n${contextText}\n\nCurrent message: ${enhancedPrompt}`;
        }
        
        // Generate response with multimodal support
        response = await generateResponse(enhancedPrompt, validAttachments);
      }

      // Handle empty response
      if (!response || response.trim().length === 0) {
        console.warn('⚠️ Empty response from Gemini, trying fallback');
        
        const fallbackMessage = validAttachments.length > 0 
          ? "I can see you've uploaded some files, but I'm having trouble processing them right now. Could you describe what you'd like me to help you with?"
          : "I apologize, but I encountered an issue generating a response. Could you please rephrase your question or try again?";
          
        response = fallbackMessage;
      }

      // Detect if response might be incomplete
      const isIncomplete = detectIncompleteResponse(response);

      console.log('📤 Response generated:', {
        length: response.length,
        isIncomplete,
        isContination,
        hasAttachments: validAttachments.length > 0,
        processedAttachments: validAttachments.length,
        attachmentErrors: attachmentErrors.length,
        endsWithPunctuation: /[.!?]$/.test(response.trim())
      });

      return NextResponse.json({
        success: true,
        message: response,
        isIncomplete,
        hasAttachments: validAttachments.length > 0,
        processedAttachments: validAttachments.length,
        attachmentErrors: attachmentErrors.length > 0 ? attachmentErrors : undefined,
        contextLength: conversationContext.length,
        metadata: {
          attachmentTypes: validAttachments.map(att => att.type),
          totalAttachmentSize: validAttachments.reduce((sum, att) => sum + att.fileSize, 0)
        }
      });

    } catch (geminiError) {
      console.error('💥 Gemini Error:', geminiError);
      
      // Handle specific multimodal errors
      if (geminiError instanceof Error) {
        if (geminiError.message.includes('safety filters')) {
          return NextResponse.json({
            success: false,
            error: 'The uploaded content was blocked by safety filters. Please try different content.',
            errorType: 'safety_filter'
          }, { status: 400 });
        }
        
        if (geminiError.message.includes('vision') || geminiError.message.includes('image')) {
          return NextResponse.json({
            success: false,
            error: 'Unable to process the uploaded images. Please ensure they are valid image files.',
            errorType: 'vision_error'
          }, { status: 400 });
        }
        
        if (geminiError.message.includes('audio')) {
          return NextResponse.json({
            success: false,
            error: 'Unable to process the uploaded audio. Please ensure it\'s a supported audio format.',
            errorType: 'audio_error'
          }, { status: 400 });
        }
        
        if (geminiError.message.includes('video')) {
          return NextResponse.json({
            success: false,
            error: 'Unable to process the uploaded video. Please ensure it\'s a supported video format.',
            errorType: 'video_error'
          }, { status: 400 });
        }
        
        if (geminiError.message.includes('quota') || geminiError.message.includes('limit')) {
          return NextResponse.json({
            success: false,
            error: 'API quota exceeded. Please try again later.',
            errorType: 'quota_exceeded'
          }, { status: 429 });
        }
      }
      
      // Provide helpful fallback response based on content type
      const fallbackResponse = generateFallbackResponse(validAttachments);
      
      return NextResponse.json({
        success: true,
        message: fallbackResponse,
        isIncomplete: false,
        error: 'fallback_response',
        processedAttachments: 0
      });
    }

  } catch (error) {
    console.error('🚨 API Error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('file') || error.message.includes('attachment')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error processing uploaded files. Please check file format and size.',
            errorType: 'file_error'
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('size') || error.message.includes('large')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'File too large. Please upload smaller files.',
            errorType: 'file_too_large'
          },
          { status: 413 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

// Validate attachment data
function validateAttachment(attachment: any): { isValid: boolean; error?: string } {
  if (!attachment || typeof attachment !== 'object') {
    return { isValid: false, error: 'Invalid attachment object' };
  }
  
  if (!attachment.type || typeof attachment.type !== 'string') {
    return { isValid: false, error: 'Missing or invalid type' };
  }
  
  if (!attachment.mimeType || typeof attachment.mimeType !== 'string') {
    return { isValid: false, error: 'Missing or invalid MIME type' };
  }
  
  if (!attachment.fileName || typeof attachment.fileName !== 'string') {
    return { isValid: false, error: 'Missing or invalid filename' };
  }
  
  if (typeof attachment.fileSize !== 'number' || attachment.fileSize <= 0) {
    return { isValid: false, error: 'Invalid file size' };
  }
  
  if (!attachment.base64 || typeof attachment.base64 !== 'string' || attachment.base64.length === 0) {
    return { isValid: false, error: 'Missing or invalid base64 data' };
  }
  
  // Check file size limits (adjust as needed)
  const maxSizes = {
    image: 10 * 1024 * 1024,  // 10MB for images
    document: 5 * 1024 * 1024, // 5MB for documents
    audio: 25 * 1024 * 1024,   // 25MB for audio
    video: 50 * 1024 * 1024,   // 50MB for video
    other: 5 * 1024 * 1024     // 5MB for other types
  };
  
  const maxSize = maxSizes[attachment.type as keyof typeof maxSizes] || maxSizes.other;
  if (attachment.fileSize > maxSize) {
    return { 
      isValid: false, 
      error: `File too large. Maximum size for ${attachment.type} files is ${Math.round(maxSize / (1024 * 1024))}MB` 
    };
  }
  
  return { isValid: true };
}

// Summarize attachments for prompt enhancement
function summarizeAttachments(attachments: FileAttachment[]): string {
  const counts = attachments.reduce((acc, att) => {
    acc[att.type] = (acc[att.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const summary = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');
  
  return `[User has uploaded ${attachments.length} file(s): ${summary}. Please analyze and provide insights about the uploaded content.]`;
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

// Helper function to detect incomplete responses (keeping existing logic)
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