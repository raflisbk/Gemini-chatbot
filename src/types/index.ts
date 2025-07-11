// src/types/index.ts
// Simple re-export tanpa complex imports

// Export types yang sudah ada di utils
export type {
  RecordingState,
  MediaRecorderSupport,
  RecordingConfig,
  RecordingCallbacks
} from '../utils/mediaRecorder';

// Export types dari browserSupport
export type {
  BrowserCapabilities
} from '../utils/browserSupport';