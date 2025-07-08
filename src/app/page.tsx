// src/app/page.tsx - Fixed import error

'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// FIXED: Use default import instead of named import
import { ChatBot } from '@/components/ChatBot';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Optional: Redirect logic if needed
  useEffect(() => {
    // Add any redirect logic here if needed
    // For now, we'll show the ChatBot for everyone
  }, [isAuthenticated, router]);

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen w-full">
      <ChatBot />
    </main>
  );
}