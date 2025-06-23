import { NextRequest, NextResponse } from 'next/server';
// Update the import path if '@/lib/gemini' does not exist.
// For example, if the file is at 'src/lib/gemini.ts', use the following:
import { generateResponse } from '../../lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await generateResponse(message);

    return NextResponse.json({
      success: true,
      message: response,
    });

  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}