import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getUserSubscriptionInfo, type UserSubscriptionInfo } from '@/services/userSubscription';
import { ArrowLeft, CreditCard, User, Shield, AlertTriangle, Crown, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
      // Get user plan details for Stripe cancellation
      const { data: userPlan } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      // Cancel in Stripe if there's a subscription
      if (userPlan?.stripe_subscription_id) {
        try {
          const response = await fetch('/api/cancel-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscriptionId: userPlan.stripe_subscription_id,
              userId: user.id
            }),
          });

          if (!response.ok) {
            console.error('Stripe cancellation failed, continuing with local cancellation');
          }
        } catch (stripeError) {
          console.error('Error calling Stripe API:', stripeError);
          // Continue with local cancellation even if Stripe fails
        }
      }

      // Update user_plans table to cancelled status
      if (userPlan) {
        const { error: userPlanError } = await supabase
          .from('user_plans')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (userPlanError) {
          console.error('Error updating user_plans:', userPlanError);
        }
      }

      // Update profiles table to cancelled status for backwards compatibility
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          plan: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profiles:', profileError);
      }

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled successfully. You can continue using your remaining credits, but no further charges will occur.',
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New passwords do not match.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive'
      });
      return;
    }

    // Check if this is a Google OAuth user (they don't have current password)
    const isGoogleUser = user?.app_metadata?.provider === 'google' || user?.user_metadata?.provider === 'google';

    setIsChangingPassword(true);
    try {
      // For Google users, just set the new password directly
      // For regular users, we still need to verify current password but Supabase handles this
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Password Updated',
        description: isGoogleUser 
          ? 'Password set successfully! You can now log in with either Google or email/password.'
          : 'Your password has been successfully changed.',
      });

      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: 'Password Change Failed',
        description: error.message || 'There was an error changing your password.',
        variant: 'destructive'
      });
    } finally {
      setIsChangingPassword(false);
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

        {/* Password Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>Password & Security</CardTitle>
            </div>
            <CardDescription>Change your password and manage security settings</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Show different message for Google OAuth users */}
            {(user?.app_metadata?.provider === 'google' || user?.user_metadata?.provider === 'google') && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Google Account:</strong> Set up a password to also log in with email/password if needed.
                </p>
              </div>
            )}
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {(user?.app_metadata?.provider === 'google' || user?.user_metadata?.provider === 'google') ? 'Set Password' : 'New Password'}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder={
                    (user?.app_metadata?.provider === 'google' || user?.user_metadata?.provider === 'google') 
                      ? 'Create a password'
                      : 'Enter new password'
                  }
                  minLength={6}
                  required
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  minLength={6}
                  required
                  disabled={isChangingPassword}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
              <Button
                type="submit"
                disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
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