import type { Metadata } from 'next';
import * as Sentry from '@sentry/nextjs';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

// Claude-like font configuration
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// 🔥 UPDATED: Changed from const to function for Sentry integration
export function generateMetadata(): Metadata {
  // Helper function to safely get Sentry trace data
  const getSentryTraceData = () => {
    try {
      // Only include Sentry data in production or when explicitly enabled
      const shouldIncludeSentry = 
        process.env.NODE_ENV === 'production' || 
        process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';

      if (!shouldIncludeSentry) {
        return {
          'sentry-enabled': 'false',
          'environment': process.env.NODE_ENV || 'development'
        };
      }

      const traceData = Sentry.getTraceData();

      // Remove any undefined values to satisfy the type
      const data = {
        ...traceData,
        'sentry-enabled': 'true',
        'sentry-environment': process.env.NODE_ENV || 'development',
        'sentry-release': process.env.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0',
        'app-name': 'ai-chatbot-indonesia',
        'app-version': process.env.npm_package_version || '1.0.0',
        'build-time': process.env.BUILD_TIME || new Date().toISOString(),
        'trace-generated-at': new Date().toISOString()
      };
      return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
    } catch (error) {
      console.warn('Failed to get Sentry trace data:', error);
      return {
        'sentry-enabled': 'true',
        'sentry-error': 'failed-to-get-trace-data',
        'environment': process.env.NODE_ENV || 'development'
      };
    }
  };

  return {
    title: 'AI Chatbot - Indonesian Trending Topics',
    description: 'Modern AI chatbot with real Indonesian trending topics and advanced features',
    keywords: ['AI', 'Chatbot', 'Indonesia', 'Trending', 'Gemini', 'TypeScript', 'Next.js'],
    authors: [{ name: 'AI Chatbot Team' }],
    creator: 'AI Chatbot Team',
    publisher: 'AI Chatbot Team',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'),
    openGraph: {
      title: 'AI Chatbot - Indonesian Trending Topics',
      description: 'Chat with AI about real Indonesian trending topics',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
      siteName: 'AI Chatbot Indonesia',
      locale: 'id_ID',
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'AI Chatbot Indonesia Preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AI Chatbot - Indonesian Trending Topics',
      description: 'Chat with AI about real Indonesian trending topics',
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.json',
    
    // 🔥 NEW: Sentry trace data integration
    other: getSentryTraceData()
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#10b981" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Claude-like font loading optimization */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className={`${inter.className} antialiased min-h-screen gradient-bg font-inter`}>
        <AuthProvider>
          <div className="min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}