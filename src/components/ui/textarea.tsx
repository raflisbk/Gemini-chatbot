// src/components/ui/textarea.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Whether to auto-resize the textarea based on content
   */
  autoResize?: boolean;
  /**
   * Minimum number of rows
   */
  minRows?: number;
  /**
   * Maximum number of rows
   */
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, minRows = 1, maxRows = 10, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!, []);
    
    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) return;
      
      // Reset height to recalculate
      textarea.style.height = 'auto';
      
      // Calculate new height
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
      const padding = parseInt(window.getComputedStyle(textarea).paddingTop) + 
                     parseInt(window.getComputedStyle(textarea).paddingBottom);
      
      const minHeight = (lineHeight * minRows) + padding;
      const maxHeight = (lineHeight * maxRows) + padding;
      
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      
      textarea.style.height = `${newHeight}px`;
    }, [autoResize, minRows, maxRows]);
    
    // Handle input changes for auto-resize
    const handleInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (props.onInput) {
        props.onInput(e);
      }
    }, [adjustHeight, props.onInput]);
    
    // Handle change events
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (props.onChange) {
        props.onChange(e);
      }
    }, [adjustHeight, props.onChange]);
    
    // Adjust height on mount and when value changes
    React.useEffect(() => {
      adjustHeight();
    }, [adjustHeight, props.value]);
    
    return (
      <textarea
        className={cn(
          // Base styles
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
          // Focus styles
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Resize behavior
          autoResize ? "resize-none overflow-hidden" : "resize-vertical",
          // Min height
          autoResize ? "min-h-[40px]" : "min-h-[80px]",
          className
        )}
        ref={textareaRef}
        onInput={handleInput}
        onChange={handleChange}
        rows={autoResize ? minRows : props.rows}
        style={{
          ...(autoResize && {
            minHeight: `${(20 * minRows) + 16}px`, // 20px line-height + 16px padding
            maxHeight: `${(20 * maxRows) + 16}px`
          }),
          ...props.style
        }}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }

// Export additional textarea variants for specific use cases

export interface AutoResizeTextareaProps extends Omit<TextareaProps, 'autoResize'> {}

export const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  (props, ref) => <Textarea {...props} autoResize ref={ref} />
)

AutoResizeTextarea.displayName = "AutoResizeTextarea"

export interface ChatTextareaProps extends Omit<TextareaProps, 'autoResize' | 'minRows' | 'maxRows'> {
  /**
   * Whether to show character count
   */
  showCharCount?: boolean;
  /**
   * Maximum character count
   */
  maxLength?: number;
}

export const ChatTextarea = React.forwardRef<HTMLTextAreaElement, ChatTextareaProps>(
  ({ className, showCharCount = false, maxLength, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(0);
    
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (props.onChange) {
        props.onChange(e);
      }
    }, [props.onChange]);
    
    React.useEffect(() => {
      if (typeof props.value === 'string') {
        setCharCount(props.value.length);
      }
    }, [props.value]);
    
    return (
      <div className="relative">
        <Textarea
          {...props}
          ref={ref}
          autoResize
          minRows={1}
          maxRows={5}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            showCharCount && maxLength && "pb-6",
            className
          )}
        />
        {showCharCount && maxLength && (
          <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
            <span className={cn(
              charCount > maxLength * 0.9 && "text-warning",
              charCount >= maxLength && "text-destructive"
            )}>
              {charCount}
            </span>
            <span className="text-muted-foreground">/{maxLength}</span>
          </div>
        )}
      </div>
    )
  }
)

ChatTextarea.displayName = "ChatTextarea"

// Export utility hook for textarea management
export function useTextareaAutoResize(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  dependency?: any
) {
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [textareaRef]);
  
  React.useEffect(() => {
    adjustHeight();
  }, [adjustHeight, dependency]);
  
  return adjustHeight;
}