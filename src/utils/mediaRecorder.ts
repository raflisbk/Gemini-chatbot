// src/utils/mediaRecorder.ts

export interface MediaRecorderSupport {
  isSupported: boolean;
  supportedMimeTypes: string[];
  error?: string;
}

export interface RecordingConfig {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

export interface RecordingCallbacks {
  onDataAvailable?: (event: BlobEvent) => void;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (event: Event) => void;
}

export type RecordingState = 'inactive' | 'recording' | 'paused';

export class MediaRecorderHelper {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];

  constructor(
    private config: RecordingConfig = {},
    private callbacks: RecordingCallbacks = {}
  ) {}

  public static checkSupport(): MediaRecorderSupport {
    if (!('MediaRecorder' in window)) {
      return {
        isSupported: false,
        supportedMimeTypes: [],
        error: 'MediaRecorder API not supported in this browser'
      };
    }

    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];

    const supportedMimeTypes = mimeTypes.filter(type => 
      MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)
    );

    return {
      isSupported: true,
      supportedMimeTypes,
      error: supportedMimeTypes.length === 0 ? 'No supported MIME types found' : undefined
    };
  }

  public async requestPermission(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      return true;
    } catch (error) {
      console.error('Permission denied:', error);
      return false;
    }
  }

  public async startRecording(): Promise<boolean> {
    try {
      if (!this.stream) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
          throw new Error('Microphone permission denied');
        }
      }

      if (!this.stream) {
        throw new Error('No media stream available');
      }

      // Get best supported MIME type
      const support = MediaRecorderHelper.checkSupport();
      if (!support.isSupported || support.supportedMimeTypes.length === 0) {
        throw new Error('MediaRecorder not supported');
      }

      const mimeType = this.config.mimeType || support.supportedMimeTypes[0];

      // Create MediaRecorder with proper typing
      const MediaRecorderConstructor = window.MediaRecorder as typeof MediaRecorder;
      this.mediaRecorder = new MediaRecorderConstructor(this.stream, {
        mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond,
        videoBitsPerSecond: this.config.videoBitsPerSecond,
        bitsPerSecond: this.config.bitsPerSecond
      });

      // Setup event listeners
      this.setupEventListeners();

      // Clear previous recordings
      this.recordedChunks = [];

      // Start recording
      this.mediaRecorder.start();
      
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    this.mediaRecorder.stop();
    
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Return recorded blob
    if (this.recordedChunks.length > 0) {
      return new Blob(this.recordedChunks, { 
        type: this.mediaRecorder.mimeType || 'audio/wav' 
      });
    }

    return null;
  }

  public pauseRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return false;
    }

    this.mediaRecorder.pause();
    return true;
  }

  public resumeRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') {
      return false;
    }

    this.mediaRecorder.resume();
    return true;
  }

  public getState(): RecordingState {
    if (!this.mediaRecorder) {
      return 'inactive';
    }
    return this.mediaRecorder.state as RecordingState;
  }

  public cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.recordedChunks = [];
  }

  private setupEventListeners(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
      this.callbacks.onDataAvailable?.(event);
    };

    this.mediaRecorder.onstart = () => {
      this.callbacks.onStart?.();
    };

    this.mediaRecorder.onstop = () => {
      this.callbacks.onStop?.();
    };

    this.mediaRecorder.onpause = () => {
      this.callbacks.onPause?.();
    };

    this.mediaRecorder.onresume = () => {
      this.callbacks.onResume?.();
    };

    this.mediaRecorder.onerror = (event: Event) => {
      console.error('MediaRecorder error:', event);
      this.callbacks.onError?.(event);
    };
  }
}

// Utility functions
export const createAudioFile = (blob: Blob, filename?: string): File => {
  const name = filename || `recording-${Date.now()}.wav`;
  return new File([blob], name, { type: blob.type });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const downloadRecording = (blob: Blob, filename?: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `recording-${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};