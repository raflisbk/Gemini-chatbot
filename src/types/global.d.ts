// src/types/global.d.ts

// MediaRecorder API Types
interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

interface MediaRecorderErrorEvent extends Event {
  error: DOMException;
}

interface BlobEvent extends Event {
  data: Blob;
  timecode?: number;
}

declare global {
  interface Window {
    MediaRecorder: {
      new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
      isTypeSupported(mimeType: string): boolean;
    };
  }

  interface MediaRecorder extends EventTarget {
    readonly mimeType: string;
    readonly state: 'inactive' | 'recording' | 'paused';
    readonly stream: MediaStream;
    
    ondataavailable: ((event: BlobEvent) => void) | null;
    onerror: ((event: MediaRecorderErrorEvent) => void) | null;
    onpause: ((event: Event) => void) | null;
    onresume: ((event: Event) => void) | null;
    onstart: ((event: Event) => void) | null;
    onstop: ((event: Event) => void) | null;
    
    pause(): void;
    resume(): void;
    start(timeslice?: number): void;
    stop(): void;
    
    addEventListener<K extends keyof MediaRecorderEventMap>(
      type: K,
      listener: (this: MediaRecorder, ev: MediaRecorderEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof MediaRecorderEventMap>(
      type: K,
      listener: (this: MediaRecorder, ev: MediaRecorderEventMap[K]) => any,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface MediaRecorderEventMap {
    dataavailable: BlobEvent;
    error: MediaRecorderErrorEvent;
    pause: Event;
    resume: Event;
    start: Event;
    stop: Event;
  }

  // Speech Recognition (sudah ada tapi untuk memastikan)
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: SpeechGrammarList;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    serviceURI: string;
    
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    
    abort(): void;
    start(): void;
    stop(): void;
  }

  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export {};