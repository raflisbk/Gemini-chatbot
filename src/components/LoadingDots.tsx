import { motion } from 'framer-motion';

export function LoadingDots() {
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