// Environment detection utility
export const isLovablePreview = () => {
  // Detect if we're in Lovable preview environment
  return (
    typeof window !== 'undefined' && 
    (
      window.location.hostname.includes('lovable.') ||
      window.location.hostname.includes('lovable-') ||
      window.location.hostname.includes('netlify') ||
      window.location.port === '5173' // Vite dev server in preview
    )
  );
};

export const isProduction = () => {
  return process.env.NODE_ENV === 'production' && !isLovablePreview();
};

export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' && !isLovablePreview();
};

export const shouldUseAuth = () => {
  // Always use demo mode for now to ensure stability
  return false;
};

export const getEnvironmentInfo = () => {
  return {
    isLovablePreview: isLovablePreview(),
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    shouldUseAuth: shouldUseAuth(),
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    port: typeof window !== 'undefined' ? window.location.port : 'unknown'
  };
};