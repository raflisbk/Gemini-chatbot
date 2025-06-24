import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal' | 'floating';
  showText?: boolean;
  animate?: boolean;
}

export function Logo({ 
  size = 'md', 
  variant = 'default', 
  showText = false,
  animate = true 
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl', 
    xl: 'text-2xl'
  };

  const logoVariants = {
    default: {
      scale: 1,
      rotate: 0,
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.1,
      rotate: 10,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.95,
      rotate: -5,
      transition: { duration: 0.1 }
    }
  };

  const floatingAnimation = {
    y: [-8, 8, -8],
    rotate: [-5, 5, -5],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const LogoSVG = () => (
    <svg 
      viewBox="0 0 100 100" 
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle with Gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        
        {/* Glow Filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Shadow Filter */}
        <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* Outer Ring */}
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="url(#logoGradient)"
        filter="url(#dropshadow)"
        animate={animate ? {
          scale: [1, 1.02, 1],
          opacity: [0.9, 1, 0.9]
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Inner Circle */}
      <motion.circle
        cx="50"
        cy="50"
        r="35"
        fill="url(#innerGradient)"
        animate={animate ? {
          scale: [1, 1.05, 1],
          rotate: [0, 180, 360]
        } : {}}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* AI Text */}
      <motion.text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill="white"
        filter="url(#glow)"
        animate={animate ? {
          scale: [1, 1.1, 1],
          opacity: [0.9, 1, 0.9]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        AI
      </motion.text>
      
      {/* Decorative Elements */}
      <motion.circle
        cx="25"
        cy="25"
        r="2"
        fill="#34d399"
        animate={animate ? {
          scale: [0, 1, 0],
          opacity: [0, 1, 0]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 0.5
        }}
      />
      <motion.circle
        cx="75"
        cy="25"
        r="2"
        fill="#34d399"
        animate={animate ? {
          scale: [0, 1, 0],
          opacity: [0, 1, 0]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 1
        }}
      />
      <motion.circle
        cx="75"
        cy="75"
        r="2"
        fill="#34d399"
        animate={animate ? {
          scale: [0, 1, 0],
          opacity: [0, 1, 0]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 1.5
        }}
      />
      <motion.circle
        cx="25"
        cy="75"
        r="2"
        fill="#34d399"
        animate={animate ? {
          scale: [0, 1, 0],
          opacity: [0, 1, 0]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 2
        }}
      />
    </svg>
  );

  if (variant === 'minimal') {
    return (
      <motion.div
        className={`${sizeClasses[size]} relative`}
        variants={logoVariants}
        initial="default"
        whileHover="hover"
        whileTap="tap"
        animate={animate ? floatingAnimation : {}}
      >
        <LogoSVG />
      </motion.div>
    );
  }

  if (variant === 'floating') {
    return (
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={animate ? floatingAnimation : {}}
      >
        <motion.div
          variants={logoVariants}
          initial="default"
          whileHover="hover"
          whileTap="tap"
          animate={animate ? pulseAnimation : {}}
        >
          <LogoSVG />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex items-center gap-3 ${showText ? 'cursor-pointer' : ''}`}
      variants={logoVariants}
      initial="default"
      whileHover="hover"
      whileTap="tap"
    >
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={animate ? {
          rotate: [0, 360],
        } : {}}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <LogoSVG />
      </motion.div>
      
      {showText && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <h1 className={`font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent ${textSizes[size]}`}>
            AI Chatbot
          </h1>
          <p className="text-xs text-muted-foreground">
            Powered by Advanced AI
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}