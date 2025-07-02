// middleware.ts - Enhanced version
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  apiRateLimiter, 
  authRateLimiter, 
  chatRateLimiter, 
  uploadRateLimiter,
  createRateLimitHeaders,
  checkMultipleRateLimits 
} from '@/lib/rateLimiter';
import { EnhancedAuth } from '@/lib/authEnhanced';

// ========================================
// SECURITY CONFIGURATION
// ========================================

interface SecurityConfig {
  enableCSP: boolean;
  enableCORS: boolean;
  enableRateLimiting: boolean;
  enableSecurityHeaders: boolean;
  corsOrigins: string[];
  maxRequestSize: number;
}

const securityConfig: SecurityConfig = {
  enableCSP: true,
  enableCORS: true,
  enableRateLimiting: true,
  enableSecurityHeaders: true,
  corsOrigins: [
    'http://localhost:3000',
    'https://yourdomain.com',
    'https://*.vercel.app',
  ],
  maxRequestSize: 10 * 1024 * 1024, // 10MB
};

// ========================================
// SECURITY HEADERS
// ========================================

function addSecurityHeaders(response: NextResponse): NextResponse {
  if (!securityConfig.enableSecurityHeaders) return response;

  // Basic security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
    ].join(', ')
  );

  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content Security Policy
  if (securityConfig.enableCSP) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const cspDirectives = [
      "default-src 'self'",
      isDevelopment 
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live" 
        : "script-src 'self' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co https://*.vercel-storage.com https://generativelanguage.googleapis.com wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
      "child-src 'self'",
      isDevelopment ? "" : "upgrade-insecure-requests",
    ].filter(Boolean);

    response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  }

  return response;
}

// ========================================
// CORS HANDLING
// ========================================

function handleCORS(request: NextRequest, response: NextResponse): NextResponse {
  if (!securityConfig.enableCORS) return response;

  const origin = request.headers.get('origin');
  const isAllowedOrigin = !origin || securityConfig.corsOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

// ========================================
// RATE LIMITING
// ========================================

async function applyRateLimiting(request: NextRequest): Promise<NextResponse | null> {
  if (!securityConfig.enableRateLimiting) return null;

  const { pathname } = request.nextUrl;

  try {
    let rateLimitResult;

    // Apply specific rate limiters based on route
    if (pathname.startsWith('/api/auth/')) {
      rateLimitResult = await authRateLimiter.checkLimit(request);
    } else if (pathname.startsWith('/api/chat')) {
      rateLimitResult = await chatRateLimiter.checkLimit(request);
    } else if (pathname.startsWith('/api/files/upload')) {
      rateLimitResult = await uploadRateLimiter.checkLimit(request);
    } else if (pathname.startsWith('/api/')) {
      rateLimitResult = await apiRateLimiter.checkLimit(request);
    } else {
      // No rate limiting for non-API routes
      return null;
    }

    // Create response with rate limit headers
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );

      // Add rate limit headers
      const headers = createRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return addSecurityHeaders(response);
    }

    // Store rate limit info for adding to successful responses
    const headers = createRateLimitHeaders(rateLimitResult);
    
    // We'll add these headers to the response later
    return null; // Continue processing
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On rate limiter error, allow the request but log it
    return null;
  }
}

// ========================================
// REQUEST VALIDATION
// ========================================

function validateRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Check request size for upload endpoints
  if (pathname.startsWith('/api/files/upload')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > securityConfig.maxRequestSize) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }
  }

  // Validate request method
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];
  if (!allowedMethods.includes(request.method)) {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-host',
    'x-cluster-client-ip',
  ];

  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && value !== request.headers.get('host')) {
      console.warn(`🚨 Suspicious header detected: ${header}=${value}`);
    }
  }

  return null;
}

// ========================================
// AUTHENTICATION CHECK
// ========================================

async function checkAuthentication(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  if (!isProtectedApiRoute(pathname)) {
    return null;
  }

  try {
    const user = await EnhancedAuth.getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Add user info to headers for downstream handlers
    const response = NextResponse.next();
    response.headers.set('X-User-ID', user.id);
    response.headers.set('X-User-Role', user.role);
    response.headers.set('X-User-Email', user.email);
    response.headers.set('X-Session-ID', user.sessionId);

    return null; // Continue processing
  } catch (error) {
    console.error('Authentication check error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      },
      { status: 401 }
    );
  }
}

// ========================================
// ROUTE PROTECTION CONFIGURATION
// ========================================

function isProtectedApiRoute(pathname: string): boolean {
  const protectedRoutes = [
    '/api/chat',
    '/api/files',
    '/api/auth/verify',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/sessions',
    '/api/admin',
    '/api/user',
  ];

  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
    '/api/status',
  ];

  // Check if explicitly public
  for (const route of publicRoutes) {
    if (pathname.startsWith(route)) {
      return false;
    }
  }

  // Check if protected
  for (const route of protectedRoutes) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }

  // Default to protected for API routes
  return pathname.startsWith('/api/');
}

// ========================================
// SECURITY MONITORING
// ========================================

function logSecurityEvent(
  request: NextRequest, 
  event: string, 
  details?: Record<string, any>
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    pathname: request.nextUrl.pathname,
    method: request.method,
    ...details,
  };

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to your monitoring service (Sentry, LogRocket, etc.)
    console.warn('🚨 Security Event:', JSON.stringify(logData));
  } else {
    console.log('🔒 Security Event:', logData);
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return request.ip || 'unknown';
}

// ========================================
// MAIN MIDDLEWARE FUNCTION
// ========================================

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;

  try {
    // 1. Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      return addSecurityHeaders(handleCORS(request, response));
    }

    // 2. Validate request
    const validationError = validateRequest(request);
    if (validationError) {
      logSecurityEvent(request, 'INVALID_REQUEST');
      return addSecurityHeaders(validationError);
    }

    // 3. Apply rate limiting
    const rateLimitResponse = await applyRateLimiting(request);
    if (rateLimitResponse) {
      logSecurityEvent(request, 'RATE_LIMIT_EXCEEDED');
      return rateLimitResponse;
    }

    // 4. Check authentication for protected routes
    const authResponse = await checkAuthentication(request);
    if (authResponse) {
      logSecurityEvent(request, 'UNAUTHORIZED_ACCESS');
      return addSecurityHeaders(authResponse);
    }

    // 5. Create successful response
    const response = NextResponse.next();

    // 6. Add security headers
    addSecurityHeaders(response);

    // 7. Handle CORS
    handleCORS(request, response);

    // 8. Add processing time header
    const processingTime = Date.now() - startTime;
    response.headers.set('X-Processing-Time', `${processingTime}ms`);

    // 9. Add request ID for tracking
    const requestId = crypto.randomUUID();
    response.headers.set('X-Request-ID', requestId);

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    logSecurityEvent(request, 'MIDDLEWARE_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const errorResponse = NextResponse.json(
      { 
        error: 'Internal server error',
        requestId: crypto.randomUUID(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(errorResponse);
  }
}

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - manifest files
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|public/).*)',
  ],
};

// ========================================
// UTILITY EXPORTS
// ========================================

export {
  addSecurityHeaders,
  handleCORS,
  isProtectedApiRoute,
  getClientIP,
  logSecurityEvent,
};