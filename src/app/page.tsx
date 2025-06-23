'use client';

import { useAuth } from '@/context/AuthContext';
import { ChatBot } from '@/components/ChatBot';
import { motion } from 'framer-motion';

export default function Home() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Always render ChatBot - no authentication required for basic access
  return (
    <main className="min-h-screen">
      <ChatBot />
    </main>
  );
}