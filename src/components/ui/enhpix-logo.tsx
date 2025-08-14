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
      {/* Left Plus - Vertical */}
      <rect x="7" y="4" width="4" height="24" fill="#5DADE2"/>
      {/* Left Plus - Horizontal pieces */}
      <rect x="3" y="10" width="4" height="4" fill="#5DADE2"/>
      <rect x="11" y="10" width="4" height="4" fill="#5DADE2"/>
      <rect x="3" y="18" width="4" height="4" fill="#5DADE2"/>
      <rect x="11" y="18" width="4" height="4" fill="#5DADE2"/>
      
      {/* Right Diamond */}
      <path d="M20 4L28 12L20 20L24 16L20 28L16 16L24 8Z" fill="#5DADE2"/>
      <path d="M16 12L24 4L28 8L20 16L28 20L20 28L16 20L24 12Z" fill="#ffffff"/>
    </svg>
  );
};