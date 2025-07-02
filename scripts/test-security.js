#!/usr/bin/env node

/**
 * Security Testing Script
 * Tests security features and rate limiting
 * Run: node scripts/test-security.js
 */

const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class SecurityTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
    };
  }

  async testRateLimiting() {
    console.log('🔒 Testing rate limiting...');
    
    try {
      const requests = [];
      const endpoint = `${this.baseUrl}/api/auth/login`;
      
      // Send multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'wrong' }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      if (rateLimited) {
        this.results.passed.push('Rate limiting is working correctly');
      } else {
        this.results.warnings.push('Rate limiting may not be configured properly');
      }
      
    } catch (error) {
      this.results.failed.push(`Rate limiting test failed: ${error.message}`);
    }
  }

  async testSecurityHeaders() {
    console.log('🛡️ Testing security headers...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const headers = response.headers;

      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy',
        'content-security-policy',
      ];

      const missingHeaders = requiredHeaders.filter(header => !headers.get(header));
      
      if (missingHeaders.length === 0) {
        this.results.passed.push('All required security headers are present');
      } else {
        this.results.failed.push(`Missing security headers: ${missingHeaders.join(', ')}`);
      }

      // Check for HTTPS in production
      if (this.baseUrl.startsWith('https://')) {
        const hsts = headers.get('strict-transport-security');
        if (hsts) {
          this.results.passed.push('HTTPS and HSTS are properly configured');
        } else {
          this.results.warnings.push('HSTS header missing for HTTPS site');
        }
      }
      
    } catch (error) {
      this.results.failed.push(`Security headers test failed: ${error.message}`);
    }
  }

  async testAuthenticationEndpoints() {
    console.log('🔐 Testing authentication endpoints...');
    
    try {
      // Test login with invalid credentials
      const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid@test.com', password: 'wrong' }),
      });

      if (loginResponse.status === 401) {
        this.results.passed.push('Login correctly rejects invalid credentials');
      } else {
        this.results.failed.push('Login endpoint security issue');
      }

      // Test protected endpoint without auth
      const protectedResponse = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' }),
      });

      if (protectedResponse.status === 401) {
        this.results.passed.push('Protected endpoints require authentication');
      } else {
        this.results.failed.push('Protected endpoint accessible without authentication');
      }
      
    } catch (error) {
      this.results.failed.push(`Authentication test failed: ${error.message}`);
    }
  }

  async testInputValidation() {
    console.log('✅ Testing input validation...');
    
    try {
      // Test with malicious input
      const maliciousInputs = [
        { email: '<script>alert("xss")</script>', password: 'test' },
        { email: 'test@test.com', password: "'; DROP TABLE users; --" },
        { email: 'test', password: 'x'.repeat(1000) }, // Very long password
      ];

      for (const input of maliciousInputs) {
        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (response.status === 400 || response.status === 422) {
          this.results.passed.push(`Input validation working for: ${JSON.stringify(input).substring(0, 50)}...`);
        } else {
          this.results.warnings.push(`Potential input validation issue with: ${JSON.stringify(input).substring(0, 50)}...`);
        }
      }
      
    } catch (error) {
      this.results.failed.push(`Input validation test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('🚨 Testing error handling...');
    
    try {
      // Test with invalid JSON
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const data = await response.json().catch(() => null);
      
      if (response.status >= 400 && data && data.error) {
        this.results.passed.push('Error handling returns proper error responses');
      } else {
        this.results.warnings.push('Error handling may expose sensitive information');
      }
      
    } catch (error) {
      this.results.failed.push(`Error handling test failed: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log(`🔍 Starting security tests for ${this.baseUrl}...\n`);
    
    await this.testSecurityHeaders();
    await this.testRateLimiting();
    await this.testAuthenticationEndpoints();
    await this.testInputValidation();
    await this.testErrorHandling();
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Security Test Report');
    console.log('=======================');
    
    console.log(`\n✅ Passed Tests (${this.results.passed.length}):`);
    this.results.passed.forEach(test => console.log(`   ✓ ${test}`));
    
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️ Warnings (${this.results.warnings.length}):`);
      this.results.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));
    }
    
    if (this.results.failed.length > 0) {
      console.log(`\n❌ Failed Tests (${this.results.failed.length}):`);
      this.results.failed.forEach(test => console.log(`   ✗ ${test}`));
    }
    
    const totalTests = this.results.passed.length + this.results.warnings.length + this.results.failed.length;
    const passRate = Math.round((this.results.passed.length / totalTests) * 100);
    
    console.log(`\n📈 Overall Security Score: ${passRate}%`);
    
    if (this.results.failed.length > 0) {
      console.log('\n🚨 CRITICAL: Fix failed tests before deploying to production!');
      process.exit(1);
    } else if (this.results.warnings.length > 0) {
      console.log('\n⚠️ Consider addressing warnings for better security');
    } else {
      console.log('\n✅ All security tests passed!');
    }
  }
}

async function main() {
  const tester = new SecurityTester(BASE_URL);
  await tester.runAllTests();
}

// Run tests if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Security testing failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityTester;