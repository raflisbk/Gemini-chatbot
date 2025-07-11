// src/types/media.d.ts
// Simple and compatible MediaRecorder types

// Define interfaces tanpa conflict dengan global types
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

export type RecordingState = 'inactive' | 'recording' | 'paused';