// src/app/api/errors/report/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-enhanced';
import { cacheManager } from '@/lib/redis';
import { apiRateLimiter } from '@/lib/rateLimiter';

// Import the enhanced types
import type { Database } from '@/types/supabase-enhanced';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const errorReportSchema = z.object({
  errorId: z.string().min(1),
  timestamp: z.string().datetime(),
  message: z.string().min(1),
  stack: z.string().optional(),
  componentStack: z.string(),
  userAgent: z.string(),
  url: z.string().url(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  // Additional context
  level: z.enum(['error', 'warning', 'info']).default('error'),
  tags: z.array(z.string()).default([]),
  extra: z.record(z.any()).optional(),
});

type ErrorReport = z.infer<typeof errorReportSchema>;

// ========================================
// ERROR STORAGE
// ========================================

async function storeErrorReport(errorReport: ErrorReport): Promise<boolean> {
  try {
    // Store in Supabase - FIXED: Use correct column names
    const { error } = await supabaseAdmin
      .from('error_reports')
      .insert({
        error_id: errorReport.errorId,
        timestamp: errorReport.timestamp,
        message: errorReport.message,
        stack: errorReport.stack || null,
        component_stack: errorReport.componentStack,
        user_agent: errorReport.userAgent,
        url: errorReport.url,
        user_id: errorReport.userId || null,
        session_id: errorReport.sessionId || null,
        level: errorReport.level,
        tags: errorReport.tags,
        extra: errorReport.extra || {},
      });

    if (error) {
      console.error('Failed to store error report in database:', error);
      return false;
    }

    // Cache for quick access (optional)
    await cacheManager.set(
      `error:${errorReport.errorId}`,
      errorReport,
      3600, // 1 hour
      'errors'
    );

    return true;
  } catch (error) {
    console.error('Error storing error report:', error);
    return false;
  }
}

// ========================================
// ERROR PROCESSING
// ========================================

async function processErrorReport(errorReport: ErrorReport): Promise<void> {
  try {
    // 1. Check for duplicate errors (same message + stack within last hour)
    const isDuplicate = await checkForDuplicate(errorReport);
    if (isDuplicate) {
      console.log(`Skipping duplicate error: ${errorReport.errorId}`);
      return;
    }

    // 2. Classify error severity
    const severity = classifyErrorSeverity(errorReport);
    
    // 3. Check if this is a critical error that needs immediate attention
    if (severity === 'critical') {
      await handleCriticalError(errorReport);
    }

    // 4. Update error statistics
    await updateErrorStats(errorReport);

    // 5. Check for error patterns
    await checkErrorPatterns(errorReport);

  } catch (error) {
    console.error('Error processing error report:', error);
  }
}

async function checkForDuplicate(errorReport: ErrorReport): Promise<boolean> {
  try {
    const cacheKey = `duplicate:${generateDuplicateKey(errorReport)}`;
    const exists = await cacheManager.exists(cacheKey, 'errors');
    
    if (exists) {
      // Increment duplicate count - FIXED: Use the new incr method
      const currentCount = await cacheManager.incr(`${cacheKey}:count`, 'errors');
      console.log(`Duplicate error count: ${currentCount} for ${errorReport.errorId}`);
      return true;
    }

    // Mark as seen for 1 hour
    await cacheManager.set(cacheKey, true, 3600, 'errors');
    return false;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
}

function generateDuplicateKey(errorReport: ErrorReport): string {
  // Create a hash of message + first few lines of stack
  const stackLines = errorReport.stack?.split('\n').slice(0, 3).join('\n') || '';
  const key = `${errorReport.message}:${stackLines}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

function classifyErrorSeverity(errorReport: ErrorReport): 'low' | 'medium' | 'high' | 'critical' {
  const message = errorReport.message.toLowerCase();
  const stack = errorReport.stack?.toLowerCase() || '';

  // Critical errors
  const criticalPatterns = [
    'security',
    'authentication failed',
    'unauthorized access',
    'sql injection',
    'xss',
    'csrf',
    'database connection',
    'redis connection',
    'payment',
    'billing',
  ];

  // High severity errors
  const highPatterns = [
    'cannot read property',
    'undefined is not a function',
    'maximum call stack',
    'out of memory',
    'network error',
    'timeout',
    'failed to fetch',
  ];

  // Medium severity errors
  const mediumPatterns = [
    'validation error',
    'not found',
    'rate limit',
    'permission denied',
  ];

  if (criticalPatterns.some(pattern => message.includes(pattern) || stack.includes(pattern))) {
    return 'critical';
  }

  if (highPatterns.some(pattern => message.includes(pattern) || stack.includes(pattern))) {
    return 'high';
  }

  if (mediumPatterns.some(pattern => message.includes(pattern) || stack.includes(pattern))) {
    return 'medium';
  }

  return 'low';
}

async function handleCriticalError(errorReport: ErrorReport): Promise<void> {
  try {
    // 1. Send immediate alert (in production, this would go to Slack, email, etc.)
    console.error('🚨 CRITICAL ERROR DETECTED:', {
      errorId: errorReport.errorId,
      message: errorReport.message,
      userId: errorReport.userId,
      url: errorReport.url,
    });

    // 2. Store in critical errors cache for monitoring dashboard
    await cacheManager.set(
      `critical:${errorReport.errorId}`,
      errorReport,
      86400, // 24 hours
      'errors'
    );

    // 3. In production, you might want to:
    // - Send to monitoring service (Sentry, DataDog, etc.)
    // - Send Slack notification
    // - Create incident ticket
    // - Alert on-call engineer

  } catch (error) {
    console.error('Failed to handle critical error:', error);
  }
}

async function updateErrorStats(errorReport: ErrorReport): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // Update daily stats - FIXED: Use incr method
    await cacheManager.incr(`error_stats:daily:${today}`, 'errors');
    
    // Update hourly stats
    await cacheManager.incr(`error_stats:hourly:${today}:${hour}`, 'errors');

    // Update stats by error type
    const errorType = errorReport.message.split(':')[0] || 'unknown';
    await cacheManager.incr(`error_stats:type:${errorType}:${today}`, 'errors');

    // Update user-specific stats if user is known
    if (errorReport.userId) {
      await cacheManager.incr(`error_stats:user:${errorReport.userId}:${today}`, 'errors');
    }

  } catch (error) {
    console.error('Failed to update error stats:', error);
  }
}

async function checkErrorPatterns(errorReport: ErrorReport): Promise<void> {
  try {
    const errorType = errorReport.message.split(':')[0] || 'unknown';
    const timeWindow = 5 * 60; // 5 minutes
    const threshold = 10; // 10 errors in 5 minutes

    // Check for error spike
    const recentCount = await cacheManager.get<number>(
      `error_pattern:${errorType}:recent`,
      'errors'
    ) || 0;

    if (recentCount >= threshold) {
      console.warn(`🚨 Error spike detected for ${errorType}: ${recentCount} errors in ${timeWindow/60} minutes`);
      
      // Store alert
      await cacheManager.set(
        `error_alert:spike:${errorType}:${Date.now()}`,
        {
          errorType,
          count: recentCount,
          threshold,
          timeWindow,
          firstSeen: errorReport.timestamp,
        },
        3600, // 1 hour
        'errors'
      );
    }

    // Increment and set TTL for pattern detection - FIXED: Use incr method
    await cacheManager.incr(`error_pattern:${errorType}:recent`, 'errors');
    
    // Set TTL if this is the first error in the window
    if (recentCount === 0) {
      await cacheManager.setWithExpiry(
        `error_pattern:${errorType}:recent`,
        1,
        timeWindow,
        'errors'
      );
    }

  } catch (error) {
    console.error('Failed to check error patterns:', error);
  }
}

// ========================================
// API ROUTE HANDLER
// ========================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply rate limiting
    const rateLimitResult = await apiRateLimiter.checkLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many error reports' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = errorReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid error report format',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const errorReport = validation.data;

    // Store the error report
    const stored = await storeErrorReport(errorReport);
    if (!stored) {
      return NextResponse.json(
        { error: 'Failed to store error report' },
        { status: 500 }
      );
    }

    // Process the error report asynchronously
    processErrorReport(errorReport).catch(error => {
      console.error('Background error processing failed:', error);
    });

    return NextResponse.json(
      { 
        success: true,
        errorId: errorReport.errorId,
        message: 'Error report received and stored',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error report API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process error report',
      },
      { status: 500 }
    );
  }
}

// ========================================
// GET ENDPOINT FOR ERROR STATS (Admin only)
// ========================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Add admin authentication check
    // const user = await EnhancedAuth.getUserFromRequest(request);
    // if (!user || user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    let stats: Record<string, any> = {};

    if (type === 'daily') {
      const dailyCount = await cacheManager.get<number>(`error_stats:daily:${date}`, 'errors') || 0;
      stats = { date, count: dailyCount };
    } else if (type === 'hourly') {
      const hourlyStats: Record<string, number> = {};
      for (let hour = 0; hour < 24; hour++) {
        const count = await cacheManager.get<number>(`error_stats:hourly:${date}:${hour}`, 'errors') || 0;
        hourlyStats[hour.toString()] = count;
      }
      stats = { date, hourly: hourlyStats };
    } else if (type === 'critical') {
      // Get critical errors from cache
      const criticalErrors: any[] = [];
      
      try {
        // This is a simplified implementation
        // In a real scenario, you'd query the database with proper filtering
        const { data, error } = await supabaseAdmin
          .from('error_reports')
          .select('id, error_id, message, timestamp, level, resolved')
          .eq('level', 'error')
          .eq('resolved', false)
          .order('timestamp', { ascending: false })
          .limit(10);

        if (!error && data) {
          criticalErrors.push(...data);
        }
      } catch (dbError) {
        console.error('Failed to fetch critical errors from DB:', dbError);
      }

      stats = { 
        critical_errors: criticalErrors,
        count: criticalErrors.length 
      };
    } else if (type === 'patterns') {
      // Get error patterns and alerts
      const patterns: any[] = [];
      
      // This would require more sophisticated pattern detection
      // For now, return a placeholder
      stats = {
        patterns,
        alerts: [],
        message: 'Pattern detection data'
      };
    }

    return NextResponse.json({
      success: true,
      type,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error stats API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve error stats' },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE ENDPOINT FOR CLEANUP (Admin only)
// ========================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Add admin authentication check
    // const user = await EnhancedAuth.getUserFromRequest(request);
    // if (!user || user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const days = parseInt(searchParams.get('days') || '30');

    let result: any = {};

    if (action === 'cleanup') {
      // Clean up old error reports
      const cleanedCount = await cleanupOldErrorReports(days);
      result = {
        action: 'cleanup',
        cleaned_count: cleanedCount,
        days_kept: days
      };
    } else if (action === 'resolve') {
      // Mark errors as resolved
      const errorId = searchParams.get('errorId');
      
      if (errorId) {
        const { error } = await supabaseAdmin
          .from('error_reports')
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            // resolved_by would be set to current user in real implementation
          })
          .eq('error_id', errorId);

        if (error) {
          return NextResponse.json(
            { error: 'Failed to resolve error' },
            { status: 500 }
          );
        }

        result = {
          action: 'resolve',
          error_id: errorId,
          resolved: true
        };
      } else {
        return NextResponse.json(
          { error: 'Error ID required for resolve action' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: cleanup, resolve' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error cleanup API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to perform cleanup action' },
      { status: 500 }
    );
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Clean up old error reports (call this periodically)
export async function cleanupOldErrorReports(daysToKeep: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // FIXED: Use correct table name with enhanced types
    const { data, error } = await supabaseAdmin
      .from('error_reports')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
      .select('error_id');

    if (error) {
      console.error('Error cleanup failed:', error);
      return 0;
    }

    const cleanedCount = data?.length || 0;
    console.log(`🧹 Cleaned up ${cleanedCount} old error reports`);
    
    // Also clean up related cache entries
    if (data && cleanedCount > 0) {
      for (const report of data) {
        await cacheManager.del(`error:${report.error_id}`, 'errors');
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleanup failed:', error);
    return 0;
  }
}

// Get error statistics from database
export async function getErrorStatistics(
  startDate?: string, 
  endDate?: string
): Promise<any> {
  try {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('error_reports')
      .select('level, timestamp, resolved')
      .gte('timestamp', start)
      .lte('timestamp', end);

    if (error) {
      console.error('Failed to fetch error statistics:', error);
      return null;
    }

    // Process statistics
    const stats = {
      total: data?.length || 0,
      by_level: {} as Record<string, number>,
      resolved: 0,
      unresolved: 0,
      by_date: {} as Record<string, number>,
    };

    data?.forEach(report => {
      // Count by level
      stats.by_level[report.level] = (stats.by_level[report.level] || 0) + 1;
      
      // Count resolved/unresolved
      if (report.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
      
      // Count by date
      const date = report.timestamp.split('T')[0];
      stats.by_date[date] = (stats.by_date[date] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error statistics query failed:', error);
    return null;
  }
}

// Export helper functions for use in other modules
export {
  processErrorReport,
  classifyErrorSeverity,
  handleCriticalError,
  updateErrorStats,
  checkErrorPatterns,
};