import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '@/hooks/useAuth'; // Temporarily disabled to avoid auth issues
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Wand2, Zap, Menu, X } from 'lucide-react';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { ImageUploader } from '@/components/ImageUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { Button } from '@/components/ui/button';
import { enhanceImage, type EnhancementProgress } from '@/services/imageEnhancement';
import heroBackground from '@/assets/hero-bg.jpg';

type AppState = 'upload' | 'processing' | 'results';

const Index = () => {
  const navigate = useNavigate();
  // const { user, isAuthenticated, profile } = useAuth(); // Temporarily disabled
  const { toast } = useToast();
  const [appState, setAppState] = useState<AppState>('upload');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhancementProgress, setEnhancementProgress] = useState<EnhancementProgress | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  
  const handleNavigation = (path: string) => {
    try {
      console.log(`Navigating to: ${path}`);
      navigate(path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    // FOR TESTING ONLY - normally would require payment first
    // navigate('/pricing');
    // return;
    
    try {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAppState('processing');
      setEnhancementProgress({ status: 'starting', progress: 0 });

      // Test user data (normally would come from authentication)
      const testUserEmail = 'test@enhpix.com';
      
      console.log('🔍 TESTING: Processing image for user:', testUserEmail);

      const result = await enhanceImage(file, (progress) => {
        setEnhancementProgress(progress);
      }, testUserEmail);

      setEnhancedUrl(result.enhancedUrl);
      setAppState('results');
      
      toast({
        title: "Enhancement Complete!",
        description: "Your image has been successfully enhanced with AI. Check console for user data logs.",
      });

    } catch (error) {
      console.error('Enhancement failed:', error);
      setAppState('upload');
      setEnhancementProgress(null);
      
      toast({
        title: "Enhancement Failed",
        description: "Sorry, we couldn't enhance your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const debugReplicate = async () => {
    try {
      console.log('🔍 Running Replicate API debug...');
      
      const response = await fetch('/api/debug-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testApiCall: true })
      });

      const result = await response.json();
      setDebugInfo(result);
      
      console.log('🔍 Debug Result:', result);
      
      // Show result in toast
      if (result.summary?.overallStatus === 'READY') {
        toast({
          title: "✅ Replicate API Ready!",
          description: `Tests passed: ${result.summary.passedTests}`,
        });
      } else {
        toast({
          title: "❌ API Issues Found",
          description: `Tests passed: ${result.summary?.passedTests || '0/0'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Debug failed:', error);
      toast({
        title: "Debug Failed",
        description: "Could not test API connection",
        variant: "destructive",
      });
    }
  };

  const handleStartOver = () => {
    setAppState('upload');
    setUploadedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (enhancedUrl && enhancedUrl !== previewUrl) {
      URL.revokeObjectURL(enhancedUrl);
      setEnhancedUrl(null);
    }
  };

  const handleCancelProcessing = () => {
    setAppState('upload');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat overflow-x-hidden max-w-full"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-background/90" />
        <div className="relative z-10 overflow-x-hidden max-w-full">
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-[9999] p-4 md:p-6 transition-all duration-300 bg-white/98 backdrop-blur-lg border-b border-border shadow-lg">
            <nav className="max-w-7xl mx-auto flex items-center justify-between overflow-x-hidden w-full">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigation('/')}>
                <div className="p-2 bg-white rounded-lg">
                  <EnhpixLogo className="w-8 h-8" />
                </div>
                <span className="text-xl font-bold text-foreground">Enhpix</span>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-3">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleNavigation('/')}
                  className="bg-primary text-primary-foreground"
                >
                  Home
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleNavigation('/about')}
                  className="text-foreground hover:text-primary"
                >
                  About
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleNavigation('/pricing')}
                  className="text-foreground hover:text-primary"
                >
                  Pricing
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleNavigation('/login')}>
                  Sign In
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-foreground"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden absolute top-full left-0 right-0 border-b border-border z-[9998] bg-white/95 backdrop-blur-sm">
                <div className="flex flex-col p-4 space-y-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => {
                      handleNavigation('/');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start bg-primary text-primary-foreground"
                  >
                    Home
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      handleNavigation('/about');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-foreground hover:text-primary"
                  >
                    About
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      handleNavigation('/pricing');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-foreground hover:text-primary"
                  >
                    Pricing
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      handleNavigation('/login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            )}
          </header>

          {/* Hero Content */}
          {appState === 'upload' && (
            <div className="px-2 sm:px-3 md:px-6 pb-6 sm:pb-8 md:pb-20 pt-20 sm:pt-24 md:pt-28">
              <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4 md:space-y-8 overflow-x-hidden w-full">
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  <h1 className="text-lg sm:text-xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight px-1 sm:px-2 break-words overflow-wrap-anywhere max-w-full">
                    Enhance Your Images with{' '}
                    <span className="bg-gradient-primary bg-clip-text text-transparent">
                      Enhpix AI
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-1 sm:px-2 break-words overflow-wrap-anywhere">
                    Transform low-resolution images into stunning high-quality masterpieces. 
                    Our advanced AI upscales your photos up to 4x while preserving every detail.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 md:gap-4 text-xs text-muted-foreground px-1 sm:px-2 overflow-x-hidden w-full">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-primary" />
                    <span className="text-xs sm:text-sm">AI-Powered Enhancement</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-accent" />
                    <span className="text-xs sm:text-sm">Lightning Fast</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wand2 className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-primary" />
                    <span className="text-xs sm:text-sm">Professional Quality</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-12">
        <div className="max-w-4xl mx-auto">
          {appState === 'upload' && (
            <ImageUploader onImageUpload={handleImageUpload} />
          )}

          {appState === 'processing' && (
            <ProcessingStatus 
              isProcessing={true}
              progress={enhancementProgress}
              onCancel={handleCancelProcessing}
            />
          )}

          {appState === 'results' && previewUrl && enhancedUrl && uploadedFile && (
            <ResultsDisplay
              originalImage={previewUrl}
              enhancedImage={enhancedUrl}
              originalFile={uploadedFile}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>

      {/* Features Section */}
      {appState === 'upload' && (
        <div className="px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-20 bg-gradient-subtle overflow-x-hidden max-w-full">
          <div className="max-w-6xl mx-auto overflow-x-hidden w-full">
            <div className="text-center mb-4 sm:mb-6 md:mb-16 px-1 sm:px-2">
              <h2 className="text-base sm:text-lg md:text-3xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">
                Why Choose Enhpix?
              </h2>
              <p className="text-xs sm:text-sm md:text-lg text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                Advanced technology meets simple, intuitive design
              </p>
            </div>

            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-8 px-1 sm:px-2">
              <div className="text-center p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl shadow-card border border-border">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-md sm:rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-1 sm:mb-2 break-words overflow-wrap-anywhere max-w-full">AI Enhancement</h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                  State-of-the-art neural networks analyze and enhance every pixel for maximum quality.
                </p>
              </div>

              <div className="text-center p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl shadow-card border border-border">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-accent/10 rounded-md sm:rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-accent" />
                </div>
                <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-1 sm:mb-2 break-words overflow-wrap-anywhere max-w-full">Lightning Fast</h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                  Process your images in seconds, not minutes. Optimized for speed without compromising quality.
                </p>
              </div>

              <div className="text-center p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl shadow-card border border-border">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-md sm:rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-1 sm:mb-2 break-words overflow-wrap-anywhere max-w-full">Professional Results</h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                  Get print-ready, high-resolution images suitable for professional use and large displays.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-8 border-t border-border overflow-x-hidden max-w-full">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-3 md:gap-4 overflow-x-hidden w-full">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="p-1 bg-white rounded">
              <EnhpixLogo className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <span className="text-sm sm:text-base font-medium text-foreground">Enhpix</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground overflow-x-hidden">
            <button 
              onClick={() => handleNavigation('/privacy')} 
              className="hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
            >
              Privacy
            </button>
            <button 
              onClick={() => handleNavigation('/terms')} 
              className="hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
            >
              Terms
            </button>
            <button 
              onClick={() => handleNavigation('/support')} 
              className="hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
            >
              Support
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
