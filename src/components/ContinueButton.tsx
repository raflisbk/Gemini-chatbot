import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';

interface ContinueButtonProps {
  onContinue: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ContinueButton({ 
  onContinue, 
  isLoading = false, 
  disabled = false
}: ContinueButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex justify-center py-4"
    >
      <Button
        onClick={onContinue}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="gap-2 bg-background/50 backdrop-blur-sm border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
      >
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </motion.div>
            <span>Continuing...</span>
          </>
        ) : (
          <>
            <ArrowRight className="h-4 w-4" />
            <span>Continue</span>
          </>
        )}
      </Button>
    </motion.div>
  );
}