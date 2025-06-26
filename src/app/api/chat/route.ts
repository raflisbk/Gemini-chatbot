import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from '@/lib/gemini';

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
      isContination, 
      hasContext: conversationContext.length > 0 
    });

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    let response: string;

    try {
      // Handle continuation requests
      if (isContination && continueFrom) {
        console.log('🔄 Processing continuation request');
        
        // For continuation, modify the prompt to encourage completion
        const enhancedPrompt = `${message}\n\nPrevious incomplete response (continue from here):\n"...${continueFrom.slice(-300)}"\n\nPlease continue seamlessly from where it ended, without repeating what was already said.`;
        response = await generateResponse(enhancedPrompt);
      } else {
        // Handle regular messages
        console.log('💬 Processing regular message');
        response = await generateResponse(message);
      }

      // Handle empty response
      if (!response || response.trim().length === 0) {
        console.warn('⚠️ Empty response from Gemini, trying fallback');
        response = "I apologize, but I encountered an issue generating a response. Could you please rephrase your question or try again?";
      }

      // Detect if response might be incomplete
      const isIncomplete = detectIncompleteResponse(response);

      console.log('📤 Response generated:', {
        length: response.length,
        isIncomplete,
        isContination,
        endsWithPunctuation: /[.!?]$/.test(response.trim())
      });

      return NextResponse.json({
        success: true,
        message: response,
        isIncomplete,  // Include incomplete detection
        hasAttachments: attachments.length > 0,
        contextLength: conversationContext.length
      });

    } catch (geminiError) {
      console.error('💥 Gemini Error:', geminiError);
      
      // Provide helpful fallback response
      const fallbackResponse = "I'm experiencing some technical difficulties. Please try again or rephrase your question.";
      
      return NextResponse.json({
        success: true,
        message: fallbackResponse,
        isIncomplete: false,
        error: 'fallback_response'
      });
    }

  } catch (error) {
    console.error('🚨 API Error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'API quota exceeded. Please try again later.',
            errorType: 'quota_exceeded'
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('token')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Response too long. Please try a shorter message.',
            errorType: 'token_limit',
            isIncomplete: true
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

// Helper function to detect incomplete responses
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
  const hasIncompleteTable = text.includes('|') && text.split('\n').some(line => 
    line.includes('|') && !line.trim().endsWith('|')
  );
  
  // Common incomplete phrases
  const incompleteEndings = [
    'in conclusion', 'to summarize', 'in summary', 'finally', 'lastly',
    'in addition', 'furthermore', 'moreover', 'however', 'therefore', 
    'as a result', 'for example', 'such as', 'including', 'optim'
  ];
  
  const endsWithIncompletePhrase = incompleteEndings.some(phrase => 
    text.toLowerCase().endsWith(phrase.toLowerCase())
  );

  const result = (isVeryLong && (hasIncompleteIndicators || endsAbruptly || hasUnfinishedCode || hasIncompleteTable)) || 
         endsWithIncompletePhrase;

  if (result) {
    console.log('🔍 Incomplete response detected:', {
      length: text.length,
      endsAbruptly,
      hasUnfinishedCode,
      hasIncompleteIndicators,
      endsWithIncompletePhrase,
      lastChars: text.slice(-20)
    });
  }

  return result;
}