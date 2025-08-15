import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue cross - left side with exact proportions */}
      <rect x="10" y="10" width="8" height="50" fill="#5DADE2"/>
      <rect x="5" y="25" width="8" height="8" fill="#5DADE2"/>
      <rect x="18" y="25" width="8" height="8" fill="#5DADE2"/>
      <rect x="5" y="35" width="8" height="8" fill="#5DADE2"/>
      <rect x="18" y="35" width="8" height="8" fill="#5DADE2"/>
      <rect x="5" y="45" width="8" height="8" fill="#5DADE2"/>
      <rect x="18" y="45" width="8" height="8" fill="#5DADE2"/>
      
      {/* Blue diamond - right side */}
      <path d="M45 25 L70 40 L85 25 L70 10 L85 5 L45 40 L35 25 L45 15 L35 40 L45 50 L70 70 L85 55 L70 70 L45 50 Z" fill="#5DADE2"/>
      <path d="M35 40 L70 10 L80 20 L45 50 L80 55 L45 85 L35 55 L70 40 Z" fill="#ffffff"/>
    </svg>
  );
};