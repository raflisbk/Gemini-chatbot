// src/utils/types.ts
// Fallback types untuk MediaRecorder jika types/media tidak bisa di-import

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

export interface CustomMediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

export interface CustomBlobEvent extends Event {
  data: Blob;
  timecode?: number;
}

export interface CustomMediaRecorderErrorEvent extends Event {
  error: DOMException;
}