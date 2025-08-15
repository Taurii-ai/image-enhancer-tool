import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue cross - left side - EXACT from your image */}
      <rect x="114" y="134" width="56" height="244" fill="#5DADE2"/>
      <rect x="57" y="190" width="56" height="56" fill="#5DADE2"/>
      <rect x="171" y="190" width="56" height="56" fill="#5DADE2"/>
      <rect x="57" y="246" width="56" height="56" fill="#5DADE2"/>
      <rect x="171" y="246" width="56" height="56" fill="#5DADE2"/>
      <rect x="57" y="303" width="56" height="56" fill="#5DADE2"/>
      <rect x="171" y="303" width="56" height="56" fill="#5DADE2"/>
      
      {/* Blue diamond - right side - EXACT from your image */}
      <path d="M285 134 L399 248 L285 362 L342 305 L285 419 L228 305 L342 191 Z" fill="#5DADE2"/>
      <path d="M228 248 L342 134 L399 191 L285 305 L399 362 L285 419 L228 362 L342 248 Z" fill="white"/>
    </svg>
  );
};