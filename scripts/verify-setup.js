#!/usr/bin/env node

/**
 * Setup Verification Script
 * Run: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying AI Chatbot Setup...\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

let hasErrors = false;
let hasWarnings = false;

// Check if file exists
function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log.success(`${description}: ${filePath}`);
    return true;
  } else {
    log.error(`Missing ${description}: ${filePath}`);
    hasErrors = true;
    return false;
  }
}

// Check environment variables
function checkEnvVars() {
  console.log('\n📋 Checking Environment Variables:');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'JWT_SECRET',
    'GEMINI_API_KEY'
  ];

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      log.error('.env.local file not found');
      hasErrors = true;
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    
    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match && match[1].trim() && !match[1].includes('your_')) {
          log.success(`${varName} is set`);
        } else {
          log.warning(`${varName} is set but might be placeholder value`);
          hasWarnings = true;
        }
      } else {
        log.error(`Missing ${varName} in .env.local`);
        hasErrors = true;
      }
    });

    // Check JWT secret length
    const jwtMatch = envContent.match(/JWT_SECRET=(.+)/);
    if (jwtMatch && jwtMatch[1].length < 32) {
      log.warning('JWT_SECRET should be at least 32 characters long');
      hasWarnings = true;
    }

  } catch (error) {
    log.error(`Error reading .env.local: ${error.message}`);
    hasErrors = true;
  }
}

// Check package.json dependencies
function checkDependencies() {
  console.log('\n📦 Checking Dependencies:');
  
  const requiredDeps = [
    '@supabase/supabase-js',
    '@vercel/blob',
    'bcryptjs',
    'jsonwebtoken', 
    'zod',
    'jose',
    'crypto-js'
  ];

  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = { ...packageContent.dependencies, ...packageContent.devDependencies };

    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        log.success(`${dep}: ${allDeps[dep]}`);
      } else {
        log.error(`Missing dependency: ${dep}`);
        hasErrors = true;
      }
    });

  } catch (error) {
    log.error(`Error reading package.json: ${error.message}`);
    hasErrors = true;
  }
}

// Check file structure
function checkFileStructure() {
  console.log('\n📁 Checking File Structure:');

  const requiredFiles = [
    // Core files
    { path: 'src/lib/supabase.ts', desc: 'Supabase client' },
    { path: 'src/lib/auth.ts', desc: 'Authentication utilities' },
    { path: 'src/lib/storage.ts', desc: 'Storage utilities' },
    { path: 'src/types/supabase.ts', desc: 'Database types' },
    { path: 'middleware.ts', desc: 'Security middleware' },
    
    // API routes
    { path: 'src/app/api/auth/login/route.ts', desc: 'Login API' },
    { path: 'src/app/api/auth/register/route.ts', desc: 'Register API' },
    { path: 'src/app/api/auth/verify/route.ts', desc: 'Verify API' },
    { path: 'src/app/api/auth/logout/route.ts', desc: 'Logout API' },
    { path: 'src/app/api/files/upload/route.ts', desc: 'File upload API' },
    
    // Updated files
    { path: 'src/context/AuthContext.tsx', desc: 'Auth context' },
    { path: 'src/lib/chatStorage.ts', desc: 'Chat storage' },
    { path: 'src/app/api/chat/route.ts', desc: 'Chat API' }
  ];

  requiredFiles.forEach(file => {
    checkFile(file.path, file.desc);
  });
}

// Main verification function
async function verifySetup() {
  console.log('🚀 AI Chatbot Setup Verification\n');
  
  checkFileStructure();
  checkEnvVars();
  checkDependencies();

  // Summary
  console.log('\n📊 Verification Summary:');
  
  if (hasErrors) {
    log.error('Setup has critical errors that need to be fixed');
    console.log('\n🔧 Next steps:');
    console.log('1. Fix the errors listed above');
    console.log('2. Follow the Migration Guide step by step');
    console.log('3. Run this script again to verify');
    process.exit(1);
  } else if (hasWarnings) {
    log.warning('Setup is mostly complete but has some warnings');
    console.log('\n✅ You can proceed but consider fixing warnings for production');
  } else {
    log.success('Setup verification passed! 🎉');
    console.log('\n🚀 Ready to start development:');
    console.log('   npm run dev');
  }

  // Next steps
  console.log('\n📝 Additional checks to do manually:');
  console.log('1. Test Supabase connection in dashboard');
  console.log('2. Verify database schema is created');
  console.log('3. Test admin login (admin@example.com / admin123)');
  console.log('4. Test file upload to Vercel Blob');
  console.log('5. Test chat functionality');
}

// Run verification
verifySetup().catch(error => {
  log.error(`Verification failed: ${error.message}`);
  process.exit(1);
});