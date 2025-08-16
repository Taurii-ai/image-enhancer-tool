import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_name: 'basic' | 'pro' | 'premium';
  billing_cycle: 'monthly' | 'yearly';
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  month: number;
  year: number;
  images_processed: number;
  images_limit: number;
  created_at: string;
  updated_at: string;
}

// Plan limits configuration
export const PLAN_LIMITS = {
  basic: 150,
  pro: 400,
  premium: 1300,
} as const;

// Database operations
export class DatabaseService {
  // User operations
  static async createUser(email: string, name: string, stripeCustomerId?: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        name,
        stripe_customer_id: stripeCustomerId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  }

  static async getUserByStripeCustomerId(customerId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching user by Stripe ID:', error);
      return null;
    }

    return data;
  }

  static async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user Stripe customer ID:', error);
      return false;
    }

    return true;
  }

  // Subscription operations
  static async createSubscription(subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return null;
    }

    return data;
  }

  static async updateSubscription(stripeSubscriptionId: string, updates: Partial<Subscription>): Promise<boolean> {
    const { error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('stripe_subscription_id', stripeSubscriptionId);

    if (error) {
      console.error('Error updating subscription:', error);
      return false;
    }

    return true;
  }

  static async getUserSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching user subscription:', error);
      return null;
    }

    return data;
  }

  // Usage tracking operations
  static async getCurrentUsage(userId: string): Promise<UsageTracking | null> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching usage:', error);
      return null;
    }

    return data;
  }

  static async initializeUsage(userId: string, planName: string): Promise<UsageTracking | null> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const limit = PLAN_LIMITS[planName as keyof typeof PLAN_LIMITS] || 150;

    const { data, error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        month,
        year,
        images_processed: 0,
        images_limit: limit,
      })
      .select()
      .single();

    if (error) {
      console.error('Error initializing usage:', error);
      return null;
    }

    return data;
  }

  static async incrementUsage(userId: string): Promise<boolean> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_month: month,
      p_year: year,
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }

    return true;
  }
}