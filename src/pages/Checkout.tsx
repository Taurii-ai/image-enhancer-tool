import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { useToast } from '@/hooks/use-toast';
import { createCheckout, getPlan, type PaymentData } from '@/services/payment';
import { ArrowLeft, CreditCard, Shield, CheckCircle } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  
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

    if (!selectedPlan) return;

    setIsLoading(true);

    try {
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
                  </div>
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