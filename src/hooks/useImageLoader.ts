import { useState, useEffect } from 'react';

export const useImageLoader = (src: string) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // If it's a Replicate URL, try to fetch it through our proxy
        if (src.startsWith('https://replicate.delivery/')) {
          console.log('🔄 LOADING REPLICATE IMAGE VIA SERVER PROXY:', src);
          
          // Use our own proxy endpoint
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
          
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            console.log('✅ LOADED VIA SERVER PROXY:', blobUrl);
            setImageSrc(blobUrl);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: use the original URL
        console.log('🔄 LOADING IMAGE DIRECTLY:', src);
        setImageSrc(src);
        setIsLoading(false);
        
      } catch (err) {
        console.error('🚨 IMAGE LOAD ERROR:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        
        // Final fallback: still try to show the original URL
        setImageSrc(src);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src]);

  return { imageSrc, isLoading, error };
};