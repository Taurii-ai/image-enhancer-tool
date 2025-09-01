import { supabase } from '@/lib/supabase';

// Plan mapping - matches webhook configuration
const STRIPE_PRICE_TO_PLAN = {
  'price_1RwL8qHUii3yXltr3wWqsPNo': { plan: 'basic', billing: 'monthly', credits: 150 },
  'price_1RwL9PHUii3yXltrLvMcLtWe': { plan: 'basic', billing: 'yearly', credits: 150 },
  'price_1RwLAvHUii3yXltrKu9aReLj': { plan: 'pro', billing: 'monthly', credits: 400 },
  'price_1RwLByHUii3yXltrLgjEyTLH': { plan: 'pro', billing: 'yearly', credits: 400 },
  'price_1RwLDhHUii3yXltrWdHdqqOB': { plan: 'premium', billing: 'monthly', credits: 1300 },
  'price_1RwLEHHUii3yXltrdCIWUMZa': { plan: 'premium', billing: 'yearly', credits: 1300 },
};

export interface PlanVerificationResult {
  userId: string;
  email: string;
  currentPlan: string;
  correctPlan: string;
  currentCredits: number;
  correctCredits: number;
  needsUpdate: boolean;
  stripeCustomerId: string;
  error?: string;
}

/**
 * Verifies a user's plan against Stripe and returns correction info
 */
export async function verifyUserPlan(userId: string): Promise<PlanVerificationResult> {
  try {
    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        userId,
        email: 'unknown',
        currentPlan: 'unknown',
        correctPlan: 'unknown',
        currentCredits: 0,
        correctCredits: 0,
        needsUpdate: false,
        stripeCustomerId: '',
        error: 'Profile not found'
      };
    }

    // If no stripe customer ID, user hasn't paid
    if (!profile.stripe_customer_id) {
      return {
        userId,
        email: profile.email,
        currentPlan: profile.plan || 'free',
        correctPlan: 'free',
        currentCredits: profile.credits_remaining || 150,
        correctCredits: 150,
        needsUpdate: false,
        stripeCustomerId: '',
        error: 'No Stripe customer ID - likely free user'
      };
    }

    // Check Stripe for active subscriptions
    const stripeVerification = await verifyWithStripe(profile.stripe_customer_id);
    
    if (stripeVerification.error) {
      return {
        userId,
        email: profile.email,
        currentPlan: profile.plan || 'free',
        correctPlan: 'unknown',
        currentCredits: profile.credits_remaining || 0,
        correctCredits: 0,
        needsUpdate: false,
        stripeCustomerId: profile.stripe_customer_id,
        error: stripeVerification.error
      };
    }

    const currentPlan = profile.plan || 'free';
    const correctPlan = stripeVerification.plan;
    const currentCredits = profile.credits_remaining || 0;
    const correctCredits = stripeVerification.credits;

    return {
      userId,
      email: profile.email,
      currentPlan,
      correctPlan,
      currentCredits,
      correctCredits,
      needsUpdate: currentPlan !== correctPlan,
      stripeCustomerId: profile.stripe_customer_id
    };

  } catch (error) {
    console.error('Error verifying user plan:', error);
    return {
      userId,
      email: 'unknown',
      currentPlan: 'unknown',
      correctPlan: 'unknown',
      currentCredits: 0,
      correctCredits: 0,
      needsUpdate: false,
      stripeCustomerId: '',
      error: 'Verification failed'
    };
  }
}

/**
 * Verifies plan with Stripe API
 */
async function verifyWithStripe(stripeCustomerId: string): Promise<{
  plan: string;
  credits: number;
  billing: string;
  error?: string;
}> {
  try {
    // Call our API endpoint to check Stripe (we can't call Stripe directly from client)
    const response = await fetch('/api/verify-customer-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: stripeCustomerId })
    });

    if (!response.ok) {
      return { plan: 'unknown', credits: 0, billing: 'unknown', error: 'API call failed' };
    }

    const data = await response.json();
    return {
      plan: data.plan || 'basic',
      credits: data.credits || 150,
      billing: data.billing || 'monthly'
    };
  } catch (error) {
    console.error('Stripe verification error:', error);
    return { plan: 'unknown', credits: 0, billing: 'unknown', error: 'Stripe API error' };
  }
}

/**
 * Corrects a user's plan in the database
 */
export async function correctUserPlan(userId: string, correctPlan: string, correctCredits: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        plan: correctPlan,
        credits_remaining: correctCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error correcting user plan:', error);
      return false;
    }

    // Also update usage tracking for current month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        month,
        year,
        images_processed: 0,
        images_limit: correctCredits
      }, {
        onConflict: 'user_id,month,year'
      });

    console.log(`Successfully corrected user ${userId} to ${correctPlan} plan with ${correctCredits} credits`);
    return true;
  } catch (error) {
    console.error('Error correcting user plan:', error);
    return false;
  }
}

/**
 * Verifies and corrects all users with Stripe customer IDs
 */
export async function verifyAllCustomers(): Promise<PlanVerificationResult[]> {
  try {
    // Get all users with stripe customer IDs
    const { data: customers, error } = await supabase
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .not('stripe_customer_id', 'is', null);

    if (error || !customers) {
      console.error('Error fetching customers:', error);
      return [];
    }

    const results: PlanVerificationResult[] = [];
    
    for (const customer of customers) {
      const result = await verifyUserPlan(customer.id);
      results.push(result);
      
      // Auto-correct if needed
      if (result.needsUpdate && !result.error) {
        const corrected = await correctUserPlan(customer.id, result.correctPlan, result.correctCredits);
        console.log(`Auto-corrected ${customer.email}: ${corrected ? 'SUCCESS' : 'FAILED'}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in verifyAllCustomers:', error);
    return [];
  }
}