// Logo.tsx - Override untuk green theme consistency
// JIKA Anda memiliki Logo component terpisah, update seperti ini:

'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function Logo({ 
  size = 'md', 
  className,
  showText = false 
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Icon - FIXED: Green theme */}
      <div className={cn(
        "rounded-lg flex items-center justify-center",
        "bg-gradient-to-br from-emerald-500 to-emerald-700",
        "text-white shadow-lg",
        sizeClasses[size]
      )}>
        <Bot className={cn(
          size === 'sm' ? 'h-3 w-3' : 
          size === 'md' ? 'h-4 w-4' : 'h-6 w-6'
        )} />
      </div>
      
      {/* Logo Text - FIXED: Green theme */}
      {showText && (
        <span className={cn(
          "font-bold bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent",
          textSizeClasses[size]
        )}>
          AI Chatbot
        </span>
      )}
    </div>
  );
}

export default Logo;

// ===========================================
// ATAU jika Anda tidak memiliki Logo component terpisah,
// tambahkan inline di EnhancedNavbar seperti ini:
// ===========================================

export function InlineLogo({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center",
      "bg-gradient-to-br from-emerald-500 to-emerald-700",
      "text-white shadow-lg",
      sizeClasses[size]
    )}>
      <Bot className={cn(
        size === 'sm' ? 'h-3 w-3' : 
        size === 'md' ? 'h-4 w-4' : 'h-6 w-6'
      )} />
    </div>
  );
}