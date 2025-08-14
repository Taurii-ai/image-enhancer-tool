import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Plus symbol */}
      <rect x="7.27" y="8.57" width="3.64" height="14.86" fill="#5DADE2" rx="0.5"/>
      <rect x="3.64" y="12.21" width="3.64" height="3.64" fill="#5DADE2" rx="0.5"/>
      <rect x="7.27" y="15.85" width="3.64" height="3.64" fill="#5DADE2" rx="0.5"/>
      <rect x="10.91" y="12.21" width="3.64" height="3.64" fill="#5DADE2" rx="0.5"/>
      
      {/* Diamond shape */}
      <path d="M18.2 12.7L21.8 16.3L26.9 11.2L21.8 6.1L26.9 1L18.2 9.7L14.6 6.1L18.2 2.5L14.6 9.7L18.2 13.3L21.8 19.9L26.9 14.8L21.8 19.9L18.2 16.3Z" fill="#5DADE2"/>
    </svg>
  );
};