import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useVoiceInput, useTextToSpeech } from '@/hooks/useVoiceInput';

interface VoiceInputProps {
  onTranscriptChange?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  isEnabled?: boolean;
  language?: string;
  continuous?: boolean;
}

export function VoiceInput({
  onTranscriptChange,
  onFinalTranscript,
  onError,
  isEnabled = true,
  language = 'id-ID',
  continuous = false
}: VoiceInputProps) {
  const {
    isSupported,
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    resetError
  } = useVoiceInput({
    language,
    continuous,
    interimResults: true
  });

  const {
    isSpeaking,
    stop: stopSpeaking,
    speak
  } = useTextToSpeech();

  const [showFeedback, setShowFeedback] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const animationRef = useRef<number>();

  // Handle transcript changes
  useEffect(() => {
    if (transcript && onFinalTranscript) {
      onFinalTranscript(transcript);
    }
  }, [transcript, onFinalTranscript]);

  useEffect(() => {
    if (interimTranscript && onTranscriptChange) {
      onTranscriptChange(interimTranscript);
    }
  }, [interimTranscript, onTranscriptChange]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Audio level simulation for visual feedback
  useEffect(() => {
    if (isListening) {
      setShowFeedback(true);
      
      const animateAudioLevel = () => {
        setAudioLevel(Math.random() * 100);
        animationRef.current = requestAnimationFrame(animateAudioLevel);
      };
      
      animateAudioLevel();
    } else {
      setShowFeedback(false);
      setAudioLevel(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening]);

  const handleToggleListening = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    
    if (error) {
      resetError();
    }
    
    toggleListening();
  };

  if (!isSupported) {
    return (
      <Card className="p-4 border-destructive/50">
        <CardContent className="flex items-center gap-2 p-0">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">
            Speech recognition tidak didukung di browser ini
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Main Voice Button */}
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleToggleListening}
        disabled={!isEnabled}
        className={`relative transition-all duration-200 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'hover:bg-primary hover:text-primary-foreground'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        
        {/* Listening indicator ring */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </Button>

      {/* Voice Status Badge */}
      <AnimatePresence>
        {(isListening || isProcessing || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50"
          >
            <Badge 
              variant={error ? "destructive" : isListening ? "default" : "secondary"}
              className="whitespace-nowrap"
            >
              {error ? (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Memproses...
                </>
              ) : isListening ? (
                <>
                  <Mic className="h-3 w-3 mr-1" />
                  Mendengarkan...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Selesai
                </>
              )}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Feedback Overlay */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => !continuous && stopListening()}
          >
            <Card className="p-8 max-w-md mx-4">
              <CardContent className="text-center space-y-6">
                {/* Main Microphone Visual */}
                <div className="relative">
                  <motion.div
                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center"
                    animate={{
                      scale: isProcessing ? [1, 1.1, 1] : 1
                    }}
                    transition={{
                      duration: 1,
                      repeat: isProcessing ? Infinity : 0
                    }}
                  >
                    <Mic className="h-12 w-12 text-white" />
                  </motion.div>

                  {/* Audio Level Rings */}
                  {isListening && (
                    <div className="absolute inset-0">
                      {[1, 2, 3].map((ring) => (
                        <motion.div
                          key={ring}
                          className="absolute inset-0 rounded-full border-2 border-red-400/30"
                          animate={{
                            scale: [1, 1.5 + ring * 0.3],
                            opacity: [0.7, 0]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: ring * 0.3,
                            ease: "easeOut"
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Text */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {isProcessing ? 'Memproses Suara...' : 'AI Sedang Mendengarkan'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isProcessing 
                      ? 'Mengkonversi suara menjadi teks'
                      : continuous 
                        ? 'Bicara dengan jelas. Klik tombol untuk berhenti.'
                        : 'Bicara dengan jelas. Akan berhenti otomatis.'
                    }
                  </p>
                </div>

                {/* Audio Level Bars */}
                {isListening && (
                  <div className="flex justify-center space-x-1">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-red-500 rounded-full"
                        animate={{
                          height: [4, Math.random() * 20 + 4, 4]
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Transcript Preview */}
                {(transcript || interimTranscript) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-muted rounded-lg text-sm"
                  >
                    <span className="text-foreground">{transcript}</span>
                    <span className="text-muted-foreground italic">
                      {interimTranscript}
                    </span>
                  </motion.div>
                )}

                {/* Confidence Score */}
                {confidence > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>Akurasi:</span>
                    <Badge variant="outline">
                      {Math.round(confidence * 100)}%
                    </Badge>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  </motion.div>
                )}

                {/* Controls */}
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopListening}
                  >
                    <MicOff className="h-4 w-4 mr-1" />
                    Berhenti
                  </Button>
                  
                  {transcript && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearTranscript}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Komponen untuk Text-to-Speech
interface SpeechButtonProps {
  text: string;
  disabled?: boolean;
  className?: string;
}

export function SpeechButton({ text, disabled, className }: SpeechButtonProps) {
  const { isSpeaking, speak, stop } = useTextToSpeech();

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleSpeech}
      disabled={disabled || !text}
      className={className}
    >
      {isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}