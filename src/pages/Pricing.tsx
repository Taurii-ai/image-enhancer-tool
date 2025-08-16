import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { Check, Star, Zap, Crown, Sparkles, ArrowLeft, Building2, Phone } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const handlePlanSelect = (plan: string, billing: string) => {
    console.log('Plan selected:', plan, billing);
    navigate(`/checkout?plan=${plan}&billing=${billing}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-3 sm:p-4 md:p-6 border-b border-border">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-1.5 sm:p-2 bg-white rounded-lg">
              <EnhpixLogo className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">Enhpix</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="hidden sm:flex">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="sm:hidden">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="text-xs sm:text-sm">
              Sign In
            </Button>
          </div>
        </nav>
      </header>

      <div className="w-full max-w-7xl mx-2 sm:mx-4 md:mx-auto py-4 sm:py-8 md:py-16 px-2 sm:px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            AI-Powered Image Enhancement
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 px-2">
            Choose Your <span className="bg-gradient-primary bg-clip-text text-transparent">Enhancement Plan</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Transform your images with professional-grade AI upscaling. Start free, upgrade when you need more power.
          </p>
          
          <div className="inline-flex items-center p-1 bg-card border border-border rounded-lg shadow-sm">
            <Button 
              variant={!isYearly ? "default" : "ghost"}
              onClick={() => setIsYearly(false)}
              className="px-8 py-2"
            >
              Monthly
            </Button>
            <Button 
              variant={isYearly ? "default" : "ghost"}
              onClick={() => setIsYearly(true)}
              className="px-8 py-2"
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">Save 17%</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 md:mb-16">
          {/* Basic Plan */}
          <Card className="relative hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4 sm:pb-6 md:pb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Basic</CardTitle>
              <CardDescription className="text-sm sm:text-base">Perfect for getting started with AI enhancement</CardDescription>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                ${isYearly ? '190' : '19'}
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  /{isYearly ? 'year' : 'month'}
                </span>
                {isYearly && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ($15.83/month)
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">150 images/month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">4x upscaling resolution</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Basic quality enhancement</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Email support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Standard processing speed</span>
                </li>
              </ul>
              
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => handlePlanSelect('basic', isYearly ? 'yearly' : 'monthly')}
              >
                Choose Basic
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-primary shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </span>
            </div>
            <CardHeader className="pb-8 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Pro</CardTitle>
              <CardDescription>Ideal for professionals and serious creators</CardDescription>
              <div className="text-3xl font-bold text-foreground">
                ${isYearly ? '370' : '37'}
                <span className="text-sm font-normal text-muted-foreground">
                  /{isYearly ? 'year' : 'month'}
                </span>
                {isYearly && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ($30.83/month)
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">400 images/month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">8x upscaling resolution</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Premium quality enhancement</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Batch processing</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                onClick={() => handlePlanSelect('pro', isYearly ? 'yearly' : 'monthly')}
              >
                Choose Pro
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Premium</CardTitle>
              <CardDescription>Maximum power for enterprises and agencies</CardDescription>
              <div className="text-3xl font-bold text-foreground">
                ${isYearly ? '900' : '90'}
                <span className="text-sm font-normal text-muted-foreground">
                  /{isYearly ? 'year' : 'month'}
                </span>
                {isYearly && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ($75/month)
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">1,300 images/month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">16x upscaling resolution</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Ultra quality enhancement</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">24/7 priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">API access & integrations</span>
                </li>
              </ul>
              
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => handlePlanSelect('premium', isYearly ? 'yearly' : 'monthly')}
              >
                Choose Premium
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="relative hover:shadow-lg transition-all duration-300 border-2 border-muted-foreground/20">
            <CardHeader className="pb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Enterprise</CardTitle>
              <CardDescription>Custom solutions for large organizations</CardDescription>
              <div className="text-3xl font-bold text-foreground">
                Custom
                <span className="text-sm font-normal text-muted-foreground">
                  /pricing
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Unlimited images</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Custom upscaling options</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">White-label solutions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Dedicated support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">SLA guarantees</span>
                </li>
              </ul>
              
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => window.open('mailto:support@enhpix.com?subject=Enterprise Plan Inquiry', '_blank')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Us
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Questions? We've got answers.
          </h2>
          <p className="text-muted-foreground mb-8">
            All plans include our core AI enhancement technology with no hidden fees.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="px-4 py-2">
              💳 Secure Payment
            </Badge>
            <Badge variant="secondary" className="px-4 py-2">
              🔄 Cancel Anytime
            </Badge>
            <Badge variant="secondary" className="px-4 py-2">
              🛡️ 30-Day Guarantee
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;