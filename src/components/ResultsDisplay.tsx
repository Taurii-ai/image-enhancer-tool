import { useState, useRef, useEffect } from 'react';
import { Download, RotateCcw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useImageLoader } from '@/hooks/useImageLoader';

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
  console.log('🎯 RESULTS DISPLAY: Received enhancedImage:', enhancedImage);
  console.log('🎯 RESULTS DISPLAY: Received originalImage:', originalImage);
  
  // For now, directly use the enhanced image URL - simpler approach
  const finalEnhancedImage = enhancedImage;
  const [comparison, setComparison] = useState(10); // Show more enhanced image by default
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get the original image aspect ratio
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageAspectRatio(img.width / img.height);
    };
    img.src = originalImage;
  }, [originalImage]);

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
      // Download the enhanced image (use the loaded version)
      const response = await fetch(finalEnhancedImage);
      const blob = await response.blob();
      
      // Preserve the original file format and name
      const fileExtension = originalFile.name.split('.').pop() || 'jpg';
      const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
      const enhancedFileName = `${baseName}_enhanced.${fileExtension}`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = enhancedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download complete!",
        description: `Enhanced image saved as ${enhancedFileName}`,
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

  // Show loading state if no enhanced image
  if (!enhancedImage) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading enhanced image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-x-hidden max-w-full">
      {/* Debug Info */}
      <div className="p-4 bg-gray-100 rounded text-sm font-mono">
        <div>Enhanced URL: {enhancedImage}</div>
        <div>Original URL: {originalImage}</div>
        <div>Final URL: {finalEnhancedImage}</div>
      </div>
      
      {/* Results Header */}
      <Card className="p-2 sm:p-4 md:p-6 bg-card shadow-card border-border overflow-x-hidden max-w-full">
        <div className="flex flex-col gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Enhancement Complete! ✨
            </h3>
            <p className="text-muted-foreground">
              Your image has been upscaled with AI enhancement
            </p>
          </div>
          <div className="flex gap-3 justify-center sm:justify-start">
            <Button
              variant="outline"
              onClick={onStartOver}
              className="flex-1 sm:flex-none"
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </Button>
            <Button
              variant="hero"
              onClick={handleDownload}
              disabled={isDownloading}
              className="min-w-32 flex-1 sm:flex-none"
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

      {/* Simple Image Display for Debugging */}
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="text-2xl font-bold text-foreground mb-2">Results</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Original Image */}
            <div>
              <h5 className="text-lg font-semibold mb-2">Original</h5>
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-auto rounded-lg border"
                onLoad={() => console.log('✅ ORIGINAL IMAGE LOADED:', originalImage)}
                onError={(e) => console.error('❌ ORIGINAL IMAGE FAILED TO LOAD:', originalImage, e)}
              />
            </div>
            
            {/* Enhanced Image */}
            <div>
              <h5 className="text-lg font-semibold mb-2">Enhanced</h5>
              <img
                src={finalEnhancedImage}
                alt="Enhanced"
                className="w-full h-auto rounded-lg border"
                onLoad={() => console.log('✅ ENHANCED IMAGE LOADED:', finalEnhancedImage)}
                onError={(e) => {
                  console.error('❌ ENHANCED IMAGE FAILED TO LOAD:', finalEnhancedImage, e);
                }}
              />
            </div>
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