import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getUserSubscriptionInfo, type UserSubscriptionInfo } from '@/services/userSubscription';
import { ArrowLeft, CreditCard, User, Shield, AlertTriangle, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user?.id) {
      getUserSubscriptionInfo(user.id).then(setSubscriptionInfo);
    }
  }, [user, loading, navigate]);

  const handleCancelSubscription = async () => {
    if (!user?.id || !subscriptionInfo) return;

    setIsCancelling(true);
    try {
      // Update user's subscription to cancelled status
      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled. You can continue using your remaining credits until the end of your billing period.',
      });

      // Refresh subscription info
      getUserSubscriptionInfo(user.id).then(setSubscriptionInfo);
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast({
        title: 'Cancellation Failed',
        description: 'There was an error cancelling your subscription. Please contact support.',
        variant: 'destructive'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading || !subscriptionInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border">
        <nav className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <EnhpixLogo className="w-6 h-6" />
            </div>
            <span className="text-lg font-bold text-foreground">Settings</span>
          </div>
        </nav>
      </header>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Account Information</CardTitle>
            </div>
            <CardDescription>Your account details and current plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Plan:</span>
              <div className="flex items-center gap-2">
                {subscriptionInfo.planName !== 'Free' && <Crown className="w-4 h-4 text-primary" />}
                <span className="text-sm font-medium">{subscriptionInfo.planName}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Images Remaining:</span>
              <span className="text-sm font-medium">{subscriptionInfo.imagesRemaining} / {subscriptionInfo.imagesTotal}</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <CardTitle>Subscription Management</CardTitle>
            </div>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionInfo.planName !== 'Free' && subscriptionInfo.planName !== 'Cancelled' ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Current Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionInfo.planName} Plan - {subscriptionInfo.billing} billing
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade Plan
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">No Active Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    You're currently on a free or cancelled plan
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade to Premium
                </Button>
              </div>
            )}
            
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-destructive">Cancel Subscription</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {subscriptionInfo.planName !== 'Free' && subscriptionInfo.planName !== 'Cancelled' 
                      ? "You can cancel your subscription at any time. You'll keep access to your remaining credits until the end of your current billing period."
                      : "If you have any active subscriptions or recurring payments, you can cancel them here. This will prevent future charges."
                    }
                  </p>
                  {!showCancelConfirm ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      Cancel Any Active Subscriptions
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-destructive">
                        Are you sure you want to cancel all active subscriptions and prevent future charges?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleCancelSubscription}
                          disabled={isCancelling}
                        >
                          {isCancelling ? 'Cancelling...' : 'Yes, Cancel All Subscriptions'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={isCancelling}
                        >
                          Keep Active
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Support & Help</CardTitle>
            </div>
            <CardDescription>Need help with your account?</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you need assistance with your account, billing, or have any questions, please contact our support team.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('mailto:support@enhpix.com', '_blank')}
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;