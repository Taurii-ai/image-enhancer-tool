import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [defaultTab, setDefaultTab] = useState('login');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check for tab parameter
    const tab = searchParams.get('tab');
    if (tab === 'signup') {
      setDefaultTab('signup');
    }

    // Reset redirect flag when user logs out
    if (!isAuthenticated && hasRedirected) {
      setHasRedirected(false);
      setIsRedirecting(false);
    }

    // Redirect if already authenticated - but only once and prevent blue screen
    if (isAuthenticated && !hasRedirected && !isRedirecting) {
      setHasRedirected(true);
      setIsRedirecting(true);
      
      // Add small delay to prevent blue screen on refresh
      setTimeout(() => {
        handleRedirectAfterAuth();
      }, 100);
      return;
    }
  }, [isAuthenticated, hasRedirected, searchParams, isRedirecting]);

  const handleRedirectAfterAuth = async () => {
    const redirect = searchParams.get('redirect');
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    const isGoogleOAuth = searchParams.get('google_oauth') === 'true' || 
                         sessionStorage.getItem('google_oauth_attempt') === 'true';
    
    // Clear session storage flag after checking
    if (sessionStorage.getItem('google_oauth_attempt') === 'true') {
      sessionStorage.removeItem('google_oauth_attempt');
      console.log('🔍 GOOGLE OAUTH: Found session storage flag, clearing it');
    }
    
    console.log('🔍 REDIRECT DEBUG:', { 
      redirect, 
      plan, 
      billing, 
      isGoogleOAuth,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Handle checkout redirect immediately - don't check user profiles for checkout flow
    if (redirect === 'checkout' && plan && billing) {
      navigate(`/checkout?plan=${plan}&billing=${billing}`);
      return;
    } else if (redirect === 'dashboard') {
      // After payment, allow access to dashboard
      navigate('/dashboard');
      return;
    } else {
      // For Google OAuth users, just go to dashboard - let dashboard handle subscription checks
      console.log('✅ GOOGLE LOGIN: Redirecting to dashboard directly');
      navigate('/dashboard');
      return;
    }
  };

  // TEMP LEGACY CODE (keeping for reference but not using):
  const handleRedirectAfterAuthOLD = async () => {
    const redirect = searchParams.get('redirect');
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    
    if (redirect === 'checkout' && plan && billing) {
      navigate(`/checkout?plan=${plan}&billing=${billing}`);
      return;
    } else if (redirect === 'dashboard') {
      navigate('/dashboard');
      return;  
    } else {
      // Check if user has an active subscription
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // First check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          // Profile exists - check if they have an active plan in user_plans table
          const { data: userPlan, error: planError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (userPlan) {
            // User has an active plan - they can access dashboard
            console.log('✅ LOGIN: User found in user_plans, accessing dashboard', userPlan);
            navigate('/dashboard');
            return;
          } else {
            // Check if user has a cancelled plan in user_plans
            const { data: cancelledPlan } = await supabase
              .from('user_plans')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'cancelled')
              .single();

            if (cancelledPlan && isGoogleOAuth) {
              // Cancelled user with Google OAuth - redirect to pricing
              console.log('❌ LOGIN: Cancelled Google OAuth user - redirecting to pricing');
              toast({
                title: 'Subscription Cancelled',
                description: 'Your subscription was cancelled. Please choose a new plan to continue.',
                variant: 'destructive'
              });
              navigate('/pricing');
            } else if (isGoogleOAuth) {
              // Only show error and redirect to pricing for Google OAuth users without plans
              console.log('❌ LOGIN: Google OAuth user not in user_plans');
              toast({
                title: 'No Active Subscription',
                description: 'Please choose a plan to access the image enhancer.',
                variant: 'destructive'
              });
              navigate('/pricing');
            } else {
              // Regular users without plans - just stay on login page (they can try email/password)
              console.log('ℹ️ LOGIN: Regular user not in user_plans - staying on login');
            }
          }
        } else if (profileError && profileError.code === 'PGRST116' && isGoogleOAuth) {
          // Profile doesn't exist - for new Google users, go to pricing
          console.log('❌ LOGIN: New Google OAuth user - redirecting to pricing');
          toast({
            title: 'Account Not Found',
            description: 'Create an account by choosing a subscription plan.',
            variant: 'destructive'
          });
          navigate('/pricing');
        } else if (profileError && isGoogleOAuth) {
          // Other profile error for Google OAuth, go to pricing
          console.log('❌ LOGIN: Google OAuth profile error - redirecting to pricing');
          toast({
            title: 'Choose a Plan First', 
            description: 'Select a subscription plan to continue.',
            variant: 'destructive'
          });
          navigate('/pricing');
        }
      } else if (isGoogleOAuth) {
        // No user from Google OAuth, go to pricing
        console.log('❌ LOGIN: No user from Google OAuth - redirecting to pricing');
        toast({
          title: 'Create an Account First',
          description: 'Please choose a subscription plan to create your account.',
          variant: 'destructive'
        });
        navigate('/pricing');
      } else {
        // Non-Google auth users without user data - just stay on login
        console.log('ℹ️ LOGIN: No user data for non-Google auth - staying on login');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Invalid Credentials',
            description: 'The email or password you entered is incorrect.',
            variant: 'destructive'
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'Email Not Confirmed',
            description: 'Please check your email and confirm your account.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Login Failed',
            description: error.message,
            variant: 'destructive'
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: 'Login Successful!',
          description: 'Welcome back to Enhpix!',
        });
        handleRedirectAfterAuth();
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Signup is handled by redirecting to pricing page
  // All signup logic moved to checkout flow

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🔧 PASSWORD RESET: Attempting for email:', forgotPasswordEmail.trim());
      
      // Check what we actually have in profiles
      const { data: allCustomers, error: allError } = await supabase
        .from('profiles')
        .select('email, stripe_customer_id')
        .not('stripe_customer_id', 'is', null);
      
      console.log('🔍 ALL CUSTOMERS WITH STRIPE IDs:', allCustomers);
      console.log('🔍 LOOKING FOR EMAIL:', forgotPasswordEmail.trim());

      const { data: paidCustomer, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', forgotPasswordEmail.trim())
        .single();

      console.log('🔍 CUSTOMER FOUND:', paidCustomer);
      console.log('🔍 CUSTOMER ERROR:', customerError);

      if (!paidCustomer) {
        toast({
          title: 'Account Not Found',
          description: 'No profile found with that email.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      if (!paidCustomer.stripe_customer_id) {
        toast({
          title: 'Account Not Found',
          description: 'Only paying customers can reset passwords.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ CUSTOMER HAS STRIPE ID:', paidCustomer.stripe_customer_id);

      // User is verified paid customer - send reset email
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // For verified user_plans users, always show success even if auth fails
      if (error) {
        console.log('Auth error but user is verified paid customer, showing success anyway');
      }

      console.log('✅ PASSWORD RESET: Email sent successfully');
      toast({
        title: 'Password Reset Sent',
        description: 'Check your email for a password reset link. Check spam folder if needed.',
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error) {
      console.error('Password reset failed:', error);
      toast({
        title: 'Reset Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      // Check if we're coming from a specific plan selection
      const redirect = searchParams.get('redirect');
      const plan = searchParams.get('plan');
      const billing = searchParams.get('billing');
      
      // Store Google OAuth attempt in session storage as backup
      sessionStorage.setItem('google_oauth_attempt', 'true');
      console.log('🔍 GOOGLE OAUTH: Setting session storage flag');
      
      // Always redirect to login so handleRedirectAfterAuth can run proper logic
      // Add a flag to indicate this is a Google OAuth attempt
      let redirectTo = `${window.location.origin}/login?google_oauth=true`;
      if (redirect === 'checkout' && plan && billing) {
        redirectTo = `${window.location.origin}/login?redirect=checkout&plan=${plan}&billing=${billing}&google_oauth=true`;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo
        }
      });

      if (error) {
        toast({
          title: 'Google Sign-In Failed',
          description: error.message,
          variant: 'destructive'
        });
        return;
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
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>
              About
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
              Pricing
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate('/login')}
              className="bg-primary text-primary-foreground"
            >
              Sign In
            </Button>
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              ← Back
            </Button>
          </div>
        </nav>
      </header>

      {/* Login/Signup Content */}
      <div className="flex items-center justify-center px-4 md:px-6 py-8 md:py-20">
        <Card className="w-full max-w-md mx-4 md:mx-0">
          <CardHeader className="text-center px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl">Welcome to Enhpix</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                {!showForgotPassword ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        placeholder="your@email.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
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
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll send you a link to reset your password.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => setShowForgotPassword(false)}
                        disabled={isLoading}
                      >
                        Back to Sign In
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create an account and choose your subscription plan
                  </p>
                  
                  <Button 
                    type="button" 
                    onClick={() => navigate('/pricing')}
                    className="w-full" 
                    size="lg"
                  >
                    Choose Your Plan
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Select a plan and create your account during checkout.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Need a subscription?{' '}
                <button 
                  onClick={() => navigate('/pricing')}
                  className="text-primary hover:underline"
                >
                  View pricing plans
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;