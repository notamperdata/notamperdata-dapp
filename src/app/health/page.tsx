"use client";

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface HealthData {
  status: 'healthy' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  database?: {
    connected: boolean;
    latency?: number;
  };
  uptime: number;
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      setHealthData(data);
      setLastChecked(new Date());
    } catch (err) {
      setError('Failed to fetch health status');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status: 'healthy' | 'error') => {
    return status === 'healthy' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = (status: 'healthy' | 'error') => {
    return status === 'healthy' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-[#0033AD]">System Health Status</h1>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="bg-[#4285F4] text-white px-4 py-2 rounded-md hover:bg-[#366ac7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                'Refresh'
              )}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {healthData && (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Overall Status</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(healthData.status)}`}>
                    {healthData.status === 'healthy' ? '✅ Healthy' : '❌ Error'}
                  </span>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="text-lg font-semibold text-gray-900">{healthData.version}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Environment</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{healthData.environment}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Uptime</p>
                    <p className="text-lg font-semibold text-gray-900">{formatUptime(healthData.uptime)}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Last Checked</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Database Status */}
              {healthData.database && (
                <div className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Database</h2>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`w-3 h-3 rounded-full ${healthData.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className={`font-medium ${healthData.database.connected ? 'text-green-600' : 'text-red-600'}`}>
                        {healthData.database.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    {healthData.database.latency && (
                      <span className="text-sm text-gray-600">
                        Latency: {healthData.database.latency}ms
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* API Endpoints */}
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">GET /api/health</span>
                    <span className="text-green-600">✅ Available</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">POST /api/storehash</span>
                    <span className="text-green-600">✅ Available</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">POST /api/verify</span>
                    <span className="text-green-600">✅ Available</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">POST /api/createhash</span>
                    <span className="text-green-600">✅ Available</span>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-center text-sm text-gray-500">
                Last updated: {new Date(healthData.timestamp).toLocaleString()}
              </div>
            </div>
          )}

          {loading && !healthData && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-8 w-8 mr-3" />
              <span className="text-gray-600">Checking system health...</span>
            </div>
          )}
        </div>

        {/* Quick Test Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick API Test</h2>
          <p className="text-gray-600 mb-4">
            Use these endpoints to test the API connectivity from your applications:
          </p>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="space-y-2 text-sm font-mono">
              <div className="flex">
                <span className="text-blue-600 mr-2">GET</span>
                <span className="text-gray-800">{window.location.origin}/api/health</span>
              </div>
              <div className="flex">
                <span className="text-green-600 mr-2">POST</span>
                <span className="text-gray-800">{window.location.origin}/api/health</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-md">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> POST requests to /api/health require a valid API key for detailed information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}