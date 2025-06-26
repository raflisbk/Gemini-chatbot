// src/components/ChatMessage.tsx - Enhanced version with additional props

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw, Check } from 'lucide-react';
import { Message } from '@/lib/types';
import { formatTimestamp, cn, copyToClipboard } from '@/lib/utils';
import { Button } from './ui/button';

export interface ChatMessageProps {
  message: Message;
  index: number;
  showTimestamp?: boolean;
  compactMode?: boolean;
  isLastMessage?: boolean;
}

// Enhanced markdown parser for proper rendering
const parseMarkdown = (text: string): JSX.Element => {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentElement = '';
  let isCodeBlock = false;
  let codeLanguage = '';
  let codeContent = '';
  let listItems: string[] = [];
  let isInList = false;

  const processCurrentElement = (content: string, lineIndex: number) => {
    if (!content.trim()) {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }

    // Process inline markdown
    let processedContent = content;
    
    // Bold text
    processedContent = processedContent.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code
    processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Links
    processedContent = processedContent.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>'
    );

    elements.push(
      <p 
        key={`p-${lineIndex}`} 
        className="mb-2 last:mb-0 leading-relaxed" 
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  };

  const processListItems = (startIndex: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${startIndex}`} className="list-disc list-inside mb-4 ml-4 space-y-1">
          {listItems.map((item, idx) => {
            let processedItem = item;
            processedItem = processedItem.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
            processedItem = processedItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            processedItem = processedItem.replace(/\*(.*?)\*/g, '<em>$1</em>');
            processedItem = processedItem.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>');
            
            return (
              <li 
                key={`li-${startIndex}-${idx}`} 
                dangerouslySetInnerHTML={{ __html: processedItem }}
              />
            );
          })}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (!isCodeBlock) {
        // Start code block
        if (isInList) {
          processListItems(index);
          isInList = false;
        }
        isCodeBlock = true;
        codeLanguage = line.trim().replace('```', '');
        codeContent = '';
      } else {
        // End code block
        isCodeBlock = false;
        elements.push(
          <div key={`code-block-${index}`} className="my-4">
            <div className="bg-muted rounded-t-lg px-4 py-2 text-xs text-muted-foreground font-mono border">
              {codeLanguage || 'code'}
            </div>
            <pre className="bg-muted/50 rounded-b-lg p-4 overflow-x-auto border border-t-0">
              <code className="text-sm font-mono whitespace-pre">{codeContent}</code>
            </pre>
          </div>
        );
        codeContent = '';
        codeLanguage = '';
      }
      return;
    }

    if (isCodeBlock) {
      codeContent += line + '\n';
      return;
    }

    // Handle headers
    if (line.startsWith('#')) {
      if (isInList) {
        processListItems(index);
        isInList = false;
      }
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '');
      const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      
      elements.push(
        React.createElement(
          HeaderTag,
          {
            key: `header-${index}`,
            className: cn(
              "font-semibold mt-6 mb-3 first:mt-0",
              level === 1 && "text-2xl",
              level === 2 && "text-xl",
              level === 3 && "text-lg",
              level >= 4 && "text-base"
            )
          },
          text
        )
      );
      return;
    }

    // Handle lists
    if (line.match(/^[\s]*[-*+]\s+/) || line.match(/^[\s]*\d+\.\s+/)) {
      if (!isInList) {
        if (currentElement.trim()) {
          processCurrentElement(currentElement, index);
          currentElement = '';
        }
        isInList = true;
      }
      listItems.push(line.replace(/^[\s]*[-*+\d+.]\s+/, ''));
      return;
    }

    // Handle regular paragraphs
    if (isInList) {
      processListItems(index);
      isInList = false;
    }

    if (line.trim() === '') {
      if (currentElement.trim()) {
        processCurrentElement(currentElement, index);
        currentElement = '';
      }
    } else {
      currentElement += (currentElement ? ' ' : '') + line;
    }
  });

  // Process remaining content
  if (isInList) {
    processListItems(lines.length);
  }
  if (currentElement.trim()) {
    processCurrentElement(currentElement, lines.length);
  }

  return <div className="space-y-2">{elements}</div>;
};

export function ChatMessage({ 
  message, 
  index, 
  showTimestamp = true, 
  compactMode = false, 
  isLastMessage = false 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group flex items-start gap-3 p-4 rounded-2xl transition-all duration-200",
        isUser ? "flex-row-reverse" : "flex-row",
        compactMode ? "p-2" : "p-4",
        !isUser && "hover:bg-muted/20"
      )}
    >
      {/* Avatar */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm",
          compactMode && "h-6 w-6",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0" 
            : "bg-gradient-to-br from-emerald-500 to-blue-600 text-white border-0"
        )}
      >
        {isUser ? (
          <User className={cn("h-4 w-4", compactMode && "h-3 w-3")} />
        ) : (
          <Bot className={cn("h-4 w-4", compactMode && "h-3 w-3")} />
        )}
      </motion.div>

      {/* Message Content */}
      <div className="flex-1 space-y-2 min-w-0">
        {/* Header */}
        {!compactMode && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              {showTimestamp && (
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(message.timestamp)}
                </span>
              )}
            </div>
            
            {/* Message Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyToClipboard}
                className="h-6 w-6 p-0"
                title={copied ? 'Copied!' : 'Copy message'}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
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
        )}

        {/* Message Text with Enhanced Markdown Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "prose prose-sm max-w-none dark:prose-invert",
            "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
            "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            compactMode && "text-sm"
          )}
        >
          {isUser ? (
            <p className="mb-0 whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            parseMarkdown(message.content)
          )}
        </motion.div>

        {/* Compact mode timestamp */}
        {compactMode && showTimestamp && (
          <div className="text-xs text-muted-foreground">
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    </motion.div>
  );
}