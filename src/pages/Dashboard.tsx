import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { ImageUploader } from '@/components/ImageUploader';
import { CategorySelector, EnhancementCategory } from '@/components/CategorySelector';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { enhanceImage, EnhancementProgress, EnhancementResult } from '@/services/imageEnhancement';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserSubscriptionInfo,
  consumeImageCredit,
  type UserSubscriptionInfo
} from '@/services/userSubscription';
import { Sparkles, Crown, Settings, LogOut, Upload, History } from 'lucide-react';

type ProcessingState = 'idle' | 'processing' | 'completed';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<EnhancementProgress | null>(null);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EnhancementCategory>('general');
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);

  // Update subscription info when component mounts and user changes
  useEffect(() => {
    if (user?.id) {
      getUserSubscriptionInfo(user.id).then(setSubscriptionInfo);
    }
  }, [user?.id]);

  // Authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading state while checking authentication or subscription info
  if (loading || !subscriptionInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user?.email) {
    return null;
  }

  const debugLog = (level: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[DASHBOARD ${level.toUpperCase()}] ${message}`, data || '');
    if ((window as any).debugLog) {
      (window as any).debugLog(level, `[DASHBOARD] ${message}`, data);
    }
  };

  const handleImageUpload = async (file: File) => {
    debugLog('info', '🚀 STARTING IMAGE UPLOAD', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    // Check and consume image credit before processing
    if (user?.id) {
      const creditResult = await consumeImageCredit(user.id);
      if (!creditResult.success) {
        toast({
          title: 'Credit Limit Reached',
          description: creditResult.error || 'You have reached your monthly limit.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    setCurrentFile(file);
    setProcessingState('processing');
    setProgress(null);
    setResult(null);

    try {
      debugLog('info', '📞 CALLING ENHANCE IMAGE FUNCTION', {
        userEmail: user.email,
        category: selectedCategory
      });
      
      const enhancementResult = await enhanceImage(file, setProgress, user.email, selectedCategory);
      
      debugLog('success', '✅ ENHANCEMENT COMPLETED', {
        originalUrl: enhancementResult?.originalUrl,
        enhancedUrlType: typeof enhancementResult?.enhancedUrl,
        enhancedUrlLength: enhancementResult?.enhancedUrl?.length,
        hasOriginalFile: !!enhancementResult?.originalFile
      });
      
      setResult(enhancementResult);
      setProcessingState('completed');
      
      // Refresh subscription info after successful enhancement
      if (user?.id) {
        getUserSubscriptionInfo(user.id).then(setSubscriptionInfo);
      }
      debugLog('info', '🔧 UPDATING UI STATE');
    } catch (error) {
      debugLog('error', '❌ ENHANCEMENT FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setProcessingState('idle');
    }
  };

  const handleStartOver = () => {
    setProcessingState('idle');
    setCurrentFile(null);
    setProgress(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <EnhpixLogo className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-foreground">Enhpix</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full">
              <Crown className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">{subscriptionInfo.planName}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                navigate('/settings');
              }}
              title="Account Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              await signOut();
              navigate('/');
            }}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Welcome back! 🎉
          </h1>
          <p className="text-muted-foreground">
            Transform your images with AI-powered enhancement technology
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 md:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Plan Card */}
            <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-accent" />
                  <CardTitle className="text-lg">Your Plan</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Plan:</span>
                    <span className="text-sm font-semibold text-foreground">{subscriptionInfo.planName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Images left:</span>
                    <span className="text-sm font-bold text-primary">{subscriptionInfo.imagesRemaining}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Used: {subscriptionInfo.imagesTotal - subscriptionInfo.imagesRemaining}</span>
                    <span>Total: {subscriptionInfo.imagesTotal}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all" 
                      style={{ width: `${(subscriptionInfo.imagesRemaining / subscriptionInfo.imagesTotal) * 100}%` }}
                    />
                  </div>
                </div>
                
                {subscriptionInfo.canUpgrade && (
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all"
                    onClick={() => navigate('/pricing')}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                )}
                
                {subscriptionInfo.daysRemaining > 0 && subscriptionInfo.status === 'active' && (
                  <div className="text-xs text-center text-muted-foreground">
                    {subscriptionInfo.daysRemaining} days remaining in {subscriptionInfo.billing} cycle
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Statistics</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month:</span>
                  <span className="text-sm font-semibold">{subscriptionInfo.imagesTotal - subscriptionInfo.imagesRemaining}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max Scale:</span>
                  <span className="text-sm font-semibold text-primary">High</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Quality:</span>
                  <span className="text-sm font-semibold text-accent capitalize">High</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Upload Section - Show when idle */}
            {processingState === 'idle' && (
              <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      Ready to Enhance?
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      Upload your image and watch our AI transform it into stunning high-resolution quality
                    </p>
                    
                    <div className="mb-6">
                      <CategorySelector 
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        disabled={processingState === 'processing'}
                      />
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <ImageUploader 
                        onImageUpload={handleImageUpload} 
                        isProcessing={processingState === 'processing'} 
                      />
                    </div>

                    {subscriptionInfo.imagesRemaining <= 0 && (
                      <div className="mt-6 p-4 bg-accent/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          No credits remaining.{' '}
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-accent font-semibold"
                            onClick={() => navigate('/pricing')}
                          >
                            Upgrade your plan
                          </Button>{' '}
                          to continue enhancing images
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Section - Show while processing */}
            {processingState === 'processing' && currentFile && (
              <ProcessingStatus
                isProcessing={true}
                progress={progress}
                onCancel={handleStartOver}
              />
            )}

            {/* Results Section - Show when completed */}
            {processingState === 'completed' && result && currentFile && (
              <ResultsDisplay
                originalImage={result.originalUrl}
                enhancedImage={result.enhancedUrl}
                originalFile={currentFile}
                onStartOver={handleStartOver}
                planType={subscriptionInfo.planName.toLowerCase()}
              />
            )}

            {/* Recent Activity - Show only when idle */}
            {processingState === 'idle' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl">Recent Enhancements</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      View All
                    </Button>
                  </div>
                  <CardDescription>
                    Your enhanced images will appear here once you start processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="font-medium text-foreground mb-2">No enhancements yet</h4>
                    <p className="text-sm">Upload your first image to get started!</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;