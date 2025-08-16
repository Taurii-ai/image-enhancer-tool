import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { useToast } from '@/hooks/use-toast';
import { getPlanById, isRealStripe } from '@/services/stripe';
import { ArrowLeft, CreditCard, Lock, CheckCircle } from 'lucide-react';

const DemoPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  
  // Get plan details from URL params
  const planId = searchParams.get('plan') || 'pro';
  const billing = (searchParams.get('billing') as 'monthly' | 'yearly') || 'monthly';
  const customerName = searchParams.get('name') || '';
  const customerEmail = searchParams.get('email') || '';
  
  const selectedPlan = getPlanById(planId);

  useEffect(() => {
    if (!selectedPlan) {
      toast({
        title: "Invalid Plan",
        description: "The selected plan was not found. Redirecting to pricing.",
        variant: "destructive"
      });
      navigate('/pricing');
    }
    
    if (customerName) {
      setNameOnCard(customerName);
    }
  }, [selectedPlan, customerName, navigate, toast]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate demo card number
    const validCardNumber = '4242 4242 4242 4242';
    const validCardNumberNoSpaces = '4242424242424242';
    
    if (cardNumber !== validCardNumber && cardNumber !== validCardNumberNoSpaces) {
      toast({
        title: "Demo Mode - Invalid Card",
        description: `Please use the demo card number: ${validCardNumber}`,
        variant: "destructive"
      });
      return;
    }

    // Validate expiry date (must be future date)
    const currentYear = new Date().getFullYear() % 100; // Get last 2 digits
    const currentMonth = new Date().getMonth() + 1;
    
    const [month, year] = expiryDate.split('/').map(num => parseInt(num));
    if (!month || !year || month < 1 || month > 12) {
      toast({
        title: "Invalid Expiry Date",
        description: "Please enter a valid expiry date (MM/YY)",
        variant: "destructive"
      });
      return;
    }
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      toast({
        title: "Card Expired",
        description: "Please enter a future expiry date",
        variant: "destructive"
      });
      return;
    }

    // Validate CVV
    if (cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
      toast({
        title: "Invalid CVV",
        description: "Please enter a valid 3-digit CVV",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate demo session ID
      const demoSessionId = 'cs_demo_' + Math.random().toString(36).substr(2, 9);
      
      toast({
        title: "Demo Payment Successful!",
        description: `Welcome to your ${selectedPlan?.name} plan!`,
      });
      
      // Redirect to success page with proper plan info
      navigate(`/success?demo=true&session_id=${demoSessionId}&plan=${planId}&billing=${billing}&name=${encodeURIComponent(customerName)}&email=${encodeURIComponent(customerEmail)}`);
      
    } catch (error) {
      console.error('Demo payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  if (!selectedPlan) {
    return null;
  }

  const price = billing === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly;
  const monthlyEquivalent = billing === 'yearly' ? (selectedPlan.priceYearly / 12).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border bg-white">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border">
              <EnhpixLogo className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-foreground">Enhpix</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Secure Demo Payment</span>
          </div>
        </nav>
      </header>

      {/* Demo Notice - only show if in demo mode */}
      {!isRealStripe && (
        <div className="bg-amber-50 border-b border-amber-200 p-3">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm text-amber-800">
              <strong>Demo Mode:</strong> This is a simulated Stripe checkout. No real payment will be processed.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                
                {billing === 'yearly' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">
                      🎉 Save 17% with yearly billing!
                    </p>
                  </div>
                )}

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

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{customerEmail}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </CardTitle>
              <CardDescription>
                Secure payment powered by Stripe {!isRealStripe && '(Demo Mode)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name on Card</Label>
                    <Input
                      id="name"
                      type="text"
                      value={nameOnCard}
                      onChange={(e) => setNameOnCard(e.target.value)}
                      placeholder="Full name as shown on card"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="card">Card Number</Label>
                    <Input
                      id="card"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => {
                        // Auto-format card number with spaces
                        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                        if (value.length <= 19) { // 16 digits + 3 spaces
                          setCardNumber(value);
                        }
                      }}
                      placeholder="4242 4242 4242 4242"
                      required
                      disabled={isLoading}
                      maxLength={19}
                    />
                    {!isRealStripe && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Demo only:</strong> Use 4242 4242 4242 4242 (no real charge)
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        type="text"
                        value={expiryDate}
                        onChange={(e) => {
                          // Auto-format expiry date
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.substring(0,2) + '/' + value.substring(2,4);
                          }
                          setExpiryDate(value);
                        }}
                        placeholder="12/28"
                        required
                        disabled={isLoading}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        type="text"
                        value={cvv}
                        onChange={(e) => {
                          // Only allow 3 digits
                          const value = e.target.value.replace(/\D/g, '').substring(0, 3);
                          setCvv(value);
                        }}
                        placeholder="123"
                        required
                        disabled={isLoading}
                        maxLength={3}
                      />
                    </div>
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
                      "Processing Payment..."
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Complete Payment - ${price}
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can cancel your subscription anytime from your account dashboard.
                    </p>
                  </div>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Your payment information is secure and encrypted</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/checkout?plan=${planId}&billing=${billing}`)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoPayment;