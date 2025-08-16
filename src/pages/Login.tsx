import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
// import { supabase } from '@/lib/supabase'; // Temporarily disabled
// import { useAuth } from '@/hooks/useAuth'; // Temporarily disabled
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // const { user, isAuthenticated } = useAuth(); // Temporarily disabled
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', name: '' });
  const [defaultTab, setDefaultTab] = useState('login');

  useEffect(() => {
    // Check for tab parameter
    const tab = searchParams.get('tab');
    if (tab === 'signup') {
      setDefaultTab('signup');
    }
  }, [searchParams]);

  const handleRedirectAfterAuth = () => {
    const redirect = searchParams.get('redirect');
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    
    if (redirect === 'checkout' && plan && billing) {
      navigate(`/checkout?plan=${plan}&billing=${billing}`);
    } else {
      // Always redirect to pricing - payment required before access
      navigate('/pricing');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if user exists
      const userData = localStorage.getItem(`user_${loginData.email}`);
      if (!userData) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this email. Please choose a plan first.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Validate password
      const user = JSON.parse(userData);
      if (user.password !== loginData.password) {
        toast({
          title: 'Invalid Password',
          description: 'The password you entered is incorrect.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Login process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Login Successful!',
        description: 'Welcome back to Enhpix!',
      });
      
      handleRedirectAfterAuth();
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect directly to pricing - no signup without payment
    navigate('/pricing');
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Choose Plan to Sign Up
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Payment required. Choose a plan to create your account.
                  </p>
                </form>
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