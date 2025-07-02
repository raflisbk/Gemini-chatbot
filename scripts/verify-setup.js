#!/usr/bin/env node

/**
 * Enhanced Setup Verification Script
 * Verifies all new high-priority features
 * Run: node scripts/verify-setup-enhanced.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('ioredis');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Enhanced AI Chatbot Setup Verification...\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}🔧 ${msg}${colors.reset}`)
};

let hasErrors = false;
let hasWarnings = false;
let testResults = {
  files: { passed: 0, failed: 0 },
  env: { passed: 0, failed: 0 },
  deps: { passed: 0, failed: 0 },
  database: { passed: 0, failed: 0 },
  redis: { passed: 0, failed: 0 },
  security: { passed: 0, failed: 0 }
};

// ========================================
// FILE STRUCTURE VERIFICATION
// ========================================

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log.success(`${description}: ${filePath}`);
    testResults.files.passed++;
    return true;
  } else {
    log.error(`Missing ${description}: ${filePath}`);
    testResults.files.failed++;
    hasErrors = true;
    return false;
  }
}

function checkEnhancedFileStructure() {
  log.header('Checking Enhanced File Structure');
  
  const requiredFiles = [
    // Core files (existing)
    { path: 'src/lib/supabase.ts', desc: 'Supabase client' },
    { path: 'src/lib/auth.ts', desc: 'Original auth utilities' },
    { path: 'src/lib/storage.ts', desc: 'Storage utilities' },
    { path: 'src/types/supabase.ts', desc: 'Database types' },
    { path: 'middleware.ts', desc: 'Middleware' },
    
    // New enhanced files
    { path: 'src/lib/redis.ts', desc: 'Redis configuration' },
    { path: 'src/lib/authEnhanced.ts', desc: 'Enhanced authentication' },
    { path: 'src/lib/rateLimiter.ts', desc: 'Enhanced rate limiter' },
    { path: 'src/components/ErrorBoundary.tsx', desc: 'Error boundary component' },
    { path: 'src/app/api/errors/report/route.ts', desc: 'Error reporting API' },
    
    // API routes
    { path: 'src/app/api/auth/login/route.ts', desc: 'Login API' },
    { path: 'src/app/api/auth/register/route.ts', desc: 'Register API' },
    { path: 'src/app/api/auth/verify/route.ts', desc: 'Verify API' },
    { path: 'src/app/api/chat/route.ts', desc: 'Chat API' },
  ];

  requiredFiles.forEach(file => {
    checkFile(file.path, file.desc);
  });

  // Check for scripts
  const scriptFiles = [
    'scripts/cleanup-sessions.js',
    'scripts/cleanup-errors.js', 
    'scripts/test-security.js'
  ];

  scriptFiles.forEach(script => {
    if (fs.existsSync(script)) {
      log.success(`Script found: ${script}`);
      testResults.files.passed++;
    } else {
      log.warning(`Optional script missing: ${script}`);
      hasWarnings = true;
    }
  });
}

// ========================================
// ENVIRONMENT VARIABLES VERIFICATION
// ========================================

function checkEnhancedEnvVars() {
  log.header('Checking Enhanced Environment Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'JWT_SECRET',
    'GEMINI_API_KEY',
  ];

  const optionalVars = [
    'REFRESH_SECRET',
    'ACCESS_TOKEN_EXPIRY',
    'REFRESH_TOKEN_EXPIRY',
    'REDIS_URL',
    'REDIS_HOST',
    'UPSTASH_REDIS_REST_URL',
  ];

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      log.error('.env.local file not found');
      testResults.env.failed++;
      hasErrors = true;
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check required vars
    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match && match[1].trim() && !match[1].includes('your_')) {
          log.success(`${varName} is set`);
          testResults.env.passed++;
        } else {
          log.warning(`${varName} is set but might be placeholder value`);
          testResults.env.failed++;
          hasWarnings = true;
        }
      } else {
        log.error(`Missing ${varName} in .env.local`);
        testResults.env.failed++;
        hasErrors = true;
      }
    });

    // Check optional vars
    optionalVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        log.success(`Optional ${varName} is configured`);
        testResults.env.passed++;
      }
    });

    // Check Redis configuration
    const hasRedisUrl = envContent.includes('REDIS_URL=');
    const hasRedisConfig = envContent.includes('REDIS_HOST=');
    const hasUpstash = envContent.includes('UPSTASH_REDIS_REST_URL=');

    if (hasRedisUrl || hasRedisConfig || hasUpstash) {
      log.success('Redis configuration detected');
      testResults.env.passed++;
    } else {
      log.warning('No Redis configuration found - will use in-memory fallback');
      hasWarnings = true;
    }

    // Check JWT secret length
    const jwtMatch = envContent.match(/JWT_SECRET=(.+)/);
    if (jwtMatch && jwtMatch[1].length < 32) {
      log.warning('JWT_SECRET should be at least 32 characters long');
      hasWarnings = true;
    } else if (jwtMatch) {
      log.success('JWT_SECRET length is secure');
      testResults.env.passed++;
    }

  } catch (error) {
    log.error(`Error reading .env.local: ${error.message}`);
    testResults.env.failed++;
    hasErrors = true;
  }
}

function validateEnvironmentValues() {
  const validations = [
    {
      key: 'JWT_SECRET',
      validate: (value) => value && value.length >= 32,
      message: 'JWT_SECRET must be at least 32 characters long'
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      validate: (value) => value && value.startsWith('https://'),
      message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL'
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      validate: (value) => value && value.startsWith('eyJ'),
      message: 'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token'
    },
    {
      key: 'GEMINI_API_KEY',
      validate: (value) => value && value.length > 20,
      message: 'GEMINI_API_KEY appears to be invalid'
    }
  ];

  validations.forEach(validation => {
    const value = process.env[validation.key];
    if (!validation.validate(value)) {
      log.warning(`${validation.key}: ${validation.message}`);
      hasWarnings = true;
    }
  });
}

// ========================================
// DEPENDENCIES VERIFICATION
// ========================================

function checkEnhancedDependencies() {
  log.header('Checking Enhanced Dependencies');
  
  const requiredDeps = [
    '@supabase/supabase-js',
    '@vercel/blob',
    'bcryptjs',
    'jsonwebtoken', 
    'zod',
    'jose',
    'crypto-js',
    'ioredis',
  ];

  const requiredDevDeps = [
    '@types/ioredis',
    '@types/bcryptjs',
    '@types/jsonwebtoken',
  ];

  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = { ...packageContent.dependencies, ...packageContent.devDependencies };

    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        log.success(`${dep}: ${allDeps[dep]}`);
        testResults.deps.passed++;
      } else {
        log.error(`Missing dependency: ${dep}`);
        testResults.deps.failed++;
        hasErrors = true;
      }
    });

    requiredDevDeps.forEach(dep => {
      if (allDeps[dep]) {
        log.success(`Dev dependency ${dep}: ${allDeps[dep]}`);
        testResults.deps.passed++;
      } else {
        log.warning(`Missing dev dependency: ${dep}`);
        hasWarnings = true;
      }
    });

    // Check if scripts are added
    const scripts = packageContent.scripts || {};
    const recommendedScripts = [
      'cleanup-sessions', 
      'cleanup-errors',
      'test:security'
    ];

    recommendedScripts.forEach(script => {
      if (scripts[script]) {
        log.success(`Script '${script}' is configured`);
        testResults.deps.passed++;
      } else {
        log.warning(`Recommended script missing: ${script}`);
        hasWarnings = true;
      }
    });

  } catch (error) {
    log.error(`Error reading package.json: ${error.message}`);
    testResults.deps.failed++;
    hasErrors = true;
  }
}

// ========================================
// DATABASE VERIFICATION
// ========================================

async function checkDatabaseSchema() {
  log.header('Checking Database Schema');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing Supabase credentials for database check');
    testResults.database.failed++;
    hasErrors = true;
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing tables
    const existingTables = [
      'users',
      'chat_sessions', 
      'messages',
      'file_attachments',
      'user_sessions',
      'usage_tracking'
    ];

    // Check new tables from migration
    const newTables = [
      'error_reports',
      'rate_limit_violations',
      'security_events',
      'system_health'
    ];

    log.info('Testing existing tables...');
    for (const table of existingTables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
          log.success(`Table '${table}' exists and accessible`);
          testResults.database.passed++;
        } else {
          log.error(`Table '${table}' issue: ${error.message}`);
          testResults.database.failed++;
          hasErrors = true;
        }
      } catch (err) {
        log.error(`Table '${table}' check failed: ${err.message}`);
        testResults.database.failed++;
        hasErrors = true;
      }
    }

    log.info('Testing new enhanced tables...');
    for (const table of newTables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
          log.success(`Enhanced table '${table}' exists`);
          testResults.database.passed++;
        } else {
          log.warning(`Enhanced table '${table}' not found - run database migration`);
          hasWarnings = true;
        }
      } catch (err) {
        log.warning(`Enhanced table '${table}' not accessible - migration needed`);
        hasWarnings = true;
      }
    }

    // Check if user_sessions has enhanced columns
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('refresh_token_hash, is_active')
        .limit(1);
        
      if (!error) {
        log.success('user_sessions table has enhanced auth columns');
        testResults.database.passed++;
      } else {
        log.warning('user_sessions table needs migration for enhanced auth');
        hasWarnings = true;
      }
    } catch (err) {
      log.warning('Could not verify user_sessions enhancements');
      hasWarnings = true;
    }

  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    testResults.database.failed++;
    hasErrors = true;
  }
}

// ========================================
// REDIS VERIFICATION
// ========================================

async function checkRedisConnection() {
  log.header('Checking Redis Connection');
  
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;
  const redisPassword = process.env.REDIS_PASSWORD;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl && !redisHost) {
    log.warning('No Redis configuration found - will use in-memory fallback');
    log.info('This is okay for development, but Redis is recommended for production');
    return;
  }

  let redis;
  try {
    if (redisUrl) {
      const connectionOptions = {};
      if (upstashToken) {
        connectionOptions.password = upstashToken;
      }
      
      redis = new Redis(redisUrl, {
        ...connectionOptions,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      
      log.info(`Attempting Redis connection via URL...`);
    } else if (redisHost) {
      redis = new Redis({
        host: redisHost,
        port: parseInt(redisPort || '6379'),
        password: redisPassword,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      
      log.info(`Attempting Redis connection to ${redisHost}:${redisPort || 6379}...`);
    }

    // Test connection
    await redis.ping();
    log.success('Redis connection successful');
    testResults.redis.passed++;

    // Test basic operations
    const testKey = 'test:verification:' + Date.now();
    await redis.set(testKey, 'test-value', 'EX', 10);
    const value = await redis.get(testKey);
    
    if (value === 'test-value') {
      log.success('Redis read/write operations working');
      testResults.redis.passed++;
    } else {
      log.error('Redis read/write test failed');
      testResults.redis.failed++;
      hasErrors = true;
    }

    // Test TTL functionality
    const ttl = await redis.ttl(testKey);
    if (ttl > 0 && ttl <= 10) {
      log.success('Redis TTL (expiration) working correctly');
      testResults.redis.passed++;
    } else {
      log.warning('Redis TTL functionality issue');
      hasWarnings = true;
    }

    // Cleanup test key
    await redis.del(testKey);
    log.info('Redis test cleanup completed');
    
  } catch (error) {
    log.error(`Redis connection failed: ${error.message}`);
    log.warning('Application will use in-memory fallback for caching');
    testResults.redis.failed++;
    hasWarnings = true;
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }
}

// ========================================
// SECURITY VERIFICATION
// ========================================

function checkSecurityConfiguration() {
  log.header('Checking Security Configuration');
  
  try {
    // Check middleware file for enhanced security
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      
      const securityFeatures = [
        { pattern: /addSecurityHeaders/, name: 'Security headers function' },
        { pattern: /rateLimiter|rateLimit/, name: 'Rate limiting' },
        { pattern: /Content-Security-Policy/, name: 'CSP headers' },
        { pattern: /X-Frame-Options/, name: 'Frame protection' },
        { pattern: /CORS|cors/, name: 'CORS handling' },
        { pattern: /X-XSS-Protection/, name: 'XSS protection' },
      ];

      securityFeatures.forEach(feature => {
        if (feature.pattern.test(middlewareContent)) {
          log.success(`${feature.name} configured in middleware`);
          testResults.security.passed++;
        } else {
          log.warning(`${feature.name} not found in middleware`);
          hasWarnings = true;
        }
      });
      
    } else {
      log.error('Middleware file not found');
      testResults.security.failed++;
      hasErrors = true;
    }

    // Check if ErrorBoundary is implemented
    const errorBoundaryPath = path.join(process.cwd(), 'src/components/ErrorBoundary.tsx');
    if (fs.existsSync(errorBoundaryPath)) {
      const errorBoundaryContent = fs.readFileSync(errorBoundaryPath, 'utf8');
      if (errorBoundaryContent.includes('componentDidCatch') && errorBoundaryContent.includes('ErrorLogger')) {
        log.success('ErrorBoundary component with enhanced logging');
        testResults.security.passed++;
      } else {
        log.warning('ErrorBoundary exists but may be basic implementation');
        hasWarnings = true;
      }
    } else {
      log.warning('ErrorBoundary component not found');
      hasWarnings = true;
    }

    // Check auth enhancement
    const authEnhancedPath = path.join(process.cwd(), 'src/lib/authEnhanced.ts');
    if (fs.existsSync(authEnhancedPath)) {
      const authContent = fs.readFileSync(authEnhancedPath, 'utf8');
      
      const authFeatures = [
        'refreshToken',
        'TokenManager',
        'SessionManager',
        'blacklistToken'
      ];

      const foundFeatures = authFeatures.filter(feature => authContent.includes(feature));
      
      if (foundFeatures.length >= 3) {
        log.success(`Enhanced authentication with ${foundFeatures.length}/4 features`);
        testResults.security.passed++;
      } else {
        log.warning(`Enhanced auth incomplete (${foundFeatures.length}/4 features)`);
        hasWarnings = true;
      }
    } else {
      log.warning('Enhanced authentication not implemented');
      hasWarnings = true;
    }

    // Check rate limiter implementation
    const rateLimiterPath = path.join(process.cwd(), 'src/lib/rateLimiter.ts');
    if (fs.existsSync(rateLimiterPath)) {
      const rateLimiterContent = fs.readFileSync(rateLimiterPath, 'utf8');
      
      if (rateLimiterContent.includes('SlidingWindowRateLimiter')) {
        log.success('Advanced sliding window rate limiting implemented');
        testResults.security.passed++;
      } else if (rateLimiterContent.includes('RateLimiter')) {
        log.success('Basic rate limiting implemented');
        testResults.security.passed++;
      } else {
        log.warning('Rate limiter file exists but implementation unclear');
        hasWarnings = true;
      }
    } else {
      log.warning('Enhanced rate limiter not found');
      hasWarnings = true;
    }

  } catch (error) {
    log.error(`Security configuration check failed: ${error.message}`);
    testResults.security.failed++;
    hasErrors = true;
  }
}

function checkPerformanceOptimizations() {
  log.header('Checking Performance Optimizations');
  
  try {
    // Check if Redis caching is configured
    const redisPath = path.join(process.cwd(), 'src/lib/redis.ts');
    if (fs.existsSync(redisPath)) {
      const redisContent = fs.readFileSync(redisPath, 'utf8');
      
      const cacheFeatures = [
        'CacheManager',
        'MemoryStore',
        'RedisCache',
        'fallback'
      ];

      const foundFeatures = cacheFeatures.filter(feature => redisContent.includes(feature));
      
      if (foundFeatures.length >= 3) {
        log.success(`Caching system with ${foundFeatures.length}/4 features implemented`);
        testResults.redis.passed++;
      } else {
        log.warning(`Caching system incomplete (${foundFeatures.length}/4 features)`);
        hasWarnings = true;
      }
    }

    // Check Next.js configuration optimizations
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
      
      if (nextConfigContent.includes('headers()') || nextConfigContent.includes('async headers')) {
        log.success('Next.js security headers configured');
        testResults.security.passed++;
      } else {
        log.warning('Consider adding security headers in next.config.js');
        hasWarnings = true;
      }

      if (nextConfigContent.includes('images')) {
        log.success('Next.js image optimization configured');
        testResults.security.passed++;
      }
    }

  } catch (error) {
    log.error(`Performance check failed: ${error.message}`);
    hasWarnings = true;
  }
}

function checkCodeQuality() {
  log.header('Checking Code Quality');
  
  try {
    // Check if TypeScript strict mode is enabled
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      if (tsconfig.compilerOptions?.strict) {
        log.success('TypeScript strict mode enabled');
        testResults.security.passed++;
      } else {
        log.warning('Consider enabling TypeScript strict mode');
        hasWarnings = true;
      }
    }

    // Check if ESLint is configured
    const eslintPath = path.join(process.cwd(), '.eslintrc.json');
    if (fs.existsSync(eslintPath)) {
      log.success('ESLint configuration found');
      testResults.security.passed++;
    } else {
      log.warning('ESLint configuration not found');
      hasWarnings = true;
    }

    // Check for proper error handling in API routes
    const apiRoutesPath = path.join(process.cwd(), 'src/app/api');
    if (fs.existsSync(apiRoutesPath)) {
      const routeFiles = [];
      
      function scanDirectory(dir) {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            scanDirectory(fullPath);
          } else if (item === 'route.ts') {
            routeFiles.push(fullPath);
          }
        });
      }
      
      scanDirectory(apiRoutesPath);
      
      if (routeFiles.length > 0) {
        log.success(`Found ${routeFiles.length} API route files`);
        testResults.security.passed++;
      }
    }

  } catch (error) {
    log.warning(`Code quality check failed: ${error.message}`);
    hasWarnings = true;
  }
}

function checkProductionReadiness() {
  log.header('Checking Production Readiness');
  
  try {
    // Check if HTTPS is configured for production
    const nodeEnv = process.env.NODE_ENV;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (nodeEnv === 'production') {
      if (appUrl && appUrl.startsWith('https://')) {
        log.success('HTTPS configured for production');
        testResults.security.passed++;
      } else {
        log.error('HTTPS should be enforced in production');
        testResults.security.failed++;
        hasErrors = true;
      }
    } else {
      log.info('Development environment detected');
      if (appUrl && appUrl.startsWith('http://localhost')) {
        log.success('Development URL configured correctly');
        testResults.security.passed++;
      }
    }

    // Check for sensitive data exposure
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const protectedFiles = ['.env.local', '.env', 'verification-report.json'];
      
      const missingProtections = protectedFiles.filter(file => !gitignoreContent.includes(file));
      
      if (missingProtections.length === 0) {
        log.success('Environment files properly ignored in Git');
        testResults.security.passed++;
      } else {
        log.error(`Files should be in .gitignore: ${missingProtections.join(', ')}`);
        testResults.security.failed++;
        hasErrors = true;
      }
    } else {
      log.warning('.gitignore file not found');
      hasWarnings = true;
    }

  } catch (error) {
    log.warning(`Production readiness check failed: ${error.message}`);
    hasWarnings = true;
  }
}

// ========================================
// REPORT GENERATION
// ========================================

function generateDetailedReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENHANCED SETUP VERIFICATION REPORT');
  console.log('='.repeat(60));

  const categories = [
    { name: 'File Structure', results: testResults.files },
    { name: 'Environment Variables', results: testResults.env },
    { name: 'Dependencies', results: testResults.deps },
    { name: 'Database Schema', results: testResults.database },
    { name: 'Redis Connection', results: testResults.redis },
    { name: 'Security Features', results: testResults.security },
  ];

  categories.forEach(category => {
    const total = category.results.passed + category.results.failed;
    const score = total > 0 ? Math.round((category.results.passed / total) * 100) : 0;
    let status = '❌';
    
    if (score === 100) {
      status = '✅';
    } else if (score >= 80) {
      status = '⚠️';
    } else if (score >= 60) {
      status = '⚠️';
    }
    
    console.log(`\n${status} ${category.name}: ${score}% (${category.results.passed}/${total})`);
    
    if (category.results.failed > 0) {
      console.log(`   Failed tests: ${category.results.failed}`);
    }
  });

  // Overall score
  const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
  const totalTests = Object.values(testResults).reduce((sum, cat) => sum + cat.passed + cat.failed, 0);
  const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  console.log('\n' + '-'.repeat(60));
  console.log(`🎯 OVERALL SCORE: ${overallScore}% (${totalPassed}/${totalTests} tests passed)`);
  console.log('-'.repeat(60));

  // Status determination
  if (hasErrors) {
    console.log('\n❌ SETUP HAS CRITICAL ERRORS');
    console.log('🔧 Next steps:');
    console.log('1. Fix all failed tests above');
    console.log('2. Run database migration if needed');
    console.log('3. Install missing dependencies');
    console.log('4. Re-run this verification script');
    return false;
  } else if (hasWarnings) {
    console.log('\n⚠️ SETUP IS MOSTLY COMPLETE');
    console.log('✅ You can proceed but consider fixing warnings for optimal performance');
    console.log('💡 Redis setup recommended for production scaling');
    return true;
  } else {
    console.log('\n🎉 ENHANCED SETUP VERIFICATION PASSED!');
    console.log('✅ All high-priority features are properly configured');
    console.log('🚀 Ready for production deployment');
    return true;
  }
}

function displayQuickHealthCheck() {
  console.log('\n🏥 QUICK HEALTH CHECK');
  console.log('====================');
  
  const healthItems = [
    {
      check: () => process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
      message: 'JWT Secret is secure (32+ chars)',
      critical: true
    },
    {
      check: () => process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
      message: 'Supabase credentials configured',
      critical: true
    },
    {
      check: () => process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20,
      message: 'Gemini API key configured',
      critical: true
    },
    {
      check: () => process.env.BLOB_READ_WRITE_TOKEN,
      message: 'File storage configured',
      critical: false
    },
    {
      check: () => process.env.REDIS_URL || process.env.REDIS_HOST || process.env.UPSTASH_REDIS_REST_URL,
      message: 'Redis configured (recommended)',
      critical: false
    },
    {
      check: () => fs.existsSync(path.join(process.cwd(), 'src/lib/redis.ts')),
      message: 'Enhanced caching system',
      critical: false
    },
    {
      check: () => fs.existsSync(path.join(process.cwd(), 'src/components/ErrorBoundary.tsx')),
      message: 'Error boundary implemented',
      critical: false
    },
    {
      check: () => fs.existsSync(path.join(process.cwd(), 'src/lib/authEnhanced.ts')),
      message: 'Enhanced authentication',
      critical: false
    }
  ];

  let criticalPassed = 0;
  let criticalTotal = 0;
  let totalPassed = 0;

  healthItems.forEach(item => {
    const passed = item.check();
    const icon = passed ? '✅' : (item.critical ? '❌' : '⚠️');
    console.log(`${icon} ${item.message}`);
    
    if (passed) totalPassed++;
    if (item.critical) {
      criticalTotal++;
      if (passed) criticalPassed++;
    }
  });

  console.log(`\n📊 Health Score: ${totalPassed}/${healthItems.length} checks passed`);
  console.log(`🚨 Critical: ${criticalPassed}/${criticalTotal} passed`);
  
  if (criticalPassed < criticalTotal) {
    console.log('⚠️ Fix critical issues before deploying to production!');
  } else {
    console.log('✅ All critical components are healthy!');
  }
}

function displayInstructions() {
  console.log('\n📖 SETUP INSTRUCTIONS');
  console.log('=====================');
  
  if (hasErrors || testResults.database.failed > 0) {
    console.log('\n🔧 REQUIRED FIXES:');
    console.log('------------------');
    
    if (testResults.env.failed > 0) {
      console.log('1. Fix environment variables:');
      console.log('   - Copy .env.example to .env.local');
      console.log('   - Fill in all required values');
      console.log('   - Ensure JWT_SECRET is 32+ characters');
      console.log('   - Add Redis configuration for production');
    }
    
    if (testResults.database.failed > 0) {
      console.log('2. Run database migration:');
      console.log('   - Open Supabase SQL Editor');
      console.log('   - Copy and run the enhanced migration SQL');
      console.log('   - Verify new tables (error_reports, etc.) are created');
      console.log('   - Check user_sessions table has new columns');
    }
    
    if (testResults.deps.failed > 0) {
      console.log('3. Install missing dependencies:');
      console.log('   npm install ioredis');
      console.log('   npm install --save-dev @types/ioredis');
      console.log('   npm install');
    }

    if (testResults.files.failed > 0) {
      console.log('4. Add missing files:');
      console.log('   - Create enhanced files in src/lib/');
      console.log('   - Add ErrorBoundary component');
      console.log('   - Update middleware.ts');
      console.log('   - Add API routes for error reporting');
    }
  }
  
  if (!hasErrors) {
    console.log('\n🚀 DEPLOYMENT READY CHECKLIST:');
    console.log('------------------------------');
    console.log('✅ 1. Environment variables configured');
    console.log('✅ 2. Database schema updated');
    console.log('✅ 3. Dependencies installed');
    console.log('✅ 4. Security features implemented');
    
    if (testResults.redis.passed > 0) {
      console.log('✅ 5. Redis caching enabled');
    } else {
      console.log('⚠️ 5. Redis recommended for production scaling');
    }
    
    console.log('\n🧪 TESTING COMMANDS:');
    console.log('-------------------');
    console.log('npm run test:security    # Test security features');
    console.log('npm run cleanup-sessions # Clean expired data');
    console.log('npm run cleanup-errors   # Clean old error reports');
    console.log('npm run dev             # Start development server');
    console.log('npm run build           # Test production build');
  }
}

function printNextSteps() {
  console.log('\n📝 RECOMMENDED NEXT STEPS:');
  console.log('==========================');

  if (testResults.database.failed > 0 || hasErrors) {
    console.log('1. 🗄️ Database Migration (CRITICAL):');
    console.log('   - Go to Supabase Dashboard > SQL Editor');
    console.log('   - Run the enhanced migration script');
    console.log('   - Verify all tables are created');
  }

  if (testResults.redis.failed > 0 || testResults.redis.passed === 0) {
    console.log('2. 🔗 Redis Setup (RECOMMENDED):');
    console.log('   Local Development:');
    console.log('   - Install Redis: brew install redis (Mac) or apt install redis (Ubuntu)');
    console.log('   - Start Redis: redis-server');
    console.log('   - Add REDIS_URL=redis://localhost:6379 to .env.local');
    console.log('');
    console.log('   Production (Upstash - Free tier):');
    console.log('   - Go to https://upstash.com');
    console.log('   - Create Redis database');
    console.log('   - Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    console.log('   - Add both to your production environment variables');
  }

  if (hasWarnings) {
    console.log('3. ⚠️ Address Warnings:');
    console.log('   - Review warning messages above');
    console.log('   - Complete optional configurations');
    console.log('   - Add missing scripts to package.json');
  }

  console.log('4. 🧪 Test Everything:');
  console.log('   npm run test:security     # Test security features');
  console.log('   npm run dev              # Test in development');
  console.log('   npm run build            # Test production build');
  
  console.log('5. 🧹 Setup Maintenance (Production):');
  console.log('   - Schedule session cleanup: npm run cleanup-sessions');
  console.log('   - Schedule error cleanup: npm run cleanup-errors');
  console.log('   - Monitor system health via /api/errors/report');

  console.log('6. 📊 Monitoring Setup:');
  console.log('   - Check error reports at /api/errors/report');
  console.log('   - Monitor Redis performance if enabled');
  console.log('   - Set up alerts for critical errors');
  
  console.log('\n🔍 Verification Commands:');
  console.log('   node scripts/verify-setup-enhanced.js  # Run this script again');
  console.log('   npm run verify-setup                   # If added to package.json');
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting Enhanced Setup Verification...\n');

  try {
    // Run all checks in sequence
    checkEnhancedFileStructure();
    console.log('');
    
    checkEnhancedEnvVars();
    validateEnvironmentValues();
    console.log('');
    
    checkEnhancedDependencies();
    console.log('');
    
    await checkDatabaseSchema();
    console.log('');
    
    await checkRedisConnection();
    console.log('');
    
    checkSecurityConfiguration();
    console.log('');
    
    checkPerformanceOptimizations();
    console.log('');
    
    checkCodeQuality();
    console.log('');
    
    checkProductionReadiness();

    // Generate reports and instructions
    const success = generateDetailedReport();
    
    displayQuickHealthCheck();
    displayInstructions();
    printNextSteps();

    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Verification completed in ${duration}ms`);
    console.log(`📅 Verification timestamp: ${new Date().toISOString()}`);

    // Save verification report to file (optional)
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        duration: duration,
        results: testResults,
        hasErrors,
        hasWarnings,
        overallScore: Math.round((
          Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0) / 
          Math.max(Object.values(testResults).reduce((sum, cat) => sum + cat.passed + cat.failed, 0), 1)
        ) * 100),
        summary: {
          totalTests: Object.values(testResults).reduce((sum, cat) => sum + cat.passed + cat.failed, 0),
          passedTests: Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0),
          failedTests: Object.values(testResults).reduce((sum, cat) => sum + cat.failed, 0)
        }
      };
      
      fs.writeFileSync(
        path.join(process.cwd(), 'verification-report.json'),
        JSON.stringify(reportData, null, 2)
      );
      
      log.info('Verification report saved to verification-report.json');
    } catch (reportError) {
      log.warning('Could not save verification report to file');
    }

    // Exit with appropriate code
    if (hasErrors) {
      console.log('\n💡 Tip: Fix critical errors first, then re-run verification');
      console.log('🚨 Do not deploy to production until all errors are resolved!');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('\n✅ Setup is functional but has some warnings');
      console.log('💡 Consider addressing warnings for optimal performance');
      process.exit(0);
    } else {
      console.log('\n🎉 Setup verification completed successfully!');
      console.log('🚀 All systems go - ready for deployment!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Verification script failed:', error);
    
    // Enhanced error reporting
    const errorReport = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: process.cwd(),
      environmentKeys: Object.keys(process.env).filter(key => 
        key.startsWith('NEXT_PUBLIC_') || 
        key.includes('SUPABASE') || 
        key.includes('REDIS') ||
        key === 'NODE_ENV'
      )
    };
    
    console.error('\n🔍 Error Details:');
    console.error('- Message:', errorReport.error);
    console.error('- Node.js:', errorReport.nodeVersion);
    console.error('- Platform:', errorReport.platform);
    console.error('- Working Dir:', errorReport.workingDirectory);
    console.error('- Available Env Keys:', errorReport.environmentKeys.join(', '));
    
    console.error('\n💡 Troubleshooting:');
    console.error('1. Ensure you are in the project root directory');
    console.error('2. Check that .env.local file exists and is readable');
    console.error('3. Verify all dependencies are installed: npm install');
    console.error('4. Check file permissions');
    console.error('5. Try running: npm install ioredis @types/ioredis');
    
    process.exit(1);
  }
}

// Run main function with enhanced error handling
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Script execution failed:', error);
    console.error('\n🔍 Debug Information:');
    console.error('- Node.js version:', process.version);
    console.error('- Working directory:', process.cwd());
    console.error('- Script arguments:', process.argv);
    
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    
    console.error('\n💡 Possible solutions:');
    console.error('1. Ensure you are in the project root directory');
    console.error('2. Check that .env.local file exists');
    console.error('3. Verify all dependencies are installed');
    console.error('4. Run: npm install');
    console.error('5. Check file and directory permissions');
    
    process.exit(1);
  });
}

// Export functions for testing and reuse
module.exports = {
  checkEnhancedFileStructure,
  checkEnhancedEnvVars, 
  checkEnhancedDependencies,
  checkDatabaseSchema,
  checkRedisConnection,
  checkSecurityConfiguration,
  checkCodeQuality,
  checkProductionReadiness,
  generateDetailedReport,
  displayQuickHealthCheck,
  displayInstructions,
  printNextSteps,
  validateEnvironmentValues,
  main
};