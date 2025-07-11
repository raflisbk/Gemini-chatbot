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
      lastMessage.length > 1000 && !lastMessage.endsWith('!'),
      lastMessage.length > 1000 && !lastMessage.endsWith('?'),
      /\b(akan|sedang|kemudian|selanjutnya|berikutnya|namun|tetapi|dan|atau)\s*$/i.test(lastMessage),
      lastMessage.includes('[melanjutkan]'),
      lastMessage.includes('[continue]'),
      lastMessage.includes('...'),
      // Check if message ends abruptly without proper conclusion
      !lastMessage.match(/[.!?]\s*$/) && lastMessage.length > 500
    ];

    return indicators.some(indicator => indicator);
  }, [lastMessage]);

  // Show hint after component mounts if message is incomplete
  useEffect(() => {
    if (isIncomplete && canContinue) {
      const timer = setTimeout(() => setShowHint(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isIncomplete, canContinue]);

  // FIXED: Handle continue action
  const handleContinue = async () => {
    if (isContinuing || isLoading) return;

    setIsContinuing(true);
    try {
      await onContinue();
    } catch (error) {
      console.error('Continue failed:', error);
    } finally {
      setIsContinuing(false);
    }
  };

  // FIXED: Handle retry action
  const handleRetry = async () => {
    if (isRetrying || isLoading || !onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Copy message to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lastMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Don't show if conditions aren't met
  if (!canContinue && !isIncomplete) return null;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative ${className}`}
      >
        <Card className="border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <MoreHorizontal className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {isIncomplete ? 'Response seems incomplete' : 'Ready to continue'}
                  </span>
                </div>
                {isIncomplete && (
                  <Badge variant="outline" className="h-5 text-xs">
                    Incomplete
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Copy Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 w-7 p-0"
                      disabled={!lastMessage}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {copied ? 'Copied!' : 'Copy message'}
                  </TooltipContent>
                </Tooltip>

                {/* Retry Button */}
                {onRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRetry}
                        disabled={isRetrying || isLoading}
                        className="h-7 w-7 p-0"
                      >
                        {isRetrying ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Retry generation
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* FIXED: Continue Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleContinue}
                      disabled={isContinuing || isLoading}
                      className="h-7 px-3 bg-primary hover:bg-primary/90"
                    >
                      {isContinuing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          <span className="text-xs">Continuing...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-medium">Continue</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Continue the response
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hint Tooltip */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-10"
              onAnimationComplete={() => {
                setTimeout(() => setShowHint(false), 3000);
              }}
            >
              <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs text-muted-foreground whitespace-nowrap">
                Klik "Continue" untuk melengkapi respons
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-border" />
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

// FIXED: Hook untuk mendeteksi apakah pesan perlu dilanjutkan
export function useMessageContinuation(message: string, threshold: number = 800) {
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    if (!message) {
      setCanContinue(false);
      return;
    }

    // Enhanced continuation detection
    const shouldContinue = 
      message.length >= threshold ||
      message.endsWith('...') ||
      message.endsWith('..') ||
      message.endsWith(' -') ||
      /\b(akan|sedang|kemudian|selanjutnya|berikutnya|namun|tetapi|dan|atau)\s*$/i.test(message) ||
      message.includes('[melanjutkan]') ||
      message.includes('[continue]') ||
      message.includes('...') ||
      // Check if message doesn't end with proper punctuation and is long enough
      (!message.match(/[.!?]\s*$/) && message.length > 500) ||
      // Check if message ends with incomplete sentence structures
      /\b(yang|untuk|dengan|dalam|pada|dari|ke|di|oleh|tentang|karena|jika|ketika)\s*$/i.test(message);

    setCanContinue(shouldContinue);
  }, [message, threshold]);

  return canContinue;
}

// FIXED: Komponen wrapper untuk ChatMessage
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
  
  // FIXED: Only show continue button for assistant messages that are last and seem incomplete
  const showContinueButton = 
    isLastMessage && 
    message.role === 'assistant' && 
    (canContinue || message.content.length > 800) && 
    onContinue &&
    !isLoading;

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