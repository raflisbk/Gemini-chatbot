import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  MoreHorizontal, 
  Loader2,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ContinueButtonProps {
  onContinue: () => Promise<void>;
  onRetry?: () => Promise<void>;
  isLoading?: boolean;
  canContinue?: boolean;
  lastMessage?: string;
  className?: string;
}

export function ContinueButton({
  onContinue,
  onRetry,
  isLoading = false,
  canContinue = false,
  lastMessage = '',
  className = ''
}: ContinueButtonProps) {
  const [isContinuing, setIsContinuing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Check if message seems incomplete
  const isIncomplete = useMemo(() => {
    if (!lastMessage) return false;
    
    const indicators = [
      lastMessage.endsWith('...'),
      lastMessage.endsWith('..'),
      lastMessage.endsWith(' -'),
      lastMessage.length > 1000 && !lastMessage.endsWith('.'),
      lastMessage.includes('['),
      lastMessage.includes('Lanjut'),
      lastMessage.includes('continue'),
      /\b(akan|sedang|kemudian|selanjutnya|berikutnya)\s*$/i.test(lastMessage)
    ];
    
    return indicators.some(Boolean);
  }, [lastMessage]);

  useEffect(() => {
    if (isIncomplete && canContinue) {
      const timer = setTimeout(() => setShowHint(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isIncomplete, canContinue]);

  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      await onContinue();
    } catch (error) {
      console.error('Failed to continue:', error);
    } finally {
      setIsContinuing(false);
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Failed to retry:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lastMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!canContinue && !isIncomplete) {
    return null;
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={`relative ${className}`}
      >
        {/* Main Continue Button */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {isIncomplete ? 'Respons terputus' : 'Respons siap dilanjutkan'}
                  </span>
                </div>
                
                {isIncomplete && (
                  <Badge variant="secondary" className="text-xs">
                    Tidak lengkap
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Copy Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className="h-8 w-8"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {copied ? 'Disalin!' : 'Salin respons'}
                  </TooltipContent>
                </Tooltip>

                {/* Retry Button */}
                {onRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRetry}
                        disabled={isRetrying || isLoading}
                        className="h-8 w-8"
                      >
                        {isRetrying ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Coba lagi
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  disabled={isContinuing || isLoading}
                  size="sm"
                  className="gap-2"
                >
                  {isContinuing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Melanjutkan...
                    </>
                  ) : (
                    <>
                      Lanjutkan
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Indicator */}
            {(isContinuing || isLoading) && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
                className="mt-3 h-1 bg-primary rounded-full"
              />
            )}
          </CardContent>
        </Card>

        {/* Hint Animation */}
        <AnimatePresence>
          {showHint && !isContinuing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-12 left-1/2 transform -translate-x-1/2"
            >
              <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs text-muted-foreground whitespace-nowrap">
                Klik "Lanjutkan" untuk melengkapi respons
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Dots Indicator */}
        {isIncomplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -right-2 -top-2"
          >
            <div className="flex space-x-1">
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: dot * 0.2
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}

// Hook untuk mendeteksi apakah pesan perlu dilanjutkan
export function useMessageContinuation(message: string, threshold: number = 1000) {
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    if (!message) {
      setCanContinue(false);
      return;
    }

    const shouldContinue = 
      message.length >= threshold ||
      message.endsWith('...') ||
      message.endsWith('..') ||
      /\b(akan|sedang|kemudian|selanjutnya|berikutnya)\s*$/i.test(message) ||
      message.includes('[melanjutkan]') ||
      message.includes('[continue]');

    setCanContinue(shouldContinue);
  }, [message, threshold]);

  return canContinue;
}

// Komponen wrapper untuk ChatMessage
interface MessageWithContinueProps {
  message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  };
  isLastMessage?: boolean;
  onContinue?: () => Promise<void>;
  onRetry?: () => Promise<void>;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function MessageWithContinue({
  message,
  isLastMessage = false,
  onContinue,
  onRetry,
  isLoading = false,
  children
}: MessageWithContinueProps) {
  const canContinue = useMessageContinuation(message.content);
  const showContinueButton = 
    isLastMessage && 
    message.role === 'assistant' && 
    canContinue && 
    onContinue;

  return (
    <div className="space-y-3">
      {children}
      
      {showContinueButton && (
        <ContinueButton
          onContinue={onContinue}
          onRetry={onRetry}
          isLoading={isLoading}
          canContinue={canContinue}
          lastMessage={message.content}
          className="ml-12" // Align with message content
        />
      )}
    </div>
  );
}