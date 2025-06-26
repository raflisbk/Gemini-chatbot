// src/lib/gemini.ts - Enhanced version with full multimodal support

import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  systemPrompt: string;
}

interface FileAttachment {
  type: 'image' | 'document' | 'audio' | 'video' | 'other';
  mimeType: string;
  fileName: string;
  fileSize: number;
  base64: string;
}

// Default settings (keeping existing values)
const defaultSettings: ModelSettings = {
  temperature: 1.5,
  maxTokens: 4096,
  topP: 0.95,
  topK: 40,
  systemPrompt: 'You are a helpful AI assistant focused on Indonesian topics and trending discussions. Always respond in a friendly and informative manner.'
};

// Get current settings from localStorage with AuthContext integration
const getCurrentSettings = (): ModelSettings => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }
  
  try {
    const saved = localStorage.getItem('ai-chatbot-model-settings');
    if (saved) {
      const parsedSettings = JSON.parse(saved);
      return { ...defaultSettings, ...parsedSettings };
    }
  } catch (error) {
    console.error('Failed to load model settings:', error);
  }
  
  return defaultSettings;
};

// Create model with dynamic settings (enhanced for multimodal)
const createModelWithSettings = (settings: ModelSettings) => {
  console.log('🤖 Creating Gemini model with settings:', {
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    topP: settings.topP,
    topK: settings.topK,
    promptLength: settings.systemPrompt.length
  });

  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', // Updated to latest model with vision support
    generationConfig: {
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topK,
      maxOutputTokens: settings.maxTokens,
    },
    systemInstruction: settings.systemPrompt
  });
};

// Enhanced generateResponse with full multimodal support
export async function generateResponse(
  prompt: string, 
  attachments: FileAttachment[] = []
): Promise<string> {
  try {
    // Get current settings dynamically from AuthContext storage
    const settings = getCurrentSettings();
    
    // Create model with current settings
    const model = createModelWithSettings(settings);
    
    console.log('🚀 Generating response with prompt length:', prompt.length);
    console.log('📎 Attachments count:', attachments.length);
    
    // Prepare content parts for multimodal input
    const parts: any[] = [];
    
    // Add main prompt
    parts.push({ text: prompt });
    
    // Process attachments
    if (attachments.length > 0) {
      console.log('📁 Processing attachments...');
      
      for (const attachment of attachments) {
        await processAttachment(attachment, parts);
      }
      
      console.log(`✅ Processed ${attachments.length} attachments, total parts: ${parts.length}`);
    }
    
    // Generate content with multimodal input
    const result = await model.generateContent(parts);
    const response = await result.response;
    
    // Check if response was blocked or empty
    if (!response) {
      throw new Error('No response received from Gemini API');
    }

    // Get response text with safety checks
    let text: string;
    try {
      text = response.text();
    } catch (error) {
      console.error('Error extracting text from response:', error);
      // Check if response was blocked for safety reasons
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Response was blocked due to safety filters. The uploaded content may violate content policies.');
        }
        if (candidate.finishReason === 'RECITATION') {
          throw new Error('Response was blocked due to recitation concerns. Please try different content.');
        }
      }
      throw new Error('Failed to extract response text');
    }
    
    // Validate response is not empty
    if (!text || text.trim().length === 0) {
      console.warn('⚠️ Empty response received from Gemini');
      throw new Error('Empty response received from AI model');
    }
    
    console.log('✅ Response generated successfully, length:', text.length);
    return text;
  } catch (error) {
    console.error('💥 Error generating response:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('quota exceeded')) {
        throw new Error('API quota exceeded. Please try again later.');
      }
      if (error.message.includes('safety')) {
        throw new Error('Response blocked by safety filters. Please try different content.');
      }
      if (error.message.includes('recitation')) {
        throw new Error('Response blocked due to content policy. Please try a different approach.');
      }
      if (error.message.includes('Empty response')) {
        throw new Error('AI model returned empty response. Please try again.');
      }
      throw error; // Re-throw the original error with its message
    }
    
    throw new Error('Failed to generate response from Gemini AI');
  }
}

// Process individual attachment
async function processAttachment(attachment: FileAttachment, parts: any[]): Promise<void> {
  try {
    console.log(`📄 Processing ${attachment.type}: ${attachment.fileName} (${attachment.mimeType})`);
    
    switch (attachment.type) {
      case 'image':
        await processImageAttachment(attachment, parts);
        break;
      case 'document':
        await processDocumentAttachment(attachment, parts);
        break;
      case 'audio':
        await processAudioAttachment(attachment, parts);
        break;
      case 'video':
        await processVideoAttachment(attachment, parts);
        break;
      default:
        await processOtherAttachment(attachment, parts);
        break;
    }
  } catch (error) {
    console.error(`❌ Error processing ${attachment.fileName}:`, error);
    // Add error message to parts instead of failing completely
    parts.push({
      text: `\n\n[Error processing file "${attachment.fileName}": ${error instanceof Error ? error.message : 'Unknown error'}]\n`
    });
  }
}

// Process image attachments
async function processImageAttachment(attachment: FileAttachment, parts: any[]): Promise<void> {
  console.log(`🖼️ Adding image: ${attachment.fileName}`);
  
  // Validate image format
  const supportedImageTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
    'image/webp', 'image/bmp', 'image/svg+xml'
  ];
  
  if (!supportedImageTypes.includes(attachment.mimeType.toLowerCase())) {
    throw new Error(`Unsupported image format: ${attachment.mimeType}`);
  }
  
  parts.push({
    inlineData: {
      mimeType: attachment.mimeType,
      data: attachment.base64
    }
  });
  
  // Add context about the image
  parts.push({
    text: `\n[Image uploaded: ${attachment.fileName} (${formatFileSize(attachment.fileSize)}). Please analyze and describe what you see in this image.]\n`
  });
}

// Process document attachments
async function processDocumentAttachment(attachment: FileAttachment, parts: any[]): Promise<void> {
  console.log(`📄 Processing document: ${attachment.fileName}`);
  
  const textTypes = [
    'text/plain', 'text/csv', 'application/json', 'text/markdown', 
    'text/html', 'text/xml', 'application/rtf'
  ];
  
  if (textTypes.includes(attachment.mimeType.toLowerCase())) {
    try {
      // Decode base64 text content
      const textContent = atob(attachment.base64);
      
      // Limit content length to prevent token overflow
      const maxLength = 10000; // Adjust based on your needs
      const truncatedContent = textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '\n...[Content truncated due to length]'
        : textContent;
      
      parts.push({
        text: `\n\n[Document: ${attachment.fileName}]\n${truncatedContent}\n[End of document]\n\nPlease analyze the content of this document and provide insights or answer any questions about it.`
      });
    } catch (error) {
      throw new Error(`Failed to decode text document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (attachment.mimeType === 'application/pdf') {
    // For PDFs, we can't process them directly with current setup
    parts.push({
      text: `\n[PDF Document uploaded: ${attachment.fileName} (${formatFileSize(attachment.fileSize)}). Note: PDF content extraction is not currently supported. Please convert to text format or describe what you'd like me to help you with regarding this document.]\n`
    });
  } else {
    // Other document types
    parts.push({
      text: `\n[Document uploaded: ${attachment.fileName} (${attachment.mimeType}, ${formatFileSize(attachment.fileSize)}). This document format is not directly readable. Please describe what you'd like me to help you with regarding this document.]\n`
    });
  }
}

// Process audio attachments
async function processAudioAttachment(attachment: FileAttachment, parts: any[]): Promise<void> {
  console.log(`🎵 Processing audio: ${attachment.fileName}`);
  
  const supportedAudioTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
    'audio/m4a', 'audio/aac', 'audio/webm'
  ];
  
  if (supportedAudioTypes.includes(attachment.mimeType.toLowerCase())) {
    // For now, Gemini 2.0 supports audio input
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.base64
      }
    });
    
    parts.push({
      text: `\n[Audio file uploaded: ${attachment.fileName} (${formatFileSize(attachment.fileSize)}). Please analyze the audio content, transcribe if it contains speech, or describe what you hear.]\n`
    });
  } else {
    parts.push({
      text: `\n[Audio file uploaded: ${attachment.fileName} (${attachment.mimeType}, ${formatFileSize(attachment.fileSize)}). This audio format may not be supported for direct analysis. Please describe what you'd like me to help you with regarding this audio file.]\n`
    });
  }
}

// Process video attachments
async function processVideoAttachment(attachment: FileAttachment, parts: any[]): Promise<void> {
  console.log(`🎥 Processing video: ${attachment.fileName}`);
  
  const supportedVideoTypes = [
    'video/mp4', 'video/avi', 'video/mov', 'video/webm', 
    'video/mkv', 'video/quicktime'
  ];
  
  if (supportedVideoTypes.includes(attachment.mimeType.toLowerCase())) {
    // Gemini 2.0 supports video input
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.base64
      }
    });
    
    parts.push({
      text: `\n[Video file uploaded: ${attachment.fileName} (${formatFileSize(attachment.fileSize)}). Please analyze the video content, describe what you see, transcribe any speech, and provide insights about the video.]\n`
    });
  } else {
    parts.push({
      text: `\n[Video file uploaded: ${attachment.fileName} (${attachment.mimeType}, ${formatFileSize(attachment.fileSize)}). This video format may not be supported for direct analysis. Please describe what you'd like me to help you with regarding this video file.]\n`
    });
  }
}

// Process other file types
async function processOtherAttachment(attachment: FileAttachment, parts: any[]): Promise<void> {
  console.log(`📋 Processing other file: ${attachment.fileName}`);
  
  parts.push({
    text: `\n[File uploaded: ${attachment.fileName} (${attachment.mimeType}, ${formatFileSize(attachment.fileSize)}). This file type is not directly supported for content analysis. Please describe what you'd like me to help you with regarding this file.]\n`
  });
}

// Utility function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for direct access if needed (uses default settings)
export const geminiModel = createModelWithSettings(defaultSettings);

// Utility function to test model settings (for debugging)
export const testModelSettings = async (testPrompt: string = "Hello, how are you?", testAttachments: FileAttachment[] = []): Promise<string> => {
  return generateResponse(testPrompt, testAttachments);
};

// Test vision capabilities
export const testVisionCapabilities = async (): Promise<boolean> => {
  try {
    const settings = getCurrentSettings();
    const model = createModelWithSettings(settings);
    
    const result = await model.generateContent([
      { text: "Can you analyze images and understand multimodal content?" }
    ]);
    
    const response = await result.response;
    return !!response.text();
  } catch (error) {
    console.error('Vision test failed:', error);
    return false;
  }
};