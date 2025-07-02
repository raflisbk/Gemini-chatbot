import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Brain, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedTypingIndicatorProps {
  isVisible?: boolean;
  variant?: 'default' | 'thinking' | 'processing' | 'generating';
  message?: string;
  avatar?: React.ReactNode;
  className?: string;
}

const typingMessages = {
  default: [
    'AI sedang mengetik...',
    'Memproses permintaan Anda...',
    'Mencari informasi terbaik...'
  ],
  thinking: [
    'AI sedang berpikir...',
    'Menganalisis pertanyaan Anda...',
    'Mempertimbangkan berbagai sudut pandang...'
  ],
  processing: [
    'Memproses data...',
    'Menganalisis informasi...',
    'Menyiapkan respons...'
  ],
  generating: [
    'Menghasilkan respons...',
    'Menyusun jawaban terbaik...',
    'Menyelesaikan pemikiran...'
  ]
};

const iconMap = {
  default: Bot,
  thinking: Brain,
  processing: Zap,
  generating: MessageCircle
};

export function AdvancedTypingIndicator({
  isVisible = false,
  variant = 'default',
  message,
  avatar,
  className
}: AdvancedTypingIndicatorProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayMessage, setDisplayMessage] = useState('');

  const messages = typingMessages[variant];
  const IconComponent = iconMap[variant];

  // Cycle through messages
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible, messages.length]);

  // Update display message
  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
    } else {
      setDisplayMessage(messages[currentMessageIndex]);
    }
  }, [message, messages, currentMessageIndex]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ 
            duration: 0.3, 
            ease: [0.23, 1, 0.32, 1]
          }}
          className={cn(
            'flex items-start gap-3 p-4 max-w-4xl mx-auto',
            className
          )}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatar || (
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg"
              >
                <IconComponent className="h-4 w-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              className="bg-muted/70 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 border border-border/50"
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                {/* Typing Message */}
                <motion.span
                  key={displayMessage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-muted-foreground"
                >
                  {displayMessage}
                </motion.span>

                {/* Animated Dots */}
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                      animate={{
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <motion.div
                className="mt-2 h-1 bg-muted rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-2 flex items-center gap-2 text-xs text-muted-foreground px-1"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full"
              />
              <span>Powered by Gemini AI</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Enhanced Typing Dots Component
export function TypingDots({ 
  className,
  size = 'default',
  color = 'emerald'
}: {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  color?: 'emerald' | 'blue' | 'purple' | 'gray';
}) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    default: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };

  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  };

  return (
    <div className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            'rounded-full',
            sizeClasses[size],
            colorClasses[color]
          )}
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}