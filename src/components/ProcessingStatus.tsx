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
    <Card className="p-8 sm:p-12 md:p-16 lg:p-20 bg-card shadow-xl border-border overflow-x-hidden w-full max-w-5xl mx-auto">
      <div className="space-y-8 sm:space-y-10 md:space-y-12 lg:space-y-16 overflow-x-hidden max-w-full">
        <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 overflow-x-hidden max-w-full">
          <div className="flex justify-center">
            <div className="p-6 sm:p-8 md:p-10 lg:p-12 bg-primary/10 rounded-full animate-pulse-glow">
              <CurrentIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 text-primary animate-spin" />
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-3 sm:mb-4 md:mb-6 break-words overflow-wrap-anywhere max-w-full">
              Enhancing Your Image
            </h3>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
          <div className="flex justify-between text-lg sm:text-xl md:text-2xl overflow-x-hidden max-w-full">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="text-foreground font-bold text-2xl sm:text-3xl md:text-4xl">{Math.round(displayProgress)}%</span>
          </div>
          <Progress value={displayProgress} className="h-4 sm:h-5 md:h-6" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 md:gap-8 overflow-x-hidden max-w-full">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={step.name}
                className={`flex flex-col items-center gap-3 sm:gap-4 md:gap-5 p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary/10 text-primary scale-105' 
                    : isCompleted 
                    ? 'bg-accent/20 text-accent' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <StepIcon className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 ${isActive ? 'animate-spin' : ''}`} />
                <span className="text-sm sm:text-base md:text-lg lg:text-xl text-center font-medium break-words overflow-wrap-anywhere max-w-full leading-tight">
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center overflow-x-hidden max-w-full">
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 break-words overflow-wrap-anywhere max-w-full">
            Estimated time: 30-60 seconds
          </p>
          {onCancel && (
            <Button variant="outline" size="lg" onClick={onCancel} className="px-12 py-4 text-lg">
              Cancel Processing
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};