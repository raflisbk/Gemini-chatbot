// src/types/media.ts
// Simple and compatible MediaRecorder types

export type RecordingState = 'inactive' | 'recording' | 'paused';

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
  onDataAvailable?: (event: any) => void;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (event: Event) => void;
}

// Simple MediaRecorder options
export interface SimpleMediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

// Simple event interfaces untuk compatibility
export interface SimpleBlobEvent extends Event {
  data: Blob;
  timecode?: number;
}

export interface SimpleMediaRecorderErrorEvent extends Event {
  error: DOMException;
}