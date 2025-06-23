import { motion } from 'framer-motion';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { Message } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'group flex gap-4 p-6 hover:bg-muted/30 transition-all duration-200',
        isUser ? 'bg-muted/20' : ''
      )}
    >
      {/* Avatar */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm',
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0' 
            : 'bg-gradient-to-br from-emerald-500 to-blue-600 text-white border-0'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </motion.div>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isUser ? 'You' : 'AI Chatbot'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
          
          {/* Message Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 w-6 p-0"
              title={copied ? 'Copied!' : 'Copy message'}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Copy className="h-3 w-3" />
              </motion.div>
            </Button>
            
            {!isUser && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Good response"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Poor response"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Regenerate response"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Message Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="prose prose-sm max-w-none dark:prose-invert"
        >
          <p className="whitespace-pre-wrap break-words text-foreground leading-relaxed">
            {message.content}
          </p>
        </motion.div>

        {/* Copy Feedback */}
        {copied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-xs text-green-600 font-medium"
          >
            ✓ Copied to clipboard
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}