'use client';

import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'gradient' | 'minimal';
}

const Logo: React.FC<LogoProps> = ({ 
  className,
  showText = true,
  size = 'md',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: {
      icon: 'h-6 w-6',
      text: 'text-lg',
      container: 'gap-2'
    },
    md: {
      icon: 'h-8 w-8',
      text: 'text-xl',
      container: 'gap-2'
    },
    lg: {
      icon: 'h-10 w-10',
      text: 'text-2xl',
      container: 'gap-3'
    },
    xl: {
      icon: 'h-12 w-12',
      text: 'text-3xl',
      container: 'gap-3'
    }
  };

  const variantClasses = {
    default: {
      icon: 'text-primary',
      text: 'text-foreground',
      container: ''
    },
    gradient: {
      icon: 'text-transparent bg-gradient-to-br from-primary to-primary/80 bg-clip-text',
      text: 'bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent',
      container: ''
    },
    minimal: {
      icon: 'text-muted-foreground',
      text: 'text-muted-foreground',
      container: ''
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <div className={cn(
      'flex items-center',
      currentSize.container,
      currentVariant.container,
      className
    )}>
      {/* Logo Icon */}
      <div className="relative">
        <Bot className={cn(
          currentSize.icon,
          currentVariant.icon
        )} />
        {variant === 'gradient' && (
          <Sparkles className={cn(
            'absolute -top-1 -right-1',
            size === 'sm' ? 'h-3 w-3' : 
            size === 'md' ? 'h-4 w-4' :
            size === 'lg' ? 'h-5 w-5' : 'h-6 w-6',
            'text-primary/60 animate-pulse'
          )} />
        )}
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            'font-bold leading-tight',
            currentSize.text,
            currentVariant.text
          )}>
            AI Assistant
          </span>
          {(size === 'lg' || size === 'xl') && (
            <span className={cn(
              'text-xs text-muted-foreground leading-tight',
              size === 'xl' ? 'text-sm' : 'text-xs'
            )}>
              Powered by Gemini
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Default export untuk compatibility
export default Logo;

// Named export juga tersedia
export { Logo };