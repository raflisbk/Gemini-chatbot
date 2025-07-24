// src/app/page.tsx - FIXED VERSION

'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Import ChatBot component - Keep your existing import
import { ChatBot } from '@/components/ChatBot';

export default function HomePage() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const router = useRouter();

  // Optional: Redirect logic if needed
  useEffect(() => {
    // Add any redirect logic here if needed
    // For now, we'll show the ChatBot for everyone
  }, [isAuthenticated, router]);

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an initialization error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-2xl">⚠️</div>
          <h1 className="text-lg font-semibold text-foreground">
            Initialization Error
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
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