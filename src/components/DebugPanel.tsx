import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'error' | 'success' | 'warning';
  message: string;
  data?: any;
}

export const DebugPanel = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    setLogs(prev => [...prev.slice(-49), log]); // Keep last 50 logs
  };

  // Global debug function
  useEffect(() => {
    (window as any).debugLog = addLog;
    
    // Override console methods to capture logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = (...args) => {
      originalConsoleLog(...args);
      addLog('info', args.join(' '), args);
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      addLog('error', args.join(' '), args);
    };
    
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      addLog('warning', args.join(' '), args);
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          Show Debug Panel
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-hidden">
      <Card className="bg-black/90 text-green-400 font-mono text-xs">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm text-red-400">🐛 DEBUG PANEL</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-xs bg-gray-600 text-white px-2 py-1 rounded"
              >
                Hide
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-64 overflow-y-auto space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`text-xs p-1 rounded ${
                  log.level === 'error'
                    ? 'bg-red-900/50 text-red-200'
                    : log.level === 'success'
                    ? 'bg-green-900/50 text-green-200'
                    : log.level === 'warning'
                    ? 'bg-yellow-900/50 text-yellow-200'
                    : 'bg-blue-900/50 text-blue-200'
                }`}
              >
                <div className="font-bold">
                  {log.level.toUpperCase()} - {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap break-all">
                  {log.message}
                </div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-gray-400">Show Data</summary>
                    <pre className="text-xs mt-1 bg-black/50 p-1 rounded overflow-auto max-h-20">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No debug logs yet...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};