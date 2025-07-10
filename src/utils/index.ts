// src/utils/index.ts - Main utility exports

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

// Media recording
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

// Types re-exports from correct sources
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

export type {
  AppearanceSettings
} from '../types/appearanceSettings';