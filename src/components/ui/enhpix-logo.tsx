import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue cross symbol */}
      <rect x="45" y="40" width="25" height="120" fill="#5DADE2"/>
      <rect x="20" y="75" width="25" height="25" fill="#5DADE2"/>
      <rect x="70" y="75" width="25" height="25" fill="#5DADE2"/>
      <rect x="20" y="100" width="25" height="25" fill="#5DADE2"/>
      <rect x="70" y="100" width="25" height="25" fill="#5DADE2"/>
      
      {/* Blue diamond shape */}
      <path d="M130 40 L180 90 L130 140 L150 120 L130 160 L110 120 L160 70 Z" fill="#5DADE2"/>
      <path d="M110 90 L160 40 L180 60 L130 110 L180 130 L130 160 L110 130 L160 90 Z" fill="#ffffff"/>
    </svg>
  );
};