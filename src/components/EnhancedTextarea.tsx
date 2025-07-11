'use client';

import React, { forwardRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Type, Hash } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useEnhancedInput } from '@/hooks/useEnhancedInput';

interface EnhancedTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  className?: string;
  showCharacterCount?: boolean;
  showSendButton?: boolean;
  autoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({
    value: externalValue,
    onChange,
    onSend,
    placeholder = "Type your message...",
    disabled = false,
    isLoading = false,
    maxLength = 4000,
    className,
    showCharacterCount = true,
    showSendButton = true,
    autoResize = true,
    minHeight = 60,
    maxHeight = 120,
  }, ref) => {
    const {
      value,
      setValue,
      isComposing,
      isFocused,
      handleChange,
      handleKeyDown,
      handleFocus,
      handleBlur,
      handleCompositionStart,
      handleCompositionEnd,
      clear,
      focus,
      insertText,
      textareaRef,
      characterCount,
      lineCount
    } = useEnhancedInput({
      onSend: (message) => {
        onSend?.(message);
        // FIXED: Always clear after sending, regardless of external control
        clear();
      },
      maxLength,
      disabled,
      autoResize,
      minHeight,
      maxHeight
    });

    // Use external value if provided (controlled component)
    const displayValue = externalValue !== undefined ? externalValue : value;

    // FIXED: Handle external value changes and reset
    useEffect(() => {
      if (externalValue !== undefined) {
        setValue(externalValue);
        // If external value is empty, ensure internal state is also cleared
        if (externalValue === '') {
          clear();
        }
      }
    }, [externalValue, setValue, clear]);

    // Handle external onChange
    const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleChange(e);
      onChange?.(e.target.value);
    };

    const canSend = displayValue.trim().length > 0 && !disabled && !isLoading;
    const isNearLimit = characterCount > maxLength * 0.8;
    const isOverLimit = characterCount > maxLength;

    // FIXED: Handle send with proper clearing
    const handleSendClick = () => {
      if (canSend) {
        const messageToSend = displayValue.trim();
        onSend?.(messageToSend);
        // FIXED: Force clear the input immediately
        if (externalValue === undefined) {
          clear();
        }
        // If controlled by external value, signal parent to clear
        if (onChange) {
          onChange('');
        }
      }
    };

    return (
      <div className="relative">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border bg-background transition-all duration-200",
            isFocused && "ring-2 ring-ring ring-offset-2",
            isOverLimit && "border-destructive",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={handleValueChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              "w-full resize-none border-0 bg-transparent px-3 py-3",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              showSendButton ? "pr-12" : "pr-3"
            )}
            style={{
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
            }}
            rows={1}
          />

          {/* Send Button */}
          {showSendButton && (
            <motion.div
              className="absolute bottom-2 right-2"
              animate={{
                scale: canSend ? 1 : 0.8,
                opacity: canSend ? 1 : 0.5
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Button
                type="button"
                size="icon"
                variant={canSend ? "default" : "ghost"}
                className="h-8 w-8"
                onClick={handleSendClick}
                disabled={!canSend}
                title="Send message (Enter)"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </motion.div>
          )}

          {/* Composition Indicator */}
          {isComposing && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                <Type className="h-2 w-2 mr-1" />
                Composing...
              </Badge>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between mt-1 px-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {lineCount > 1 && (
              <Badge variant="outline" className="text-xs">
                <Hash className="h-2 w-2 mr-1" />
                {lineCount} lines
              </Badge>
            )}
          </div>

          {/* Character Count */}
          {showCharacterCount && (
            <motion.div
              animate={{
                color: isOverLimit ? 'rgb(239 68 68)' : isNearLimit ? 'rgb(245 158 11)' : 'rgb(156 163 175)'
              }}
              className="text-xs font-mono"
            >
              {characterCount}/{maxLength}
            </motion.div>
          )}
        </div>
      </div>
    );
  }
);

EnhancedTextarea.displayName = 'EnhancedTextarea';

export default EnhancedTextarea;