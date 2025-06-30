'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// Debug AuthContext specifically
export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({
    status: 'initializing',
    timeline: []
  });

  // Hook into useAuth with detailed logging
  const authState = useAuth();

  const addToTimeline = (event: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] ${event}`, data);
    
    setDebugInfo(prev => ({
      ...prev,
      timeline: [...prev.timeline, {
        timestamp,
        event,
        data
      }]
    }));
  };

  useEffect(() => {
    addToTimeline('AuthDebugPage mounted');
    
    // Monitor authState changes
    if (authState) {
      addToTimeline('AuthState received', {
        isLoading: authState.isLoading,
        isAuthenticated: authState.isAuthenticated,
        user: authState.user ? 'Present' : 'Null',
        error: authState.error,
        isGuest: authState.isGuest
      });

      setDebugInfo(prev => ({
        ...prev,
        status: 'monitoring',
        currentState: {
          isLoading: authState.isLoading,
          isAuthenticated: authState.isAuthenticated,
          hasUser: !!authState.user,
          error: authState.error,
          isGuest: authState.isGuest,
          isAdmin: authState.isAdmin
        }
      }));
    } else {
      addToTimeline('AuthState is null/undefined');
      setDebugInfo(prev => ({
        ...prev,
        status: 'error',
        error: 'AuthState is null'
      }));
    }
  }, [authState?.isLoading, authState?.isAuthenticated, authState?.user, authState?.error]);

  // Test AuthContext functions
  const testAuthFunctions = async () => {
    addToTimeline('Testing AuthContext functions...');
    
    try {
      // Test if functions exist
      const functionTests = {
        login: typeof authState?.login === 'function',
        register: typeof authState?.register === 'function',
        logout: typeof authState?.logout === 'function',
        updateUsage: typeof authState?.updateUsage === 'function',
        refreshUsage: typeof authState?.refreshUsage === 'function'
      };

      addToTimeline('Function availability test', functionTests);

      // Test if we can call functions (without actually executing)
      if (authState?.login) {
        addToTimeline('Login function available');
      }

    } catch (error: any) {
      addToTimeline('Function test error', { message: error.message });
    }
  };

  // Monitor for stuck loading
  useEffect(() => {
    if (authState?.isLoading) {
      addToTimeline('AuthContext is loading...');
      
      // Set timeout to detect stuck loading
      const timeout = setTimeout(() => {
        if (authState?.isLoading) {
          addToTimeline('WARNING: AuthContext stuck in loading state for 10+ seconds');
        }
      }, 10000);

      return () => clearTimeout(timeout);
    } else {
      addToTimeline('AuthContext finished loading');
    }
  }, [authState?.isLoading]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initializing': return 'bg-blue-50 text-blue-800';
      case 'monitoring': return 'bg-green-50 text-green-800';
      case 'error': return 'bg-red-50 text-red-800';
      default: return 'bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            🔍 AuthContext Debug Dashboard
          </h1>

          {/* Current Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Current Status</h2>
            <div className={`p-4 rounded-lg ${getStatusColor(debugInfo.status)}`}>
              <div className="font-medium text-lg">
                Status: {debugInfo.status.toUpperCase()}
              </div>
              {debugInfo.error && (
                <div className="text-sm mt-2">Error: {debugInfo.error}</div>
              )}
            </div>
          </div>

          {/* AuthState Details */}
          {debugInfo.currentState && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-green-600">AuthState Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${debugInfo.currentState.isLoading ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
                  <div className="font-medium">Is Loading</div>
                  <div className="text-sm">{String(debugInfo.currentState.isLoading)}</div>
                </div>

                <div className={`p-4 rounded-lg ${debugInfo.currentState.isAuthenticated ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-800'}`}>
                  <div className="font-medium">Is Authenticated</div>
                  <div className="text-sm">{String(debugInfo.currentState.isAuthenticated)}</div>
                </div>

                <div className={`p-4 rounded-lg ${debugInfo.currentState.hasUser ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-800'}`}>
                  <div className="font-medium">Has User</div>
                  <div className="text-sm">{String(debugInfo.currentState.hasUser)}</div>
                </div>

                <div className={`p-4 rounded-lg ${debugInfo.currentState.isGuest ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-800'}`}>
                  <div className="font-medium">Is Guest</div>
                  <div className="text-sm">{String(debugInfo.currentState.isGuest)}</div>
                </div>

                {debugInfo.currentState.error && (
                  <div className="md:col-span-2 p-4 rounded-lg bg-red-50 text-red-800">
                    <div className="font-medium">Error</div>
                    <div className="text-sm">{debugInfo.currentState.error}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">Event Timeline</h2>
            <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
              {debugInfo.timeline.length === 0 ? (
                <div className="text-gray-500 text-sm">No events yet...</div>
              ) : (
                <div className="space-y-2">
                  {debugInfo.timeline.map((event: any, index: number) => (
                    <div key={index} className="text-sm">
                      <div className="font-mono text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="font-medium">{event.event}</div>
                      {event.data && (
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={testAuthFunctions}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🧪 Test Auth Functions
            </button>
            
            <button 
              onClick={() => {
                const debugData = {
                  status: debugInfo.status,
                  currentState: debugInfo.currentState,
                  timelineLength: debugInfo.timeline.length,
                  lastEvents: debugInfo.timeline.slice(-5)
                };
                navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
                alert('Debug data copied to clipboard!');
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📋 Copy Debug Data
            </button>

            <button 
              onClick={() => setDebugInfo({ status: 'initializing', timeline: [] })}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              🔄 Clear Timeline
            </button>

            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Back
            </button>
          </div>

          {/* Quick Fix Suggestions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-3">💡 Quick Fix Suggestions</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <div>• If loading is stuck: Check for infinite useEffect loops in AuthContext</div>
              <div>• If user is null: Check token verification in AuthContext</div>
              <div>• If functions missing: Check AuthContext exports</div>
              <div>• If errors persist: Check browser network tab for failed API calls</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}