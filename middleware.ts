import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co https://*.vercel-storage.com https://generativelanguage.googleapis.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  );

  return response;
}

// Rate limiting
function rateLimit(request: NextRequest, limit: number = 100, windowMs: number = 15 * 60 * 1000) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - windowMs;

  const current = rateLimitStore.get(ip);
  
  if (!current || current.resetTime < windowStart) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: limit - current.count };
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
}, 60000); // Clean up every minute

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const { allowed, remaining } = rateLimit(request);
    
    if (!allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    // Check authentication for protected API routes
    if (isProtectedApiRoute(pathname)) {
      const authResult = await authenticateRequest(request);
      
      if (!authResult.success) {
        const unauthorizedResponse = NextResponse.json(
          { error: authResult.error },
          { status: 401 }
        );
        return addSecurityHeaders(unauthorizedResponse);
      }

      // Add user info to headers for API routes
      if (authResult.user) {
        response.headers.set('X-User-ID', authResult.user.id);
        response.headers.set('X-User-Role', authResult.user.role);
      }
    }

    return addSecurityHeaders(response);
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

// Check if API route requires authentication
function isProtectedApiRoute(pathname: string): boolean {
  const protectedRoutes = [
    '/api/chat',
    '/api/files',
    '/api/auth/verify',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/sessions',
    '/api/admin'
  ];

  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/trending'
  ];

  // Check if it's explicitly public
  for (const route of publicRoutes) {
    if (pathname.startsWith(route)) {
      return false;
    }
  }

  // Check if it's protected
  for (const route of protectedRoutes) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }

  return false;
}

// Authenticate request
async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: { id: string; role: string };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    return {
      success: true,
      user: {
        id: payload.userId,
        role: payload.role
      }
    };
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};