// src/hooks/useEnhancedInput.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseEnhancedInputOptions {
  onSend?: (message: string) => void | Promise<void>;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  autoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

interface UseEnhancedInputReturn {
  value: string;
  setValue: (value: string) => void;
  isComposing: boolean;
  isFocused: boolean;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  handleCompositionStart: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
  handleCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
  clear: () => void;
  focus: () => void;
  insertText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  characterCount: number;
  lineCount: number;
}

export const useEnhancedInput = (options: UseEnhancedInputOptions = {}): UseEnhancedInputReturn => {
  const {
    onSend,
    onFocus,
    onBlur,
    maxLength = 4000,
    disabled = false,
    autoResize = true,
    minHeight = 60,
    maxHeight = 120
  } = options;

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (!autoResize || !textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    textarea.style.height = `${newHeight}px`;
  }, [autoResize, minHeight, maxHeight]);

  // Auto resize when value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Apply max length limit
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    setValue(newValue);
  }, [maxLength]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't handle events during composition (for international keyboards)
    if (isComposing) return;

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: New line (allow default behavior)
        return;
      } else {
        // Enter: Send message
        e.preventDefault();
        
        if (value.trim() && onSend && !disabled) {
          onSend(value.trim());
        }
      }
    } else if (e.key === 'Escape') {
      // Escape: Clear input or blur
      e.preventDefault();
      if (value) {
        setValue('');
      } else {
        textareaRef.current?.blur();
      }
    } else if (e.key === 'Tab') {
      // Tab: Insert spaces instead of changing focus
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      setValue(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [isComposing, value, onSend, disabled]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleCompositionStart = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
  }, []);

  const clear = useCallback(() => {
    setValue('');
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  const focus = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const insertText = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    setValue(newValue);
    
    // Restore cursor position after inserted text
    setTimeout(() => {
      const newPosition = start + text.length;
      textarea.selectionStart = textarea.selectionEnd = newPosition;
    }, 0);
  }, [value, maxLength]);

  // Calculate character and line count
  const characterCount = value.length;
  const lineCount = value.split('\n').length;

  return {
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
  };
};