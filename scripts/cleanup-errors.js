#!/usr/bin/env node

/**
 * Error Reports Cleanup Script
 * Cleans up old error reports and generates statistics
 * Run: node scripts/cleanup-errors.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupOldErrorReports(daysToKeep = 30) {
  console.log(`🧹 Cleaning up error reports older than ${daysToKeep} days...`);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('error_reports')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id, level');

    if (error) {
      throw error;
    }

    const cleanedCount = data?.length || 0;
    const levelCounts = data?.reduce((acc, report) => {
      acc[report.level] = (acc[report.level] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log(`✅ Cleaned ${cleanedCount} old error reports`);
    console.log('   Breakdown by level:', levelCounts);
    
    return { total: cleanedCount, byLevel: levelCounts };
    
  } catch (error) {
    console.error('❌ Error report cleanup failed:', error);
    throw error;
  }
}

async function generateErrorStatistics() {
  console.log('📊 Generating error statistics...');
  
  try {
    // Get error counts by level for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentErrors, error: recentError } = await supabase
      .from('error_reports')
      .select('level, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentError) {
      throw recentError;
    }

    // Get unresolved critical errors
    const { data: criticalErrors, error: criticalError } = await supabase
      .from('error_reports')
      .select('id, message, created_at, user_id')
      .eq('level', 'error')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (criticalError) {
      throw criticalError;
    }

    // Generate statistics
    const stats = {
      last7Days: {
        total: recentErrors?.length || 0,
        byLevel: recentErrors?.reduce((acc, error) => {
          acc[error.level] = (acc[error.level] || 0) + 1;
          return acc;
        }, {}) || {},
      },
      unresolved: {
        critical: criticalErrors?.length || 0,
        examples: criticalErrors?.slice(0, 5).map(err => ({
          id: err.id,
          message: err.message.substring(0, 100) + '...',
          createdAt: err.created_at,
          hasUser: !!err.user_id,
        })) || [],
      },
    };

    console.log('📈 Error Statistics:');
    console.log(`   Last 7 days: ${stats.last7Days.total} total errors`);
    console.log('   By level:', stats.last7Days.byLevel);
    console.log(`   Unresolved critical: ${stats.unresolved.critical}`);
    
    if (stats.unresolved.critical > 0) {
      console.log('\n🚨 Recent critical errors:');
      stats.unresolved.examples.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.message} (${error.createdAt})`);
      });
    }

    return stats;
    
  } catch (error) {
    console.error('❌ Error statistics generation failed:', error);
    throw error;
  }
}

async function archiveResolvedErrors() {
  console.log('📦 Archiving resolved errors...');
  
  try {
    // Move resolved errors older than 7 days to archive (or just mark them)
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - 7);

    const { data, error } = await supabase
      .from('error_reports')
      .update({ extra: { archived: true, archived_at: new Date().toISOString() } })
      .eq('resolved', true)
      .lt('resolved_at', archiveDate.toISOString())
      .is('extra->>archived', null)
      .select('id');

    if (error) {
      throw error;
    }

    const archivedCount = data?.length || 0;
    console.log(`✅ Archived ${archivedCount} resolved errors`);
    
    return archivedCount;
    
  } catch (error) {
    console.error('❌ Error archiving failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting error cleanup and analysis...\n');
  
  try {
    const daysToKeep = process.argv[2] ? parseInt(process.argv[2]) : 30;
    
    const results = {
      cleaned: await cleanupOldErrorReports(daysToKeep),
      stats: await generateErrorStatistics(),
      archived: await archiveResolvedErrors(),
    };

    // Generate summary report
    console.log('\n📋 Error Cleanup Summary:');
    console.log('========================');
    console.log(`Cleaned: ${results.cleaned.total} old reports`);
    console.log(`Archived: ${results.archived} resolved reports`);
    console.log(`Recent errors (7 days): ${results.stats.last7Days.total}`);
    console.log(`Unresolved critical: ${results.stats.unresolved.critical}`);
    
    if (results.stats.unresolved.critical > 5) {
      console.log('\n⚠️ WARNING: High number of unresolved critical errors!');
    }
    
    console.log('========================\n');
    console.log('✅ Error cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error cleanup failed:', error);
    process.exit(1);
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
  cleanupOldErrorReports,
  generateErrorStatistics,
  archiveResolvedErrors,
};
