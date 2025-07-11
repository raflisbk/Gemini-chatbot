// src/utils/index.ts - Fixed utility exports

// Browser compatibility
export {
  browserChecker,
  checkBrowserSupport,
  getSpeechRecognition,
  getMediaRecorder,
  requestMicrophonePermission,
  VoiceInputError,
  useBrowserCapabilities
} from './browserSupport';

// Media recording - FIXED exports
export {
  MediaRecorderHelper,
  createAudioFile,
  blobToBase64,
  downloadRecording
} from './mediaRecorder';

// Error handling
export {
  ErrorHandler,
  useErrorHandler
} from './errorHandler';

// Re-export common utilities
export * from '../lib/utils';

// Types re-exports - FIXED: Import from mediaRecorder since it re-exports from types/media
export type {
  BrowserCapabilities
} from './browserSupport';

export type {
  MediaRecorderSupport,
  RecordingConfig,
  RecordingCallbacks,
  RecordingState
} from './mediaRecorder';

export type {
  AppError,
  ErrorSeverity
} from './errorHandler';