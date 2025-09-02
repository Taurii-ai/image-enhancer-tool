import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { useToast } from '@/hooks/use-toast';
import { createCheckout, getPlan, type PaymentData } from '@/services/payment';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, CreditCard, Shield, CheckCircle } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [useGoogleAuth, setUseGoogleAuth] = useState(false);
  
  // Get plan and billing from URL params
  const planId = searchParams.get('plan') || 'pro';
  const billing = (searchParams.get('billing') as 'monthly' | 'yearly') || 'monthly';
  
  const selectedPlan = getPlan(planId);

  useEffect(() => {
    if (!selectedPlan) {
      toast({
        title: "Invalid Plan",
        description: "The selected plan was not found. Redirecting to pricing.",
        variant: "destructive"
      });
      navigate('/pricing');
    }
  }, [selectedPlan, navigate, toast]);

  // Pre-fill form if user came from Google OAuth
  useEffect(() => {
    const fromGoogle = searchParams.get('google_oauth') === 'true';
    
    if (user && fromGoogle) {
      setCustomerEmail(user.email || '');
      // Try to get name from user metadata
      const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setCustomerName(name);
      setUseGoogleAuth(true);
    } else {
      // Clear any existing user data if not coming from Google
      setCustomerEmail('');
      setCustomerName('');
      setUseGoogleAuth(false);
    }
  }, [user, searchParams]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerEmail.trim() || !customerName.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please enter your name and email address.",
        variant: "destructive"
      });
      return;
    }

    // For non-Google users, require password
    if (!useGoogleAuth && !customerPassword.trim()) {
      toast({
        title: "Password Required", 
        description: "Please create a password for your account.",
        variant: "destructive"
      });
      return;
    }

    if (!useGoogleAuth && customerPassword.length < 6) {
      toast({
        title: "Password Too Short", 
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPlan) return;

    setIsLoading(true);

    try {
      // Create account if not using Google auth and not already logged in
      if (!useGoogleAuth && !user) {
        const { data, error } = await supabase.auth.signUp({
          email: customerEmail.trim(),
          password: customerPassword,
          options: {
            data: {
              full_name: customerName.trim(),
            }
          }
        });

        if (error) {
          toast({
            title: 'Account Creation Failed',
            description: error.message,
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Account Created!',
          description: 'Please check your email to confirm your account, then complete payment.',
        });
      }

      const paymentData: PaymentData = {
        planId: selectedPlan.id,
        billing,
        customerEmail: customerEmail.trim(),
        customerName: customerName.trim()
      };

      await createCheckout(paymentData);
      
    } catch (error) {
      console.error('Checkout failed:', error);
      toast({
        title: "Checkout Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/checkout?plan=${planId}&billing=${billing}&google_oauth=true`
        }
      });

      if (error) {
        toast({
          title: 'Google Sign-In Failed',
          description: error.message,
          variant: 'destructive'
        });
      }
      
      // OAuth redirect will handle the rest
    } catch (error) {
      console.error('Google sign-in failed:', error);
      toast({
        title: 'Google Sign-In Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };


  if (!selectedPlan) {
    return null; // Loading or will redirect
  }

  const price = billing === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly;
  const monthlyEquivalent = billing === 'yearly' ? (selectedPlan.priceYearly / 12).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-white rounded-lg">
              <EnhpixLogo className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-foreground">Enhpix</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pricing
          </Button>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Complete Your Purchase
          </h1>
          <p className="text-muted-foreground">
            You're just one step away from AI-powered image enhancement
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPlan.name} Plan</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {billing} billing
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${price}</div>
                    {monthlyEquivalent && (
                      <div className="text-sm text-muted-foreground">
                        ${monthlyEquivalent}/month
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">What's included:</h4>
                  <ul className="space-y-2">
                    {selectedPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Secure Payment</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your payment is secured by Stripe. We never store your payment information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Enter your information to complete the purchase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckout} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      disabled={isLoading}
                    />
                    {useGoogleAuth && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Signed in with Google
                      </p>
                    )}
                  </div>

                  {!useGoogleAuth && (
                    <div>
                      <Label htmlFor="password">Create Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        placeholder="Create a secure password"
                        required
                        disabled={isLoading}
                        minLength={6}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Password must be at least 6 characters long
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Processing..."
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Continue to Payment - ${price}
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">OR</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    disabled={isLoading || isGoogleLoading}
                    onClick={handleGoogleSignIn}
                  >
                    {isGoogleLoading ? (
                      <span className="mr-2">Connecting...</span>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285f4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34a853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#fbbc05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#ea4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>


                  <p className="text-xs text-center text-muted-foreground">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                    You can cancel anytime.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;