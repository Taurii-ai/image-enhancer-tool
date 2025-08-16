import { useState, useRef, useEffect } from 'react';
import { Download, RotateCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface ResultsDisplayProps {
  originalImage: string;
  enhancedImage: string;
  originalFile: File;
  onStartOver: () => void;
  planType?: string;
}

export const ResultsDisplay = ({ 
  originalImage, 
  enhancedImage, 
  originalFile, 
  onStartOver,
  planType = 'trial'
}: ResultsDisplayProps) => {
  const [comparison, setComparison] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle mouse and touch events for smooth slider interaction
  const getPositionFromEvent = (e: MouseEvent | TouchEvent): number => {
    if (!containerRef.current) return 50;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((clientX - rect.left) / rect.width) * 100;
    
    return Math.max(0, Math.min(100, position));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setComparison(getPositionFromEvent(e.nativeEvent));
    // Add haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setComparison(getPositionFromEvent(e));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setComparison(getPositionFromEvent(e.nativeEvent));
    // Add haptic feedback on touch devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setComparison(getPositionFromEvent(e));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Simulate download process
      const response = await fetch(enhancedImage);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced_${originalFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download complete!",
        description: "Your enhanced image has been saved.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading your image.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-x-hidden max-w-full">
      {/* Results Header */}
      <Card className="p-2 sm:p-4 md:p-6 bg-card shadow-card border-border overflow-x-hidden max-w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Enhancement Complete! ✨
            </h3>
            <p className="text-muted-foreground">
              Your image has been upscaled with AI enhancement
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onStartOver}
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </Button>
            <Button
              variant="hero"
              onClick={handleDownload}
              disabled={isDownloading}
              className="min-w-32"
            >
              {isDownloading ? (
                <>
                  <Download className="w-4 h-4 animate-pulse" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Image Comparison - Framer Style */}
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="text-2xl font-bold text-foreground mb-2">See the difference instantly</h4>
            <p className="text-muted-foreground">
              Drag the slider to compare before and after enhancement
            </p>
          </div>

          <div 
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden bg-black aspect-video cursor-grab active:cursor-grabbing select-none shadow-2xl group"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{ userSelect: 'none' }}
          >
            {/* Enhanced image (background - "After") */}
            <img
              src={enhancedImage}
              alt="Enhanced"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            
            {/* Original image overlay with clip path (foreground - "Before") */}
            <div 
              className="absolute inset-0 transition-all duration-75 ease-out"
              style={{ 
                clipPath: `inset(0 ${100 - comparison}% 0 0)`,
              }}
            >
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Labels */}
            <div className="absolute top-6 left-6 z-10">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium">
                Before
              </div>
            </div>
            <div className="absolute top-6 right-6 z-10">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium">
                After
              </div>
            </div>

            {/* Vertical Divider Line */}
            <div 
              className={`absolute top-0 bottom-0 bg-white transition-all duration-75 z-20 ${
                isDragging ? 'w-1 shadow-2xl' : 'w-0.5 shadow-xl'
              }`}
              style={{ 
                left: `${comparison}%`,
                transform: 'translateX(-50%)',
              }}
            />

            {/* Draggable Handle */}
            <div 
              className="absolute top-1/2 z-30 cursor-grab active:cursor-grabbing"
              style={{ 
                left: `${comparison}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className={`bg-white rounded-full flex items-center justify-center transition-all duration-200 border border-gray-100 ${
                isDragging 
                  ? 'w-14 h-14 scale-110 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' 
                  : 'w-12 h-12 hover:scale-105 shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)]'
              }`}>
                <Code className={`text-gray-600 ${isDragging ? 'w-5 h-5' : 'w-4 h-4'}`} strokeWidth={1.5} />
              </div>
            </div>

            {/* Subtle guide line hint */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-white/20 transition-opacity duration-200 opacity-0 group-hover:opacity-100 z-10"
              style={{ 
                left: `${comparison}%`,
                transform: 'translateX(-50%)',
              }}
            />

            {/* Overlay for better interaction */}
            <div className="absolute inset-0 z-10" />
          </div>

          {/* Subtle instruction text */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Click and drag anywhere on the image to compare
            </p>
          </div>
        </div>
      </Card>

      {/* Enhancement Details */}
      <Card className="p-6 bg-card shadow-card border-border">
        <h4 className="font-medium text-foreground mb-4">Enhancement Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {planType === 'premium' ? '16x' : planType === 'pro' ? '8x' : '4x'}
            </div>
            <div className="text-sm text-muted-foreground">Resolution Increase</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-accent mb-1">
              {planType === 'premium' ? 'Ultra' : planType === 'pro' ? 'Premium' : 'Basic'}
            </div>
            <div className="text-sm text-muted-foreground">AI Quality</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground mb-1">
              {planType === 'premium' ? '99%' : planType === 'pro' ? '97%' : '95%'}
            </div>
            <div className="text-sm text-muted-foreground">Quality Retained</div>
          </div>
        </div>
        
        {/* Premium Features */}
        {(planType === 'pro' || planType === 'premium') && (
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="font-medium text-foreground">
                {planType === 'premium' ? 'Premium' : 'Pro'} Features Applied
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1 h-1 bg-accent rounded-full"></div>
                <span>Advanced noise reduction</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1 h-1 bg-accent rounded-full"></div>
                <span>Enhanced edge preservation</span>
              </div>
              {planType === 'premium' && (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1 h-1 bg-accent rounded-full"></div>
                    <span>Color depth optimization</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1 h-1 bg-accent rounded-full"></div>
                    <span>Texture enhancement</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};