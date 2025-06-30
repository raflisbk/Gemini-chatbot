'use client';

import React from 'react';

// Environment Debug Page - untuk test environment variables
export default function DebugPage() {
  const envData = {
    // Environment variables
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    
    // Runtime checks
    runtime: {
      isBrowser: typeof window !== 'undefined',
      hasProcess: typeof process !== 'undefined',
      timestamp: new Date().toISOString()
    }
  };

  const getStatusColor = (condition: boolean) => {
    return condition ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? '✅' : '❌';
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            🔍 Environment Debug Dashboard
          </h1>

          {/* Runtime Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Runtime Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${getStatusColor(envData.runtime.isBrowser)}`}>
                <div className="font-medium">
                  {getStatusIcon(envData.runtime.isBrowser)} Browser Context
                </div>
                <div className="text-sm">{envData.runtime.isBrowser ? 'Running in browser' : 'Server-side'}</div>
              </div>
              
              <div className={`p-4 rounded-lg ${getStatusColor(envData.runtime.hasProcess)}`}>
                <div className="font-medium">
                  {getStatusIcon(envData.runtime.hasProcess)} Process Object
                </div>
                <div className="text-sm">{envData.runtime.hasProcess ? 'Available' : 'Not available'}</div>
              </div>
              
              <div className="p-4 rounded-lg bg-blue-50 text-blue-600">
                <div className="font-medium">⏰ Timestamp</div>
                <div className="text-sm">{envData.runtime.timestamp}</div>
              </div>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-green-600">Environment Variables</h2>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${envData.environment.hasSupabaseUrl ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="font-medium mb-2">
                  {getStatusIcon(envData.environment.hasSupabaseUrl)} NEXT_PUBLIC_SUPABASE_URL
                </div>
                <div className="text-sm font-mono bg-white p-2 rounded border">
                  {envData.environment.NEXT_PUBLIC_SUPABASE_URL || 'undefined'}
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${envData.environment.hasSupabaseKey ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="font-medium mb-2">
                  {getStatusIcon(envData.environment.hasSupabaseKey)} NEXT_PUBLIC_SUPABASE_ANON_KEY
                </div>
                <div className="text-sm font-mono bg-white p-2 rounded border">
                  {envData.environment.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="font-medium mb-2">🔧 NODE_ENV</div>
                <div className="text-sm font-mono bg-white p-2 rounded border">
                  {envData.environment.NODE_ENV || 'undefined'}
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">Diagnosis</h2>
            <div className="space-y-3">
              {!envData.runtime.hasProcess && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-red-800">❌ Process object not available</div>
                  <div className="text-sm text-red-600 mt-1">
                    This indicates environment variables are not being injected into the browser bundle.
                  </div>
                </div>
              )}

              {!envData.environment.hasSupabaseUrl && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-red-800">❌ Supabase URL missing</div>
                  <div className="text-sm text-red-600 mt-1">
                    NEXT_PUBLIC_SUPABASE_URL is not set or not accessible.
                  </div>
                </div>
              )}

              {!envData.environment.hasSupabaseKey && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-red-800">❌ Supabase key missing</div>
                  <div className="text-sm text-red-600 mt-1">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY is not set or not accessible.
                  </div>
                </div>
              )}

              {envData.environment.hasSupabaseUrl && envData.environment.hasSupabaseKey && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-800">✅ Environment variables OK</div>
                  <div className="text-sm text-green-600 mt-1">
                    All required environment variables are present and accessible.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-orange-600">Recommendations</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                {!envData.runtime.hasProcess && (
                  <>
                    <div>• Check if .env.local exists in project root</div>
                    <div>• Verify environment variables start with NEXT_PUBLIC_</div>
                    <div>• Restart development server after adding env vars</div>
                    <div>• Check Vercel environment variables in dashboard</div>
                  </>
                )}
                
                {!envData.environment.hasSupabaseUrl && (
                  <div>• Add NEXT_PUBLIC_SUPABASE_URL to your environment variables</div>
                )}
                
                {!envData.environment.hasSupabaseKey && (
                  <div>• Add NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables</div>
                )}

                <div>• Test this page in both development and production</div>
                <div>• Check browser console for additional error messages</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Reload Page
            </button>
            
            <button 
              onClick={() => {
                const debugData = JSON.stringify(envData, null, 2);
                navigator.clipboard.writeText(debugData);
                alert('Debug data copied to clipboard!');
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📋 Copy Debug Data
            </button>

            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}