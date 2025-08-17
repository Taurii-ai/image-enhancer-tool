import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Zap, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { type EnhancementProgress } from '@/services/imageEnhancement';

interface ProcessingStatusProps {
  isProcessing: boolean;
  progress?: EnhancementProgress | null;
  onCancel?: () => void;
}

export const ProcessingStatus = ({ isProcessing, progress: enhancementProgress, onCancel }: ProcessingStatusProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { name: "Initializing AI", icon: Brain },
    { name: "Analyzing image", icon: Sparkles },
    { name: "AI enhancement", icon: Zap },
    { name: "Finalizing", icon: Sparkles },
  ];

  useEffect(() => {
    if (!isProcessing || !enhancementProgress) {
      setDisplayProgress(0);
      setCurrentStep(0);
      return;
    }

    // Use real progress from enhancement service
    const progressValue = enhancementProgress.progress || 0;
    setDisplayProgress(progressValue);
    
    // Update current step based on progress
    if (progressValue >= 90) setCurrentStep(3);
    else if (progressValue >= 50) setCurrentStep(2);
    else if (progressValue >= 25) setCurrentStep(1);
    else setCurrentStep(0);

  }, [isProcessing, enhancementProgress]);

  if (!isProcessing) return null;

  const CurrentIcon = steps[currentStep]?.icon || Loader2;
  const statusMessage = enhancementProgress?.message || steps[currentStep]?.name || "Processing...";

  return (
    <Card className="p-6 sm:p-8 md:p-12 bg-card shadow-xl border-border overflow-x-hidden w-full max-w-2xl mx-auto">
      <div className="space-y-6 sm:space-y-8 md:space-y-10 overflow-x-hidden max-w-full">
        <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 overflow-x-hidden max-w-full">
          <div className="flex justify-center">
            <div className="p-4 sm:p-5 md:p-6 bg-primary/10 rounded-full animate-pulse-glow">
              <CurrentIcon className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-primary animate-spin" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 break-words overflow-wrap-anywhere max-w-full">
              Enhancing Your Image
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4 overflow-x-hidden max-w-full">
          <div className="flex justify-between text-sm sm:text-base overflow-x-hidden max-w-full">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="text-foreground font-bold text-lg">{Math.round(displayProgress)}%</span>
          </div>
          <Progress value={displayProgress} className="h-3 sm:h-4" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 overflow-x-hidden max-w-full">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={step.name}
                className={`flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary/10 text-primary scale-105' 
                    : isCompleted 
                    ? 'bg-accent/20 text-accent' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <StepIcon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${isActive ? 'animate-spin' : ''}`} />
                <span className="text-xs sm:text-sm text-center font-medium break-words overflow-wrap-anywhere max-w-full leading-tight">
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center overflow-x-hidden max-w-full">
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-5 md:mb-6 break-words overflow-wrap-anywhere max-w-full">
            Estimated time: 30-60 seconds
          </p>
          {onCancel && (
            <Button variant="outline" size="lg" onClick={onCancel} className="px-8 py-3">
              Cancel Processing
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};