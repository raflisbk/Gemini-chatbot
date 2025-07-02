// src/hooks/useVoiceInput.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceInputConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface VoiceInputState {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error: string | null;
}

interface VoiceInputActions {
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  resetError: () => void;
}

type VoiceInputHook = VoiceInputState & VoiceInputActions;

export function useVoiceInput(config: VoiceInputConfig = {}): VoiceInputHook {
  const {
    language = 'id-ID',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1
  } = config;

  const [state, setState] = useState<VoiceInputState>({
    isSupported: false,
    isListening: false,
    isProcessing: false,
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    error: null
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Speech recognition not supported in this browser'
      }));
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    // Event handlers
    recognition.onstart = () => {
      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        isProcessing: false,
        error: null 
      }));
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: prev.transcript + finalTranscript,
        interimTranscript,
        confidence: maxConfidence,
        isProcessing: false
      }));

      // Auto-stop after receiving final result (if not continuous)
      if (!continuous && finalTranscript) {
        recognition.stop();
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech service not allowed. Please try again.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition aborted.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      setState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: errorMessage
      }));
    };

    recognition.onend = () => {
      setState(prev => ({ 
        ...prev, 
        isListening: false,
        isProcessing: false,
        interimTranscript: ''
      }));
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    recognition.onspeechstart = () => {
      setState(prev => ({ ...prev, isProcessing: true }));
    };

    recognition.onspeechend = () => {
      setState(prev => ({ ...prev, isProcessing: false }));
    };

    recognitionRef.current = recognition;
    setState(prev => ({ ...prev, isSupported: true }));

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, interimResults, maxAlternatives]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || state.isListening) return;

    try {
      setState(prev => ({ ...prev, error: null, transcript: '', interimTranscript: '' }));
      recognitionRef.current.start();
      
      // Set timeout to auto-stop (for non-continuous mode)
      if (!continuous) {
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && state.isListening) {
            recognitionRef.current.stop();
          }
        }, 10000); // 10 seconds timeout
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start speech recognition' 
      }));
    }
  }, [state.isListening, continuous]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !state.isListening) return;

    try {
      recognitionRef.current.stop();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to stop speech recognition' 
      }));
    }
  }, [state.isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      transcript: '', 
      interimTranscript: '',
      confidence: 0
    }));
  }, []);

  // Reset error
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    resetError
  };
}

// Text-to-Speech Hook
interface SpeechConfig {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

interface SpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}

interface SpeechActions {
  speak: (text: string, config?: SpeechConfig) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

type SpeechHook = SpeechState & SpeechActions;

export function useTextToSpeech(): SpeechHook {
  const [state, setState] = useState<SpeechState>({
    isSupported: 'speechSynthesis' in window,
    isSpeaking: false,
    voices: [],
    selectedVoice: null
  });

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    if (!state.isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const indonesianVoices = voices.filter(voice => 
        voice.lang.startsWith('id') || voice.lang.startsWith('ms')
      );
      
      setState(prev => ({
        ...prev,
        voices,
        selectedVoice: indonesianVoices[0] || voices[0] || null
      }));
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [state.isSupported]);

  // Speak text
  const speak = useCallback((text: string, config: SpeechConfig = {}) => {
    if (!state.isSupported || !text.trim()) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure utterance
    utterance.voice = config.voice || state.selectedVoice;
    utterance.rate = config.rate || 0.9;
    utterance.pitch = config.pitch || 1;
    utterance.volume = config.volume || 1;
    utterance.lang = config.lang || 'id-ID';

    // Event handlers
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true }));
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setState(prev => ({ ...prev, isSpeaking: false }));
      currentUtteranceRef.current = null;
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [state.isSupported, state.selectedVoice]);

  // Stop speaking
  const stop = useCallback(() => {
    if (!state.isSupported) return;
    
    window.speechSynthesis.cancel();
    setState(prev => ({ ...prev, isSpeaking: false }));
    currentUtteranceRef.current = null;
  }, [state.isSupported]);

  // Pause speaking
  const pause = useCallback(() => {
    if (!state.isSupported) return;
    window.speechSynthesis.pause();
  }, [state.isSupported]);

  // Resume speaking
  const resume = useCallback(() => {
    if (!state.isSupported) return;
    window.speechSynthesis.resume();
  }, [state.isSupported]);

  // Set voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setState(prev => ({ ...prev, selectedVoice: voice }));
  }, []);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    setVoice
  };
}