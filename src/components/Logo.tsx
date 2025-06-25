import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'minimal' | 'text-only' | 'icon-only';
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-4 h-4 text-xs',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
  '3xl': 'w-24 h-24 text-2xl'
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-2xl',
  '2xl': 'text-3xl',
  '3xl': 'text-4xl'
};

export function Logo({ 
  size = 'md', 
  variant = 'default', 
  animated = true,
  className 
}: LogoProps) {
  const LogoIcon = ({ className: iconClassName }: { className?: string }) => (
    <motion.div
      whileHover={animated ? { scale: 1.05, rotate: [0, -2, 2, 0] } : undefined}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className={cn(
        sizeClasses[size],
        'relative flex items-center justify-center rounded-2xl shadow-lg',
        'bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600',
        'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:via-white/10 before:to-transparent before:opacity-70',
        'after:absolute after:inset-[1px] after:rounded-2xl after:bg-gradient-to-br after:from-transparent after:via-transparent after:to-black/10',
        iconClassName
      )}
    >
      {/* Neural Network Pattern */}
      <svg
        viewBox="0 0 24 24"
        className="w-3/5 h-3/5 text-white drop-shadow-sm relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Central Node */}
        <motion.circle 
          cx="12" 
          cy="12" 
          r="2" 
          fill="currentColor" 
          className="opacity-90"
          animate={animated ? {
            scale: [1, 1.1, 1],
            opacity: [0.9, 1, 0.9]
          } : undefined}
          transition={animated ? {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          } : undefined}
        />
        
        {/* Input Layer */}
        <circle cx="6" cy="8" r="1.5" fill="currentColor" className="opacity-75" />
        <circle cx="6" cy="12" r="1.5" fill="currentColor" className="opacity-75" />
        <circle cx="6" cy="16" r="1.5" fill="currentColor" className="opacity-75" />
        
        {/* Output Layer */}
        <circle cx="18" cy="8" r="1.5" fill="currentColor" className="opacity-75" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" className="opacity-75" />
        <circle cx="18" cy="16" r="1.5" fill="currentColor" className="opacity-75" />
        
        {/* Connections with animation */}
        <g stroke="currentColor" strokeWidth="0.5" className="opacity-60">
          <motion.line 
            x1="7.5" y1="8" x2="10" y2="12"
            animate={animated ? { opacity: [0.3, 0.7, 0.3] } : undefined}
            transition={animated ? { duration: 3, repeat: Infinity, delay: 0 } : undefined}
          />
          <motion.line 
            x1="7.5" y1="12" x2="10" y2="12"
            animate={animated ? { opacity: [0.3, 0.7, 0.3] } : undefined}
            transition={animated ? { duration: 3, repeat: Infinity, delay: 0.5 } : undefined}
          />
          <motion.line 
            x1="7.5" y1="16" x2="10" y2="12"
            animate={animated ? { opacity: [0.3, 0.7, 0.3] } : undefined}
            transition={animated ? { duration: 3, repeat: Infinity, delay: 1 } : undefined}
          />
          <motion.line 
            x1="14" y1="12" x2="16.5" y2="8"
            animate={animated ? { opacity: [0.3, 0.7, 0.3] } : undefined}
            transition={animated ? { duration: 3, repeat: Infinity, delay: 1.5 } : undefined}
          />
          <motion.line 
            x1="14" y1="12" x2="16.5" y2="12"
            animate={animated ? { opacity: [0.3, 0.7, 0.3] } : undefined}
            transition={animated ? { duration: 3, repeat: Infinity, delay: 2 } : undefined}
          />
          <motion.line 
            x1="14" y1="12" x2="16.5" y2="16"
            animate={animated ? { opacity: [0.3, 0.7, 0.3] } : undefined}
            transition={animated ? { duration: 3, repeat: Infinity, delay: 2.5 } : undefined}
          />
        </g>
        
        {/* Pulse Animation */}
        {animated && (
          <motion.circle
            cx="12"
            cy="12"
            r="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="opacity-40"
            animate={{
              r: [2, 5, 2],
              opacity: [0.4, 0.1, 0.4]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </svg>
    </motion.div>
  );

  const LogoText = ({ className: textClassName }: { className?: string }) => (
    <motion.div
      initial={animated ? { opacity: 0, x: -10 } : undefined}
      animate={animated ? { opacity: 1, x: 0 } : undefined}
      transition={{ delay: 0.2, duration: 0.5 }}
      className={cn('font-bold tracking-tight', textClassName)}
    >
      <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
        AI
      </span>
      <span className="text-foreground ml-1">
        Chatbot
      </span>
    </motion.div>
  );

  if (variant === 'icon-only') {
    return <LogoIcon className={className} />;
  }

  if (variant === 'text-only') {
    return <LogoText className={cn(textSizeClasses[size], className)} />;
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <LogoIcon />
        <span className={cn(
          'font-semibold bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent',
          textSizeClasses[size]
        )}>
          AI
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.9 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn('flex items-center gap-3', className)}
    >
      <LogoIcon />
      <LogoText className={textSizeClasses[size]} />
    </motion.div>
  );
}

// Brand Colors Export for consistent theming
export const brandColors = {
  primary: {
    50: '#f0fdf4',    // emerald-50
    100: '#dcfce7',   // emerald-100
    200: '#bbf7d0',   // emerald-200
    300: '#86efac',   // emerald-300
    400: '#4ade80',   // emerald-400
    500: '#22c55e',   // emerald-500
    600: '#16a34a',   // emerald-600
    700: '#15803d',   // emerald-700
    800: '#166534',   // emerald-800
    900: '#14532d',   // emerald-900
  },
  secondary: {
    50: '#f0f9ff',    // blue-50
    100: '#e0f2fe',   // blue-100
    200: '#bae6fd',   // blue-200
    300: '#7dd3fc',   // blue-300
    400: '#38bdf8',   // blue-400
    500: '#0ea5e9',   // blue-500
    600: '#0284c7',   // blue-600
    700: '#0369a1',   // blue-700
    800: '#075985',   // blue-800
    900: '#0c4a6e',   // blue-900
  },
  accent: {
    50: '#f0fdfa',    // teal-50
    100: '#ccfbf1',   // teal-100
    200: '#99f6e4',   // teal-200
    300: '#5eead4',   // teal-300
    400: '#2dd4bf',   // teal-400
    500: '#14b8a6',   // teal-500
    600: '#0d9488',   // teal-600
    700: '#0f766e',   // teal-700
    800: '#115e59',   // teal-800
    900: '#134e4a',   // teal-900
  },
  gradient: {
    primary: 'from-emerald-500 via-teal-500 to-blue-600',
    primaryHover: 'from-emerald-600 via-teal-600 to-blue-700',
    text: 'from-emerald-600 via-teal-600 to-blue-600',
    light: 'from-emerald-50 via-teal-50 to-blue-50',
    dark: 'from-emerald-950/50 via-teal-950/50 to-blue-950/50',
    background: 'from-emerald-50/30 via-teal-50/20 to-blue-50/30',
    backgroundDark: 'from-emerald-950/30 via-teal-950/20 to-blue-950/30',
  }
};

// Utility function to get brand color
export const getBrandColor = (color: keyof typeof brandColors, shade: keyof typeof brandColors.primary = 500) => {
  if (color === 'gradient') {
    return brandColors.gradient;
  }
  return brandColors[color][shade as keyof typeof brandColors.primary];
};