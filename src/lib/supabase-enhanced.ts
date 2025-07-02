// src/lib/supabase-enhanced.ts
// Enhanced Supabase client dengan types yang lengkap

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase-enhanced';

// ========================================
// ENHANCED SUPABASE CLIENT
// ========================================

// Environment variables - STRICT validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// CRITICAL: Validate required public variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ].filter(Boolean);
  
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Detect environment
const isServer = typeof window === 'undefined';
const isBrowser = !isServer;
const isProduction = process.env.NODE_ENV === 'production';

// Enhanced Supabase client dengan types lengkap
export const supabaseEnhanced = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': `ai-chatbot-enhanced/${isServer ? 'server' : 'browser'}`,
    },
  },
});

// Enhanced Admin client
export const supabaseAdminEnhanced = createClient<Database>(
  supabaseUrl,
  isServer && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': `ai-chatbot-admin-enhanced/${isServer ? 'server' : 'browser-fallback'}`,
      },
    },
  }
);

// ========================================
// ENHANCED TYPE EXPORTS
// ========================================

// Error Reports
export type ErrorReport = Database['public']['Tables']['error_reports']['Row'];
export type ErrorReportInsert = Database['public']['Tables']['error_reports']['Insert'];
export type ErrorReportUpdate = Database['public']['Tables']['error_reports']['Update'];

// Security Events
export type SecurityEvent = Database['public']['Tables']['security_events']['Row'];
export type SecurityEventInsert = Database['public']['Tables']['security_events']['Insert'];

// Rate Limit Violations
export type RateLimitViolation = Database['public']['Tables']['rate_limit_violations']['Row'];
export type RateLimitViolationInsert = Database['public']['Tables']['rate_limit_violations']['Insert'];

// System Health
export type SystemHealth = Database['public']['Tables']['system_health']['Row'];
export type SystemHealthInsert = Database['public']['Tables']['system_health']['Insert'];

// Enhanced User Session
export type EnhancedUserSession = Database['public']['Tables']['user_sessions']['Row'];
export type EnhancedUserSessionInsert = Database['public']['Tables']['user_sessions']['Insert'];
export type EnhancedUserSessionUpdate = Database['public']['Tables']['user_sessions']['Update'];

// Re-export existing types for backward compatibility
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type FileAttachment = Database['public']['Tables']['file_attachments']['Row'];
export type FileAttachmentInsert = Database['public']['Tables']['file_attachments']['Insert'];

export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row'];
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert'];

// ========================================
// ENHANCED HELPER FUNCTIONS
// ========================================

/**
 * Store error report in database
 */
export async function storeErrorReport(errorReport: ErrorReportInsert): Promise<ErrorReport | null> {
  if (!isServer) {
    console.error('🚨 Security violation: storeErrorReport called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdminEnhanced
      .from('error_reports')
      .insert(errorReport)
      .select()
      .single();

    if (error) {
      console.error('Error storing error report:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in storeErrorReport:', error);
    return null;
  }
}

/**
 * Log security event
 */
export async function logSecurityEvent(event: SecurityEventInsert): Promise<SecurityEvent | null> {
  if (!isServer) {
    console.error('🚨 Security violation: logSecurityEvent called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdminEnhanced
      .from('security_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('Error logging security event:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in logSecurityEvent:', error);
    return null;
  }
}

/**
 * Record rate limit violation
 */
export async function recordRateLimitViolation(
  violation: RateLimitViolationInsert
): Promise<RateLimitViolation | null> {
  if (!isServer) {
    console.error('🚨 Security violation: recordRateLimitViolation called from browser');
    return null;
  }

  try {
    // Check if violation already exists for this IP/endpoint
    const { data: existing } = await supabaseAdminEnhanced
      .from('rate_limit_violations')
      .select('*')
      .eq('ip_address', violation.ip_address)
      .eq('endpoint', violation.endpoint)
      .gte('last_violation', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .single();

    if (existing) {
      // Update existing violation
      const { data, error } = await supabaseAdminEnhanced
        .from('rate_limit_violations')
        .update({
          violation_count: existing.violation_count + 1,
          last_violation: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rate limit violation:', error.message);
        return null;
      }

      return data;
    } else {
      // Create new violation record
      const { data, error } = await supabaseAdminEnhanced
        .from('rate_limit_violations')
        .insert(violation)
        .select()
        .single();

      if (error) {
        console.error('Error recording rate limit violation:', error.message);
        return null;
      }

      return data;
    }
  } catch (error) {
    console.error('Exception in recordRateLimitViolation:', error);
    return null;
  }
}

/**
 * Update system health status
 */
export async function updateSystemHealth(
  health: SystemHealthInsert
): Promise<SystemHealth | null> {
  if (!isServer) {
    console.error('🚨 Security violation: updateSystemHealth called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdminEnhanced
      .from('system_health')
      .insert(health)
      .select()
      .single();

    if (error) {
      console.error('Error updating system health:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in updateSystemHealth:', error);
    return null;
  }
}

/**
 * Enhanced session management
 */
export async function createEnhancedSession(
  session: EnhancedUserSessionInsert
): Promise<EnhancedUserSession | null> {
  if (!isServer) {
    console.error('🚨 Security violation: createEnhancedSession called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdminEnhanced
      .from('user_sessions')
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error('Error creating enhanced session:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in createEnhancedSession:', error);
    return null;
  }
}

/**
 * Get enhanced session with refresh token support
 */
export async function getEnhancedSession(sessionId: string): Promise<EnhancedUserSession | null> {
  if (!isServer) {
    console.error('🚨 Security violation: getEnhancedSession called from browser');
    return null;
  }

  try {
    const { data, error } = await supabaseAdminEnhanced
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error getting enhanced session:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getEnhancedSession:', error);
    return null;
  }
}

/**
 * Cleanup expired sessions (enhanced)
 */
export async function cleanupExpiredSessionsEnhanced(): Promise<number> {
  if (!isServer) {
    console.error('🚨 Security violation: cleanupExpiredSessionsEnhanced called from browser');
    return 0;
  }

  try {
    const { data, error } = await supabaseAdminEnhanced
      .from('user_sessions')
      .delete()
      .or('expires_at.lt.now(),is_active.eq.false')
      .select('id');

    if (error) {
      console.error('Enhanced session cleanup error:', error.message);
      return 0;
    }

    const cleanedCount = data?.length || 0;
    console.log(`🧹 Enhanced cleanup: ${cleanedCount} sessions removed`);
    
    return cleanedCount;
  } catch (error) {
    console.error('Exception in cleanupExpiredSessionsEnhanced:', error);
    return 0;
  }
}

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

// Export enhanced clients as default names for easy migration
export { supabaseEnhanced as supabase };
export { supabaseAdminEnhanced as supabaseAdmin };

// Security validation in production
if (isProduction && isBrowser && supabaseServiceKey) {
  console.error('🚨 SECURITY BREACH: Service key exposed to browser in production!');
}