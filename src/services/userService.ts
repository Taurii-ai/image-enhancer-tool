import { DatabaseService, User, Subscription, UsageTracking } from '@/lib/supabase';

export interface UserSubscriptionInfo {
  user: User;
  subscription: Subscription | null;
  usage: UsageTracking | null;
  canProcessImages: boolean;
  remainingImages: number;
}

export class UserService {
  /**
   * Get complete user information including subscription and usage
   */
  static async getUserInfo(email: string): Promise<UserSubscriptionInfo | null> {
    try {
      // Get user
      const user = await DatabaseService.getUserByEmail(email);
      if (!user) {
        console.log('User not found:', email);
        return null;
      }

      // Get active subscription
      const subscription = await DatabaseService.getUserSubscription(user.id);
      
      // Get current usage
      const usage = await DatabaseService.getCurrentUsage(user.id);

      // Calculate if user can process images
      const canProcessImages = subscription?.status === 'active' && 
        (usage ? usage.images_processed < usage.images_limit : true);
      
      const remainingImages = usage ? 
        Math.max(0, usage.images_limit - usage.images_processed) : 0;

      return {
        user,
        subscription,
        usage,
        canProcessImages,
        remainingImages
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Process an image for a user (increment usage and check limits)
   */
  static async processImageForUser(userEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const userInfo = await this.getUserInfo(userEmail);
      
      if (!userInfo) {
        return { success: false, message: 'User not found. Please sign up first.' };
      }

      if (!userInfo.subscription || userInfo.subscription.status !== 'active') {
        return { success: false, message: 'No active subscription. Please subscribe to process images.' };
      }

      if (!userInfo.canProcessImages) {
        return { 
          success: false, 
          message: `Monthly limit reached. You've used ${userInfo.usage?.images_processed || 0} of ${userInfo.usage?.images_limit || 0} images.` 
        };
      }

      // Increment usage
      const incrementSuccess = await DatabaseService.incrementUsage(userInfo.user.id);
      
      if (!incrementSuccess) {
        return { success: false, message: 'Failed to update usage. Please try again.' };
      }

      const newRemaining = userInfo.remainingImages - 1;
      return { 
        success: true, 
        message: `Image processed successfully. ${newRemaining} images remaining this month.` 
      };
    } catch (error) {
      console.error('Error processing image for user:', error);
      return { success: false, message: 'An error occurred while processing your request.' };
    }
  }

  /**
   * Initialize usage tracking for a user when they get a new subscription
   */
  static async initializeUserUsage(userId: string, planName: string): Promise<boolean> {
    try {
      const usage = await DatabaseService.initializeUsage(userId, planName);
      return usage !== null;
    } catch (error) {
      console.error('Error initializing user usage:', error);
      return false;
    }
  }

  /**
   * Check if a user exists and create them if they don't
   */
  static async ensureUserExists(email: string, name: string, stripeCustomerId?: string): Promise<User | null> {
    try {
      // Check if user exists
      let user = await DatabaseService.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        user = await DatabaseService.createUser(email, name, stripeCustomerId);
        if (!user) {
          console.error('Failed to create user');
          return null;
        }
        console.log('Created new user:', email);
      } else if (stripeCustomerId && !user.stripe_customer_id) {
        // Update existing user with Stripe customer ID
        const updateSuccess = await DatabaseService.updateUserStripeCustomerId(user.id, stripeCustomerId);
        if (updateSuccess) {
          user.stripe_customer_id = stripeCustomerId;
        }
      }

      return user;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      return null;
    }
  }
}

// Export for backward compatibility
export const getUserInfo = UserService.getUserInfo;
export const processImageForUser = UserService.processImageForUser;