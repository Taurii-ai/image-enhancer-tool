import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role key for admin operations
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Plan mapping from Stripe price IDs to plan names - CORRECT ONES
const PRICE_TO_PLAN = {
  'price_1RwL8qHUii3yXltr3wWqsPNo': { plan: 'basic', billing: 'monthly' },
  'price_1RwL9PHUii3yXltrLvMcLtWe': { plan: 'basic', billing: 'yearly' },
  'price_1RwLAvHUii3yXltrKu9aReLj': { plan: 'pro', billing: 'monthly' },
  'price_1RwLByHUii3yXltrLgjEyTLH': { plan: 'pro', billing: 'yearly' },
  'price_1RwLDhHUii3yXltrWdHdqqOB': { plan: 'premium', billing: 'monthly' },
  'price_1RwLEHHUii3yXltrdCIWUMZa': { plan: 'premium', billing: 'yearly' },
};

const PLAN_LIMITS = {
  basic: 150,
  pro: 400,
  premium: 1300,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout.session.completed:', session.id);
  
  try {
    // Get customer email from the session
    const customerEmail = session.customer_email || session.customer_details?.email;
    const customerName = session.customer_details?.name || 'Unknown';
    const stripeCustomerId = session.customer;
    
    if (!customerEmail) {
      console.error('No customer email found in checkout session');
      return;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', customerEmail)
      .single();

    let user;
    if (existingUser) {
      // Update existing user with Stripe customer ID
      console.log('🔧 UPDATING existing user with Stripe customer ID:', stripeCustomerId);
      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('email', customerEmail)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating user with stripe_customer_id:', updateError);
        return;
      }
      
      console.log('✅ Successfully updated user with stripe_customer_id:', updatedUser);
      user = updatedUser;
    } else {
      // Create Supabase Auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: Math.random().toString(36).slice(-12), // Random password
        email_confirm: true // Auto-confirm email
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return;
      }

      // Send password reset email to new customer so they can set their password
      try {
        await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: customerEmail,
          options: {
            redirectTo: `${process.env.SITE_URL || 'https://enhpix.com'}/reset-password`
          }
        });
        console.log('Password reset email sent to new customer:', customerEmail);
      } catch (resetError) {
        console.error('Error sending password reset email:', resetError);
        // Don't fail the whole process if password reset email fails
      }

      // Create profile with auth user ID
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id, // Link to auth user
          email: customerEmail,
          full_name: customerName,
          stripe_customer_id: stripeCustomerId,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        return;
      }
      user = newUser;
    }

    console.log('User processed successfully:', user.email);
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Processing customer.subscription.created:', subscription.id);
  
  try {
    const priceId = subscription.items.data[0]?.price?.id;
    
    // Get plan info from the plan_mappings table
    const { data: planInfo, error: planError } = await supabase
      .from('plan_mappings')
      .select('*')
      .eq('stripe_price_id', priceId)
      .single();
    
    if (planError || !planInfo) {
      console.error('Unknown price ID or plan mapping error:', priceId, 'Error:', planError);
      return;
    }

    // Get user by Stripe customer ID
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (userError || !user) {
      console.error('User not found for customer:', subscription.customer, 'Error:', userError);
      // Try to find by customer email from Stripe
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        const { data: userByEmail, error: emailError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', customer.email)
          .single();
          
        if (emailError || !userByEmail) {
          console.error('User not found by email either:', customer.email);
          return;
        }
        
        // Update user with stripe customer ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: subscription.customer })
          .eq('id', userByEmail.id);
          
        if (updateError) {
          console.error('Error updating user with stripe customer ID:', updateError);
          return;
        }
        
        user = userByEmail;
        console.log('Found and updated user by email:', customer.email);
      } catch (stripeError) {
        console.error('Error fetching customer from Stripe:', stripeError);
        return;
      }
    }

    // Create subscription record
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan_name: planInfo.plan_name,
        billing_cycle: planInfo.billing_cycle,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

    if (subError) {
      console.error('Error creating subscription:', subError);
      return;
    }

    // Update profile with correct plan and credits
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        plan: planInfo.plan_name,
        credits_remaining: planInfo.credits,
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('Error updating profile with plan:', profileUpdateError);
    }

    // Add user to user_plans table for individual tracking
    const { error: userPlanError } = await supabase
      .from('user_plans')
      .upsert({
        user_id: user.id,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan_name: planInfo.plan_name,
        credits_allocated: planInfo.credits,
        credits_remaining: planInfo.credits,
        billing_cycle: planInfo.billing_cycle,
        status: 'active',
        subscription_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (userPlanError) {
      console.error('Error creating user plan:', userPlanError);
    }

    // Initialize usage tracking for the current month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const limit = planInfo.credits;

    const { error: usageError } = await supabase
      .from('usage_tracking')
      .upsert({
        user_id: user.id,
        month,
        year,
        images_processed: 0,
        images_limit: limit,
      }, {
        onConflict: 'user_id,month,year'
      });

    if (usageError) {
      console.error('Error initializing usage:', usageError);
    }

    console.log('Subscription created successfully for user:', user.email);
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing customer.subscription.updated:', subscription.id);
  
  try {
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = PRICE_TO_PLAN[priceId];
    
    if (!planInfo) {
      console.error('Unknown price ID:', priceId);
      return;
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        stripe_price_id: priceId,
        plan_name: planInfo.plan,
        billing_cycle: planInfo.billing,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return;
    }

    // Update usage limits if plan changed
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (subData) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const newLimit = PLAN_LIMITS[planInfo.plan] || 150;

      const { error: usageError } = await supabase
        .from('usage_tracking')
        .upsert({
          user_id: subData.user_id,
          month,
          year,
          images_limit: newLimit,
        }, {
          onConflict: 'user_id,month,year'
        });

      if (usageError) {
        console.error('Error updating usage limits:', usageError);
      }
    }

    console.log('Subscription updated successfully:', subscription.id);
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing customer.subscription.deleted:', subscription.id);
  
  try {
    // Update subscription status to canceled
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating canceled subscription:', error);
      return;
    }

    console.log('Subscription canceled successfully:', subscription.id);
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // Update subscription status to active
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('stripe_subscription_id', invoice.subscription);

      if (error) {
        console.error('Error updating subscription on payment success:', error);
      } else {
        console.log('Subscription activated on payment success:', invoice.subscription);
      }
    }
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // Update subscription status to past_due
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription);

      if (error) {
        console.error('Error updating subscription on payment failure:', error);
      } else {
        console.log('Subscription marked as past_due:', invoice.subscription);
      }
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}