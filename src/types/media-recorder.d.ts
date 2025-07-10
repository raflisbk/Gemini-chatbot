// src/types/media-recorder.d.ts
// TypeScript definitions untuk MediaRecorder API yang benar

declare global {
  interface Window {
    MediaRecorder: typeof MediaRecorder;
  }
}

// Custom MediaRecorder Error Event interface
interface MediaRecorderErrorEvent extends Event {
  error: DOMException;
}

// MediaRecorder Options interface yang tepat
interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

// MediaRecorder State enum
declare enum RecordingState {
  inactive = "inactive",
  recording = "recording", 
  paused = "paused"
}

// Extended MediaRecorder interface
interface MediaRecorderConstructor {
  new(stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
  isTypeSupported(mimeType: string): boolean;
}

// MediaRecorder dengan event handlers yang benar
interface MediaRecorder extends EventTarget {
  readonly stream: MediaStream;
  readonly state: RecordingState;
  readonly mimeType: string;
  
  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  
  requestData(): void;
  
  ondataavailable: ((event: BlobEvent) => void) | null;
  onerror: ((event: MediaRecorderErrorEvent) => void) | null;
  onpause: ((event: Event) => void) | null;
  onresume: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
  onstop: ((event: Event) => void) | null;
  
  addEventListener(type: 'dataavailable', listener: (event: BlobEvent) => void): void;
  addEventListener(type: 'error', listener: (event: MediaRecorderErrorEvent) => void): void;
  addEventListener(type: 'pause' | 'resume' | 'start' | 'stop', listener: (event: Event) => void): void;
  
  removeEventListener(type: string, listener: EventListener): void;
}

declare var MediaRecorder: MediaRecorderConstructor;

export { MediaRecorderErrorEvent, MediaRecorderOptions, RecordingState };