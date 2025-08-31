import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for password reset tokens in URL or hash
    const checkForResetTokens = () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.substring(1));
      
      // Check for password reset tokens
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
      const type = searchParams.get('type') || hashParams.get('type');
      
      // If we have password reset tokens and we're not already on the reset page
      if (accessToken && refreshToken && type === 'recovery' && location.pathname !== '/reset-password') {
        console.log('Password reset tokens detected, redirecting to reset page');
        // Redirect to reset password page with the tokens
        const params = new URLSearchParams();
        params.set('access_token', accessToken);
        params.set('refresh_token', refreshToken);
        params.set('type', type);
        
        navigate(`/reset-password?${params.toString()}`);
      }
    };

    checkForResetTokens();
  }, [location, navigate]);

  return null; // This component doesn't render anything
};