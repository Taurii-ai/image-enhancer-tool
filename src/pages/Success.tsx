import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { useToast } from '@/hooks/use-toast';
import { verifyPaymentSession, getPlanById, isRealStripe } from '@/services/stripe';
import { updateSubscriptionAfterPayment } from '@/services/subscriptionManager';
import { trackPaymentEvent, trackConversionStep, trackSubscriptionEvent } from '@/services/analytics';
import { CheckCircle, Sparkles, ArrowRight, Mail, Crown } from 'lucide-react';

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const isDemoMode = searchParams.get('demo') === 'true';
  const planId = searchParams.get('plan');
  const billing = searchParams.get('billing');
  const customerNameFromUrl = searchParams.get('name');
  const customerEmailFromUrl = searchParams.get('email');
  
  const selectedPlan = planId ? getPlanById(planId) : null;

  useEffect(() => {
    const verifyPayment = async () => {
      if (isDemoMode) {
        // Demo mode - simulate successful payment with real customer data
        setPaymentData({
          id: 'demo_session',
          payment_status: 'paid',
          customer: {
            email: customerEmailFromUrl || 'demo@enhpix.com',
            name: customerNameFromUrl || 'Demo Customer'
          },
          subscription: {
            id: 'sub_demo',
            status: 'active',
            plan: planId,
            billing: billing
          }
        });
        
        // Update subscription for demo mode too
        if (planId && billing) {
          updateSubscriptionAfterPayment(
            planId as 'basic' | 'pro' | 'premium',
            billing as 'monthly' | 'yearly',
            'sub_demo_' + Math.random().toString(36).substr(2, 9)
          );
          
          // Track demo payment completion
          const plan = getPlanById(planId);
          const amount = billing === 'yearly' ? plan?.priceYearly : plan?.priceMonthly;
          if (plan && amount) {
            trackPaymentEvent('payment_succeeded', planId, amount);
            trackConversionStep('payment_completed', planId);
            trackSubscriptionEvent('subscription_started', planId, billing as 'monthly' | 'yearly', amount);
          }
        }
        
        setIsLoading(false);
        return;
      }

      if (!sessionId) {
        setError('No payment session found');
        setIsLoading(false);
        return;
      }

      try {
        const data = await verifyPaymentSession(sessionId);
        setPaymentData(data);
        
        // Update subscription after successful payment verification
        if (data.payment_status === 'paid' && planId && billing) {
          const subscriptionId = data.subscription?.id || 'demo_subscription';
          updateSubscriptionAfterPayment(
            planId as 'basic' | 'pro' | 'premium',
            billing as 'monthly' | 'yearly',
            subscriptionId
          );
          
          // Track real payment completion
          const plan = getPlanById(planId);
          const amount = data.amount_total / 100; // Stripe amounts are in cents
          trackPaymentEvent('payment_succeeded', planId, amount);
          trackConversionStep('payment_completed', planId);
          trackSubscriptionEvent('subscription_started', planId, billing as 'monthly' | 'yearly', amount);
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
        setError('Failed to verify payment. Please contact support.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, isDemoMode]);

  const handleGetStarted = () => {
    if (!isRealStripe) {
      toast({
        title: "Demo Mode",
        description: "In production, you would have full access to the app!",
      });
    }
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Payment Verification Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/pricing')} className="w-full">
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border">
        <nav className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-white rounded-lg">
              <EnhpixLogo className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-foreground">Enhpix</span>
          </div>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Welcome to Enhpix! 🎉
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Your {selectedPlan?.name || 'subscription'} plan is now active
          </p>
          {!isRealStripe && (
            <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg inline-block">
              Demo Mode - In production, your payment would be processed by Stripe
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Payment Confirmation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Payment Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Customer:</span>
                  <span className="text-sm font-medium">{paymentData?.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium">{paymentData?.customer?.email}</span>
                </div>
                {selectedPlan && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan:</span>
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3 text-primary" />
                        {selectedPlan.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Billing:</span>
                      <span className="text-sm font-medium capitalize">{billing}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-sm font-medium capitalize text-green-600">
                    {paymentData?.subscription?.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="w-4 h-4" />
                  <span>Confirmation email sent</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Check your inbox for receipt and account details
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Start Enhancing</h4>
                    <p className="text-xs text-muted-foreground">Upload your first image and see the magic happen</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Download Results</h4>
                    <p className="text-xs text-muted-foreground">Get your high-resolution enhanced images</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Manage Account</h4>
                    <p className="text-xs text-muted-foreground">Access your dashboard and subscription settings</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <div className="space-y-4">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Enhancing Images
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <div className="flex justify-center gap-4 text-sm">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
                View Plans
              </Button>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              <h3 className="font-medium mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our support team is here to help you get the most out of Enhpix
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Success;