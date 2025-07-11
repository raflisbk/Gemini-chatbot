// src/utils/browserSupport.ts

import React from 'react';

export interface BrowserCapabilities {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  mediaRecorder: boolean;
  microphone: boolean;
  browserName: string;
  browserVersion: string;
  isSupported: boolean;
  warnings: string[];
}

export class BrowserCompatibilityChecker {
  private static instance: BrowserCompatibilityChecker;
  private capabilities: BrowserCapabilities | null = null;

  private constructor() {}

  public static getInstance(): BrowserCompatibilityChecker {
    if (!BrowserCompatibilityChecker.instance) {
      BrowserCompatibilityChecker.instance = new BrowserCompatibilityChecker();
    }
    return BrowserCompatibilityChecker.instance;
  }

  public async checkCapabilities(): Promise<BrowserCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const warnings: string[] = [];
    const browserInfo = this.getBrowserInfo();

    // Check Speech Recognition
    const speechRecognition = this.checkSpeechRecognition();
    if (!speechRecognition && browserInfo.browserName === 'Firefox') {
      warnings.push('Voice input tidak didukung di Firefox. Gunakan Chrome atau Edge.');
    }

    // Check Speech Synthesis
    const speechSynthesis = this.checkSpeechSynthesis();

    // Check MediaRecorder
    const mediaRecorder = this.checkMediaRecorder();
    if (!mediaRecorder) {
      warnings.push('Audio recording tidak didukung di browser ini.');
    }

    // Check Microphone Access
    const microphone = await this.checkMicrophoneAccess();
    if (!microphone) {
      warnings.push('Akses mikrofon diperlukan untuk fitur voice input.');
    }

    // Determine overall support
    const isSupported = speechRecognition && speechSynthesis && microphone;

    this.capabilities = {
      speechRecognition,
      speechSynthesis,
      mediaRecorder,
      microphone,
      browserName: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion,
      isSupported,
      warnings
    };

    return this.capabilities;
  }

  private getBrowserInfo(): { browserName: string; browserVersion: string } {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = '';

    const browserTests = [
      { name: 'Edge', regex: /Edg\/(\d+)/ },
      { name: 'Chrome', regex: /Chrome\/(\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+)/ },
    ];

    for (const browser of browserTests) {
      const match = userAgent.match(browser.regex);
      if (match) {
        browserName = browser.name;
        browserVersion = match[1];
        break;
      }
    }

    // Special case for Safari (must not contain Chrome)
    if (browserName === 'Safari' && userAgent.includes('Chrome')) {
      browserName = 'Chrome';
    }

    return { browserName, browserVersion };
  }

  private checkSpeechRecognition(): boolean {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      return !!SpeechRecognition;
    } catch (error) {
      return false;
    }
  }

  private checkSpeechSynthesis(): boolean {
    try {
      return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    } catch (error) {
      return false;
    }
  }

  private checkMediaRecorder(): boolean {
    try {
      return 'MediaRecorder' in window && typeof window.MediaRecorder === 'function';
    } catch (error) {
      return false;
    }
  }

  private async checkMicrophoneAccess(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Try to access microphone with a timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const micPromise = navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const stream = await Promise.race([micPromise, timeoutPromise]);
      
      // Clean up immediately
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.warn('Microphone access check failed:', error);
      return false;
    }
  }

  public getSpeechRecognition(): any {
    if (!this.checkSpeechRecognition()) {
      throw new Error('Speech Recognition not supported');
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return new SpeechRecognition();
  }

  // FIXED: Simple MediaRecorder getter without complex types
  public getMediaRecorder(stream: MediaStream, options?: any): MediaRecorder {
    if (!this.checkMediaRecorder()) {
      throw new Error('MediaRecorder not supported');
    }
    
    // Use simple approach without complex typing
    return new MediaRecorder(stream, options || {});
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  public getRecommendedBrowser(): string {
    const { browserName } = this.getBrowserInfo();
    
    if (browserName === 'Firefox') {
      return 'Untuk pengalaman terbaik dengan fitur voice, gunakan Chrome atau Edge.';
    }
    
    if (browserName === 'Safari') {
      return 'Fitur voice memiliki keterbatasan di Safari. Chrome atau Edge direkomendasikan.';
    }
    
    return `Browser ${browserName} sudah mendukung semua fitur.`;
  }
}

// Utility functions
export const browserChecker = BrowserCompatibilityChecker.getInstance();

export const checkBrowserSupport = async (): Promise<BrowserCapabilities> => {
  return await browserChecker.checkCapabilities();
};

export const getSpeechRecognition = (): any => {
  return browserChecker.getSpeechRecognition();
};

// FIXED: Simple MediaRecorder getter
export const getMediaRecorder = (stream: MediaStream, options?: any): MediaRecorder => {
  return browserChecker.getMediaRecorder(stream, options);
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  return await browserChecker.requestMicrophonePermission();
};

// Error handling utilities
export class VoiceInputError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VoiceInputError';
  }

  static fromSpeechRecognitionError(error: string): VoiceInputError {
    const errorMessages: Record<string, string> = {
      'no-speech': 'Tidak ada suara yang terdeteksi. Coba bicara lebih jelas.',
      'audio-capture': 'Gagal menangkap audio. Periksa mikrofon Anda.',
      'not-allowed': 'Akses mikrofon ditolak. Silakan berikan izin di pengaturan browser.',
      'network': 'Kesalahan jaringan. Periksa koneksi internet Anda.',
      'service-not-allowed': 'Layanan pengenalan suara tidak diizinkan.',
      'aborted': 'Pengenalan suara dibatalkan.',
      'language-not-supported': 'Bahasa yang dipilih tidak didukung.',
    };

    const message = errorMessages[error] || `Kesalahan pengenalan suara: ${error}`;
    return new VoiceInputError(message, error);
  }
}

// React Hook untuk browser capabilities
export const useBrowserCapabilities = () => {
  const [capabilities, setCapabilities] = React.useState<BrowserCapabilities | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const caps = await checkBrowserSupport();
        setCapabilities(caps);
      } catch (error) {
        console.error('Failed to check browser capabilities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkCapabilities();
  }, []);

  return { capabilities, isLoading };
};