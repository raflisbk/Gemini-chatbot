import { motion } from 'framer-motion';

interface LoadingDotsProps {
  variant?: 'default' | 'thinking' | 'processing' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'gradient';
}

export function LoadingDots({ 
  variant = 'default', 
  size = 'md',
  color = 'gradient'
}: LoadingDotsProps) {
  
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5', 
    lg: 'w-2 h-2'
  };

  const colorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    gradient: 'bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600'
  };

  // Untuk backward compatibility dengan kode existing
  if (variant === 'default' || !variant) {
    return (
      <div className="flex items-center space-x-1 p-4">
        <span className="text-sm text-muted-foreground mr-2">Thinking</span>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'thinking') {
    return (
      <motion.div 
        className="flex items-center space-x-2 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span 
          className="text-sm text-muted-foreground mr-2 font-medium"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🤖 AI is thinking
        </motion.span>
        
        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full shadow-lg`}
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.2, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut"
              }}
              style={{ 
                filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
              }}
            />
          ))}
        </div>
        
        {/* Subtle background glow effect */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 -z-10"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>
    );
  }

  if (variant === 'processing') {
    return (
      <motion.div 
        className="flex items-center space-x-3 p-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
      >
        <motion.span 
          className="text-sm text-muted-foreground font-medium"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Processing
        </motion.span>
        
        <div className="flex space-x-1">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
              animate={{
                rotate: [0, 180, 360],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.1,
                ease: "linear"
              }}
              style={{ 
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
              }}
            />
          ))}
        </div>
        
        {/* Rotating ring effect */}
        <motion.div
          className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    );
  }

  if (variant === 'minimal') {
    return (
      <motion.div 
        className="flex items-center space-x-1 px-2 py-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${sizeClasses[size]} bg-muted-foreground rounded-full`}
            animate={{
              opacity: [0.2, 1, 0.2],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    );
  }

  // Fallback default
  return (
    <div className="flex items-center space-x-1 p-4">
      <span className="text-sm text-muted-foreground mr-2">Thinking</span>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}