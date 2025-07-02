// src/lib/error-utils.ts
import { supabaseAdmin } from '@/lib/supabase-enhanced';
import { cacheManager } from '@/lib/redis';

// ========================================
// UTILITY FUNCTIONS FOR ERROR MANAGEMENT
// ========================================

/**
 * Clean up old error reports (call this periodically)
 * This function can be used by:
 * - Scheduled jobs/cron tasks
 * - Admin dashboard
 * - Background cleanup services
 */
export async function cleanupOldErrorReports(daysToKeep: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Use correct table name with enhanced types
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

/**
 * Get error statistics from database
 * Can be used for analytics and monitoring dashboards
 */
export async function getErrorStatistics(
  startDate?: string, 
  endDate?: string
): Promise<any> {
  try {
    let query = supabaseAdmin
      .from('error_reports')
      .select('*');

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching statistics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error statistics failed:', error);
    return null;
  }
}

/**
 * Get error report by ID
 */
export async function getErrorReport(errorId: string) {
  try {
    // Check cache first
    const cached = await cacheManager.get(`error:${errorId}`, 'errors');
    if (cached) {
      return cached;
    }

    // Fetch from database
    const { data, error } = await supabaseAdmin
      .from('error_reports')
      .select('*')
      .eq('error_id', errorId)
      .single();

    if (error) {
      console.error('Error fetching error report:', error);
      return null;
    }

    // Cache the result
    if (data) {
      await cacheManager.set(`error:${errorId}`, data, 3600, 'errors');
    }

    return data;
  } catch (error) {
    console.error('Error fetching error report:', error);
    return null;
  }
}

/**
 * Mark error as resolved
 */
export async function resolveError(errorId: string, resolvedBy?: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('error_reports')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy || null,
      })
      .eq('error_id', errorId);

    if (error) {
      console.error('Error resolving error report:', error);
      return false;
    }

    // Clear from cache
    await cacheManager.del(`error:${errorId}`, 'errors');

    return true;
  } catch (error) {
    console.error('Error resolving error report:', error);
    return false;
  }
}

/**
 * Get error counts by severity
 */
export async function getErrorCountsBySeverity(startDate?: string, endDate?: string) {
  try {
    let query = supabaseAdmin
      .from('error_reports')
      .select('level');

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching error counts:', error);
      return null;
    }

    // Count by severity
    const counts = data?.reduce((acc, report) => {
      acc[report.level] = (acc[report.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return counts;
  } catch (error) {
    console.error('Error fetching error counts by severity:', error);
    return null;
  }
}

/**
 * Get top error patterns
 */
export async function getTopErrorPatterns(limit: number = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('error_reports')
      .select('message')
      .order('timestamp', { ascending: false })
      .limit(1000); // Get recent 1000 errors

    if (error) {
      console.error('Error fetching error patterns:', error);
      return null;
    }

    // Group by error message pattern
    const patterns = data?.reduce((acc, report) => {
      // Extract error pattern (first part of the message)
      const pattern = report.message.split(':')[0] || 'Unknown';
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Sort by frequency and return top patterns
    return Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([pattern, count]) => ({ pattern, count }));

  } catch (error) {
    console.error('Error fetching error patterns:', error);
    return null;
  }
}

/**
 * Get error trends (daily counts for the last N days)
 */
export async function getErrorTrends(days: number = 7) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('error_reports')
      .select('timestamp')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching error trends:', error);
      return null;
    }

    // Group by date
    const trends = data?.reduce((acc, report) => {
      const date = new Date(report.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Fill in missing dates with 0
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.unshift({
        date: dateStr,
        count: trends[dateStr] || 0
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching error trends:', error);
    return null;
  }
}

/**
 * Get critical errors that need immediate attention
 */
export async function getCriticalErrors(limit: number = 50) {
  try {
    // Get from cache first
    const cached = await cacheManager.get('critical_errors', 'errors');
    if (cached) {
      return cached;
    }

    const { data, error } = await supabaseAdmin
      .from('error_reports')
      .select('*')
      .eq('resolved', false)
      .in('level', ['error'])
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching critical errors:', error);
      return null;
    }

    // Filter for critical patterns
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

    const criticalErrors = data?.filter(report => {
      const message = report.message.toLowerCase();
      const stack = report.stack?.toLowerCase() || '';
      return criticalPatterns.some(pattern => 
        message.includes(pattern) || stack.includes(pattern)
      );
    }) || [];

    // Cache for 5 minutes
    await cacheManager.set('critical_errors', criticalErrors, 300, 'errors');

    return criticalErrors;
  } catch (error) {
    console.error('Error fetching critical errors:', error);
    return null;
  }
}