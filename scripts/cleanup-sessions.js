#!/usr/bin/env node

/**
 * Session Cleanup Script
 * Cleans up expired sessions and tokens
 * Run: node scripts/cleanup-sessions.js
 */

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('ioredis');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
let redis = null;

// Initialize Redis if available
if (redisUrl) {
  try {
    redis = new Redis(redisUrl);
    console.log('✅ Redis connected for cleanup');
  } catch (error) {
    console.warn('⚠️ Redis not available, skipping cache cleanup');
  }
}

async function cleanupExpiredSessions() {
  console.log('🧹 Starting session cleanup...');
  
  try {
    // Clean up expired sessions from database
    const { data, error } = await supabase
      .from('user_sessions')
      .delete()
      .or('expires_at.lt.now(),is_active.eq.false')
      .select('id');

    if (error) {
      throw error;
    }

    const cleanedCount = data?.length || 0;
    console.log(`✅ Cleaned ${cleanedCount} expired sessions from database`);

    // Clean up session cache if Redis is available
    if (redis) {
      let cacheCleanedCount = 0;
      
      try {
        // Get all session keys
        const sessionKeys = await redis.keys('ai-chatbot:auth:session:*');
        
        if (sessionKeys.length > 0) {
          // Check each session and remove if expired
          for (const key of sessionKeys) {
            const ttl = await redis.ttl(key);
            if (ttl === -2 || ttl === 0) { // Expired or doesn't exist
              await redis.del(key);
              cacheCleanedCount++;
            }
          }
        }
        
        console.log(`✅ Cleaned ${cacheCleanedCount} expired sessions from cache`);
      } catch (cacheError) {
        console.warn('⚠️ Cache cleanup failed:', cacheError.message);
      }
    }

    return { database: cleanedCount, cache: redis ? cacheCleanedCount : 0 };
    
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
    throw error;
  }
}

async function cleanupBlacklistedTokens() {
  console.log('🧹 Starting blacklisted token cleanup...');
  
  if (!redis) {
    console.log('⚠️ Redis not available, skipping token cleanup');
    return 0;
  }

  try {
    let cleanedCount = 0;
    
    // Get all blacklisted token keys
    const tokenKeys = await redis.keys('ai-chatbot:auth:blacklist:*');
    
    if (tokenKeys.length > 0) {
      // Remove expired blacklisted tokens
      for (const key of tokenKeys) {
        const ttl = await redis.ttl(key);
        if (ttl === -2 || ttl === 0) { // Expired
          await redis.del(key);
          cleanedCount++;
        }
      }
    }
    
    console.log(`✅ Cleaned ${cleanedCount} expired blacklisted tokens`);
    return cleanedCount;
    
  } catch (error) {
    console.error('❌ Token cleanup failed:', error);
    throw error;
  }
}

async function cleanupRateLimitData() {
  console.log('🧹 Starting rate limit data cleanup...');
  
  if (!redis) {
    console.log('⚠️ Redis not available, skipping rate limit cleanup');
    return 0;
  }

  try {
    let cleanedCount = 0;
    
    // Get all rate limit keys
    const rateLimitKeys = await redis.keys('ai-chatbot:rate_limit:*');
    
    if (rateLimitKeys.length > 0) {
      // Remove expired rate limit entries
      for (const key of rateLimitKeys) {
        const ttl = await redis.ttl(key);
        if (ttl === -2 || ttl === 0) { // Expired
          await redis.del(key);
          cleanedCount++;
        }
      }
    }
    
    console.log(`✅ Cleaned ${cleanedCount} expired rate limit entries`);
    return cleanedCount;
    
  } catch (error) {
    console.error('❌ Rate limit cleanup failed:', error);
    throw error;
  }
}

async function generateCleanupReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    sessionsCleaned: results.sessions,
    tokensCleaned: results.tokens,
    rateLimitsCleaned: results.rateLimit,
    totalCleaned: results.sessions.database + results.sessions.cache + results.tokens + results.rateLimit,
  };

  console.log('\n📊 Cleanup Report:');
  console.log('==================');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Database sessions cleaned: ${report.sessionsCleaned.database}`);
  console.log(`Cache sessions cleaned: ${report.sessionsCleaned.cache}`);
  console.log(`Blacklisted tokens cleaned: ${report.tokensCleaned}`);
  console.log(`Rate limit entries cleaned: ${report.rateLimitsCleaned}`);
  console.log(`Total items cleaned: ${report.totalCleaned}`);
  console.log('==================\n');

  // Optionally store cleanup report
  try {
    const { error } = await supabase
      .from('system_health')
      .insert({
        component: 'cleanup',
        status: 'healthy',
        details: report,
      });

    if (!error) {
      console.log('✅ Cleanup report stored in database');
    }
  } catch (error) {
    console.warn('⚠️ Failed to store cleanup report:', error.message);
  }

  return report;
}

async function main() {
  console.log('🚀 Starting maintenance cleanup...\n');
  
  try {
    const results = {
      sessions: await cleanupExpiredSessions(),
      tokens: await cleanupBlacklistedTokens(),
      rateLimit: await cleanupRateLimitData(),
    };

    await generateCleanupReport(results);
    
    console.log('✅ Maintenance cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Maintenance cleanup failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (redis) {
      redis.disconnect();
    }
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  cleanupExpiredSessions,
  cleanupBlacklistedTokens,
  cleanupRateLimitData,
  generateCleanupReport,
};

