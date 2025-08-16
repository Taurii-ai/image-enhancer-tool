import { useState, useEffect } from 'react';
import { shouldUseAuth } from '@/utils/environment';

// Simplified approach - always work in demo mode for preview stability
// Real auth will be loaded only when explicitly needed

export const useSmartAuth = () => {
  const [demoUser, setDemoUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Listen for demo auth changes
  useEffect(() => {
    const handleDemoAuthChange = (event: any) => {
      setDemoUser(event.detail.user);
    };

    window.addEventListener('demoAuthChange', handleDemoAuthChange);
    return () => window.removeEventListener('demoAuthChange', handleDemoAuthChange);
  }, []);

  // Always use demo mode for now to ensure stability
  // TODO: Implement real auth when ready for production
  return {
    user: demoUser,
    loading: loading,
    signOut: async () => {
      setDemoUser(null);
      window.dispatchEvent(new CustomEvent('demoAuthChange', { 
        detail: { user: null, type: 'logout' }
      }));
    },
    isAuthenticated: !!demoUser,
    profile: demoUser ? { 
      id: 'demo_user',
      email: demoUser.email,
      plan: 'trial',
      credits_remaining: 3 
    } : null
  };
};

export const useSmartSupabase = () => {
  // Always return mock Supabase for demo mode
  return {
    auth: {
      signInWithPassword: async ({ email, password }: any) => {
        // Demo login - always succeeds and sets demo user
        await new Promise(resolve => setTimeout(resolve, 1000));
        const demoUserData = { email, id: 'demo_user' };
        
        // Trigger a custom event to update the demo user state
        window.dispatchEvent(new CustomEvent('demoAuthChange', { 
          detail: { user: demoUserData, type: 'login' }
        }));
        
        return { error: null, data: { user: demoUserData } };
      },
      signUp: async ({ email, password, options }: any) => {
        // Demo signup - always succeeds
        await new Promise(resolve => setTimeout(resolve, 1000));
        const demoUserData = { email, id: 'demo_user', name: options?.data?.name };
        
        // For signup, don't auto-login in demo
        return { error: null, data: { user: demoUserData } };
      },
      signOut: async () => {
        window.dispatchEvent(new CustomEvent('demoAuthChange', { 
          detail: { user: null, type: 'logout' }
        }));
        return { error: null };
      }
    }
  };
};