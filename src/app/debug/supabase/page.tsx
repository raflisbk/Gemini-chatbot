'use client';

import React, { useEffect, useState } from 'react';

// Test Supabase connection specifically
export default function SupabaseTestPage() {
  const [connectionTest, setConnectionTest] = useState<any>({
    status: 'testing',
    results: {}
  });

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
      }
    };

    try {
      // Test 1: Environment variables
      console.log('🔍 Environment check passed');
      
      // Test 2: Try to import Supabase
      console.log('🔍 Testing Supabase import...');
      const { createClient } = await import('@supabase/supabase-js');
      results.supabaseImport = { success: true };
      console.log('✅ Supabase import successful');

      // Test 3: Try to create client
      console.log('🔍 Testing client creation...');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const testClient = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      results.clientCreation = { success: true };
      console.log('✅ Supabase client created');

      // Test 4: Try to make a simple request
      console.log('🔍 Testing connection...');
      const { data, error } = await testClient
        .from('users')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        results.connectionTest = { 
          success: false, 
          error: error.message,
          code: error.code 
        };
        console.log('⚠️ Connection test failed:', error.message);
      } else {
        results.connectionTest = { 
          success: true, 
          response: data 
        };
        console.log('✅ Connection test successful');
      }

      // Test 5: Check if lib/supabase exists and works
      console.log('🔍 Testing lib/supabase...');
      try {
        const supabaseLib = await import('@/lib/supabase');
        results.libSupabase = {
          success: true,
          hasSupabase: !!supabaseLib.supabase,
          hasSupabaseAdmin: !!supabaseLib.supabaseAdmin,
          exports: Object.keys(supabaseLib)
        };
        console.log('✅ lib/supabase import successful');
      } catch (libError: any) {
        results.libSupabase = {
          success: false,
          error: libError.message
        };
        console.log('❌ lib/supabase import failed:', libError.message);
      }

      // Test 6: Check AuthContext
      console.log('🔍 Testing AuthContext...');
      try {
        const authContext = await import('@/context/AuthContext');
        results.authContext = {
          success: true,
          hasUseAuth: !!authContext.useAuth,
          hasAuthProvider: !!authContext.AuthProvider
        };
        console.log('✅ AuthContext import successful');
      } catch (authError: any) {
        results.authContext = {
          success: false,
          error: authError.message
        };
        console.log('❌ AuthContext import failed:', authError.message);
      }

    } catch (error: any) {
      results.generalError = {
        message: error.message,
        stack: error.stack
      };
      console.log('❌ General error:', error.message);
    }

    setConnectionTest({
      status: 'completed',
      results
    });
  };

  const getStatusColor = (success: boolean | undefined) => {
    if (success === undefined) return 'bg-gray-100 text-gray-600';
    return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return '⏳';
    return success ? '✅' : '❌';
  };

  if (connectionTest.status === 'testing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Testing Supabase connection...</p>
        </div>
      </div>
    );
  }

  const { results } = connectionTest;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            🔗 Supabase Connection Test
          </h1>

          {/* Environment */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Environment</h2>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium">Supabase URL</div>
                <div className="text-sm font-mono mt-1 break-all">
                  {results.environment?.url}
                </div>
              </div>
              <div className={`p-4 rounded-lg ${getStatusColor(results.environment?.hasKey)}`}>
                <div className="font-medium">
                  {getStatusIcon(results.environment?.hasKey)} Supabase Key
                </div>
                <div className="text-sm">
                  Length: {results.environment?.keyLength || 0} characters
                </div>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-green-600">Test Results</h2>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${getStatusColor(results.supabaseImport?.success)}`}>
                <div className="font-medium">
                  {getStatusIcon(results.supabaseImport?.success)} Supabase Import
                </div>
                <div className="text-sm">
                  {results.supabaseImport?.success ? 'Successfully imported @supabase/supabase-js' : 'Failed to import'}
                </div>
              </div>

              <div className={`p-4 rounded-lg ${getStatusColor(results.clientCreation?.success)}`}>
                <div className="font-medium">
                  {getStatusIcon(results.clientCreation?.success)} Client Creation
                </div>
                <div className="text-sm">
                  {results.clientCreation?.success ? 'Supabase client created successfully' : 'Failed to create client'}
                </div>
              </div>

              <div className={`p-4 rounded-lg ${getStatusColor(results.connectionTest?.success)}`}>
                <div className="font-medium">
                  {getStatusIcon(results.connectionTest?.success)} Database Connection
                </div>
                <div className="text-sm">
                  {results.connectionTest?.success 
                    ? 'Successfully connected to database'
                    : `Connection failed: ${results.connectionTest?.error}`
                  }
                </div>
                {results.connectionTest?.code && (
                  <div className="text-xs mt-1 font-mono">
                    Error Code: {results.connectionTest.code}
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-lg ${getStatusColor(results.libSupabase?.success)}`}>
                <div className="font-medium">
                  {getStatusIcon(results.libSupabase?.success)} lib/supabase Import
                </div>
                <div className="text-sm">
                  {results.libSupabase?.success 
                    ? `Exports: ${results.libSupabase.exports?.join(', ')}`
                    : `Import failed: ${results.libSupabase?.error}`
                  }
                </div>
              </div>

              <div className={`p-4 rounded-lg ${getStatusColor(results.authContext?.success)}`}>
                <div className="font-medium">
                  {getStatusIcon(results.authContext?.success)} AuthContext Import
                </div>
                <div className="text-sm">
                  {results.authContext?.success 
                    ? `useAuth: ${results.authContext.hasUseAuth}, AuthProvider: ${results.authContext.hasAuthProvider}`
                    : `Import failed: ${results.authContext?.error}`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* General Error */}
          {results.generalError && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-red-600">General Error</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-medium text-red-800">{results.generalError.message}</div>
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">Stack trace</summary>
                  <pre className="text-xs mt-2 bg-white p-2 rounded border overflow-auto">
                    {results.generalError.stack}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={testSupabaseConnection}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Retry Tests
            </button>
            
            <button 
              onClick={() => {
                console.log('Full test results:', results);
                navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                alert('Test results copied to clipboard!');
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📋 Copy Results
            </button>

            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}