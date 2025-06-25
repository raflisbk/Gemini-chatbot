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

// Default settings (fallback)
const defaultSettings: ModelSettings = {
  temperature: 1.5,
  maxTokens: 2048,
  topP: 1,
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

// Create model with dynamic settings
const createModelWithSettings = (settings: ModelSettings) => {
  console.log('🤖 Creating Gemini model with settings:', {
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    topP: settings.topP,
    topK: settings.topK,
    promptLength: settings.systemPrompt.length
  });

  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topK,
      maxOutputTokens: settings.maxTokens,
    },
    systemInstruction: settings.systemPrompt
  });
};

export async function generateResponse(prompt: string): Promise<string> {
  try {
    // Get current settings dynamically from AuthContext storage
    const settings = getCurrentSettings();
    
    // Create model with current settings
    const model = createModelWithSettings(settings);
    
    console.log('🚀 Generating response with prompt length:', prompt.length);
    
    // Generate response with the configured model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response generated successfully, length:', text.length);
    return text;
  } catch (error) {
    console.error('💥 Error generating response:', error);
    throw new Error('Failed to generate response from Gemini AI');
  }
}

// Export for direct access if needed (uses default settings)
export const geminiModel = createModelWithSettings(defaultSettings);

// Utility function to test model settings (for debugging)
export const testModelSettings = async (testPrompt: string = "Hello, how are you?"): Promise<void> => {
  try {
    console.log('🧪 Testing current model settings...');
    const settings = getCurrentSettings();
    console.log('📊 Current settings:', settings);
    
    const response = await generateResponse(testPrompt);
    console.log('📝 Test response:', response.substring(0, 100) + '...');
    console.log('✅ Model settings test completed successfully');
  } catch (error) {
    console.error('❌ Model settings test failed:', error);
  }
};

// Get current model settings (for components that need to read settings)
export const getModelSettings = (): ModelSettings => {
  return getCurrentSettings();
};

// Validate settings before applying
export const validateModelSettings = (settings: Partial<ModelSettings>): boolean => {
  try {
    if (settings.temperature !== undefined && (settings.temperature < 0 || settings.temperature > 2)) {
      console.warn('⚠️ Temperature must be between 0 and 2');
      return false;
    }
    
    if (settings.maxTokens !== undefined && (settings.maxTokens < 1 || settings.maxTokens > 4096)) {
      console.warn('⚠️ Max tokens must be between 1 and 4096');
      return false;
    }
    
    if (settings.topP !== undefined && (settings.topP < 0 || settings.topP > 1)) {
      console.warn('⚠️ Top P must be between 0 and 1');
      return false;
    }
    
    if (settings.topK !== undefined && (settings.topK < 1 || settings.topK > 100)) {
      console.warn('⚠️ Top K must be between 1 and 100');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to validate settings:', error);
    return false;
  }
};