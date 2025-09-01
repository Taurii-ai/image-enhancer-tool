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
  
  // Use the enhanced image URL directly - no aggressive cleaning needed for clean API
  const finalEnhancedImage = typeof enhancedImage === 'string' ? enhancedImage : String(enhancedImage || '');
  
  console.log('🔗 Using enhanced image URL directly:', finalEnhancedImage);
  const [comparison, setComparison] = useState(10); // Show more enhanced image by default
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState({ original: false, enhanced: false });
  
  // Initialize loading state once when enhanced image URL changes
  useEffect(() => {
    if (finalEnhancedImage) {
      console.log('🔄 NEW ENHANCED IMAGE URL RECEIVED:', finalEnhancedImage);
      console.log('🔍 URL type:', typeof finalEnhancedImage);
      console.log('🔍 URL starts with https:', finalEnhancedImage.startsWith('https://'));
      
      // Test if URL is accessible
      fetch(finalEnhancedImage, { method: 'HEAD' })
        .then(response => {
          console.log('🔍 HEAD request result:', response.status, response.statusText);
          if (!response.ok) {
            console.error('❌ URL not accessible via HEAD:', response.status);
          }
        })
        .catch(err => {
          console.error('❌ HEAD request failed:', err);
        });
      
      // Reset loading state for new image
      setImagesLoaded(prev => ({ ...prev, enhanced: false }));
      
      // Fallback: hide loading after 5 seconds even if onLoad doesn't fire
      const timeout = setTimeout(() => {
        console.log('⏰ LOADING TIMEOUT - forcing enhanced image to show');
        setImagesLoaded(prev => ({ ...prev, enhanced: true }));
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [finalEnhancedImage]);
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
      console.log('🔄 Attempting to download:', finalEnhancedImage);
      const response = await fetch(finalEnhancedImage);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Preserve the original file format and name
      const fileExtension = originalFile.name.split('.').pop() || 'jpg';
      const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
      const enhancedFileName = `${baseName}_enhanced.${fileExtension}`;
      
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile approach - open clean image in new tab for long-press save
        const imageUrl = window.URL.createObjectURL(blob);
        
        // For mobile, create a clean page with just the enhanced image
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Enhanced Image - Long press to save</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
                <style>
                  * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                  }
                  body { 
                    background: #000; 
                    display: flex; 
                    flex-direction: column;
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    padding: 60px 10px 20px;
                  }
                  .image-container {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    position: relative;
                  }
                  img { 
                    max-width: 100%; 
                    max-height: 100%;
                    object-fit: contain;
                    display: block;
                    /* Disable any touch interactions that might interfere */
                    pointer-events: auto;
                    user-select: none;
                    -webkit-user-select: none;
                    -webkit-touch-callout: default;
                  }
                  .instructions {
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.9);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 25px;
                    font-size: 14px;
                    text-align: center;
                    z-index: 1000;
                    font-weight: 500;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                  }
                  .close-btn {
                    position: fixed;
                    top: 10px;
                    right: 15px;
                    background: rgba(255,255,255,0.9);
                    color: #000;
                    border: none;
                    padding: 12px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    z-index: 1000;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    font-weight: bold;
                  }
                  .download-hint {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-size: 12px;
                    text-align: center;
                    z-index: 1000;
                  }
                  /* Ensure the image is fully interactive for long press */
                  img:hover {
                    cursor: pointer;
                  }
                </style>
              </head>
              <body>
                <div class="instructions">📱 Long press image below to save to Photos</div>
                <button class="close-btn" onclick="window.close()" aria-label="Close">&times;</button>
                <div class="image-container">
                  <img src="${imageUrl}" alt="Enhanced Image - Long press to save" />
                </div>
                <div class="download-hint">💡 Tap and hold the image, then select "Save to Photos"</div>
                <script>
                  // Ensure the image is fully loaded and interactable
                  const img = document.querySelector('img');
                  img.addEventListener('load', function() {
                    console.log('Image loaded and ready for long-press save');
                  });
                  
                  // Prevent any default behaviors that might interfere
                  document.addEventListener('touchstart', function(e) {
                    if (e.target.tagName === 'IMG') {
                      // Allow the touch to proceed normally for long-press save
                      return true;
                    }
                  });
                </script>
              </body>
            </html>
          `);
        }
        
        // Clean up after 30 seconds
        setTimeout(() => {
          window.URL.revokeObjectURL(imageUrl);
        }, 30000);
        
        toast({
          title: "Image opened!",
          description: "Long press the image to save to your Photos app",
        });
      } else {
        // Desktop approach - traditional download
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = enhancedFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        toast({
          title: "Download complete!",
          description: `Enhanced image saved as ${enhancedFileName}`,
        });
      }
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

  // Show loading state if no enhanced image URL is provided
  if (!enhancedImage || enhancedImage === '') {
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

      {/* Image Comparison - Beautiful Slider */}
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
            className="relative rounded-2xl overflow-hidden bg-black cursor-grab active:cursor-grabbing select-none shadow-2xl group"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{ 
              userSelect: 'none',
              aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : '16/9',
              maxHeight: '70vh',
              width: '100%'
            }}
          >
            {/* Loading overlay - less obstructive */}
            {!imagesLoaded.enhanced && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded-full z-20">
                Loading enhanced...
              </div>
            )}
            
            {/* Enhanced image (background - "After") */}
            <img
              src={finalEnhancedImage}
              alt="Enhanced"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              onLoad={() => {
                console.log('✅ ENHANCED IMAGE LOADED:', finalEnhancedImage);
                setImagesLoaded(prev => ({ ...prev, enhanced: true }));
              }}
              onError={(e) => {
                console.error('❌ Enhanced image failed to load:', finalEnhancedImage);
                console.error('❌ Error details:', e);
                setImagesLoaded(prev => ({ ...prev, enhanced: true }));
              }}
            />
            
            {/* Original image overlay with clip path (foreground - "Before") */}
            <div 
              className="absolute inset-0"
              style={{ 
                clipPath: `inset(0 ${100 - comparison}% 0 0)`,
              }}
            >
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-full object-cover"
                draggable={false}
                onLoad={() => {
                  console.log('✅ ORIGINAL IMAGE LOADED:', originalImage);
                  setImagesLoaded(prev => ({ ...prev, original: true }));
                }}
                onError={(e) => {
                  console.error('❌ ORIGINAL IMAGE FAILED TO LOAD:', originalImage, e);
                }}
              />
            </div>

            {/* Labels */}
            <div className="absolute top-20 left-6 z-10">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium">
                Before
              </div>
            </div>
            <div className="absolute top-20 right-6 z-10">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium">
                After
              </div>
            </div>

            {/* Vertical Divider Line */}
            <div 
              className={`absolute top-0 bottom-0 bg-white z-20 ${
                isDragging ? 'w-1' : 'w-0.5'
              }`}
              style={{ 
                left: `${comparison}%`,
                transform: 'translateX(-50%)',
                boxShadow: isDragging 
                  ? '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)' 
                  : '0 0 10px rgba(255,255,255,0.2)',
                transition: 'width 100ms ease-out, box-shadow 100ms ease-out'
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
              <div 
                className={`bg-white rounded-full flex items-center justify-center border border-gray-100 ${
                  isDragging ? 'w-14 h-14' : 'w-12 h-12'
                }`}
                style={{
                  transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isDragging 
                    ? '0 8px 30px rgba(0,0,0,0.12)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                  transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, width 100ms ease-out, height 100ms ease-out'
                }}
              >
                <Code 
                  className={`text-gray-600 ${isDragging ? 'w-5 h-5' : 'w-4 h-4'}`} 
                  strokeWidth={1.5}
                  style={{ transition: 'width 100ms ease-out, height 100ms ease-out' }}
                />
              </div>
            </div>

            {/* Overlay for interaction */}
            <div className="absolute inset-0 z-10" />
          </div>

          {/* Instruction text */}
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