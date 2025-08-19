import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrackingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message: string;
  data?: any;
  timestamp: string;
  cost?: number;
}

const ENHANCEMENT_STEPS: Omit<TrackingStep, 'status' | 'message' | 'timestamp' | 'data'>[] = [
  { id: 'file-select', name: '📁 File Selected', cost: 0 },
  { id: 'file-convert', name: '🔄 Convert to Base64', cost: 0 },
  { id: 'api-call', name: '📡 Send to API', cost: 0 },
  { id: 'replicate-auth', name: '🔑 Replicate Auth', cost: 0 },
  { id: 'replicate-process', name: '🤖 Real-ESRGAN Processing', cost: 0.0025 },
  { id: 'stream-handle', name: '📥 Handle Response Stream', cost: 0 },
  { id: 'image-return', name: '🖼️ Return Enhanced Image', cost: 0 },
  { id: 'ui-display', name: '📱 Display Result', cost: 0 }
];

export const EnhancementTracker = () => {
  const [steps, setSteps] = useState<TrackingStep[]>(
    ENHANCEMENT_STEPS.map(step => ({
      ...step,
      status: 'pending',
      message: 'Waiting...',
      timestamp: ''
    }))
  );
  const [totalCost, setTotalCost] = useState(0);

  const updateStep = (stepId: string, status: TrackingStep['status'], message: string, data?: any) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        const updated = {
          ...step,
          status,
          message,
          data,
          timestamp: new Date().toLocaleTimeString()
        };
        
        if (status === 'success' && step.cost) {
          setTotalCost(prev => prev + step.cost!);
        }
        
        return updated;
      }
      return step;
    }));
  };

  const resetTracker = () => {
    setSteps(ENHANCEMENT_STEPS.map(step => ({
      ...step,
      status: 'pending',
      message: 'Waiting...',
      timestamp: ''
    })));
    setTotalCost(0);
  };

  // Make functions globally available
  useEffect(() => {
    (window as any).enhancementTracker = {
      updateStep,
      resetTracker
    };
    
    return () => {
      delete (window as any).enhancementTracker;
    };
  }, []);

  const getStatusColor = (status: TrackingStep['status']) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-900/20';
      case 'error': return 'text-red-400 bg-red-900/20';
      case 'processing': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: TrackingStep['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'processing': return '⏳';
      default: return '⏸️';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="bg-black/95 text-white border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm text-yellow-400">
              🔍 REAL-ESRGAN TRACKER
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">€{totalCost.toFixed(4)}</span>
              <button
                onClick={resetTracker}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
              >
                Reset
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-2 rounded border text-xs ${getStatusColor(step.status)} border-gray-600`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{getStatusIcon(step.status)}</span>
                    <span className="font-medium">{step.name}</span>
                    {step.cost! > 0 && (
                      <span className="text-green-300 text-xs">€{step.cost}</span>
                    )}
                  </div>
                  {step.timestamp && (
                    <span className="text-gray-500 text-xs">{step.timestamp}</span>
                  )}
                </div>
                <div className="text-gray-300 ml-6">
                  {step.message}
                </div>
                {step.data && (
                  <details className="ml-6 mt-1">
                    <summary className="cursor-pointer text-gray-500 text-xs">
                      Show Details
                    </summary>
                    <pre className="text-xs bg-gray-900 p-1 rounded mt-1 overflow-auto max-h-16">
                      {JSON.stringify(step.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};