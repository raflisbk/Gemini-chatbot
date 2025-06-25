import { motion, AnimatePresence } from 'framer-motion';
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

// Custom markdown parser for proper rendering
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
    processedContent = processedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    elements.push(
      <p 
        key={`p-${lineIndex}`} 
        className="mb-2 last:mb-0" 
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
            processedItem = processedItem.replace(/`([^`]+)`/g, '<code>$1</code>');
            
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
    if (line.startsWith('### ')) {
      if (isInList) {
        processListItems(index);
        isInList = false;
      }
      const headerText = line.replace('### ', '');
      elements.push(
        <h3 key={`h3-${index}`} className="text-lg font-semibold mt-4 mb-2">
          {headerText}
        </h3>
      );
      return;
    }

    if (line.startsWith('## ')) {
      if (isInList) {
        processListItems(index);
        isInList = false;
      }
      const headerText = line.replace('## ', '');
      elements.push(
        <h2 key={`h2-${index}`} className="text-xl font-semibold mt-4 mb-2">
          {headerText}
        </h2>
      );
      return;
    }

    if (line.startsWith('# ')) {
      if (isInList) {
        processListItems(index);
        isInList = false;
      }
      const headerText = line.replace('# ', '');
      elements.push(
        <h1 key={`h1-${index}`} className="text-2xl font-bold mt-4 mb-2">
          {headerText}
        </h1>
      );
      return;
    }

    // Handle lists
    if (line.trim().match(/^[\*\-\+]\s+/) || line.trim().match(/^\d+\.\s+/)) {
      const listContent = line.trim().replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '');
      listItems.push(listContent);
      isInList = true;
      return;
    }

    // Handle blockquotes
    if (line.trim().startsWith('> ')) {
      if (isInList) {
        processListItems(index);
        isInList = false;
      }
      const quoteText = line.replace('> ', '');
      elements.push(
        <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
          {quoteText}
        </blockquote>
      );
      return;
    }

    // Handle horizontal rules
    if (line.trim() === '---' || line.trim() === '***') {
      if (isInList) {
        processListItems(index);
        isInList = false;
      }
      elements.push(<hr key={`hr-${index}`} className="my-4 border-border" />);
      return;
    }

    // Regular paragraph or end of list
    if (isInList && line.trim() === '') {
      processListItems(index);
      isInList = false;
      return;
    }

    if (!isInList) {
      processCurrentElement(line, index);
    }
  });

  // Process remaining list items
  if (isInList) {
    processListItems(lines.length);
  }

  return <div className="prose prose-sm max-w-none dark:prose-invert">{elements}</div>;
};

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
        'group flex gap-4 p-6 hover:bg-muted/30 transition-all duration-200 chat-message',
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

        {/* Message Text with Markdown Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="prose prose-sm max-w-none dark:prose-invert"
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-foreground leading-relaxed">
              {message.content}
            </p>
          ) : (
            parseMarkdown(message.content)
          )}
        </motion.div>

        {/* Copy Feedback */}
        <AnimatePresence>
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
        </AnimatePresence>
      </div>
    </motion.div>
  );
}