import React from 'react';

interface LogoImageProps {
  className?: string;
}

export const LogoImage: React.FC<LogoImageProps> = ({ className = "w-8 h-8" }) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Blue cross - left side */}
        <rect x="15" y="5" width="12" height="60" fill="#5DADE2"/>
        <rect x="5" y="25" width="12" height="12" fill="#5DADE2"/>
        <rect x="27" y="25" width="12" height="12" fill="#5DADE2"/>
        <rect x="5" y="40" width="12" height="12" fill="#5DADE2"/>
        <rect x="27" y="40" width="12" height="12" fill="#5DADE2"/>
        
        {/* Blue diamond - right side */}
        <path d="M55 15 L85 35 L55 55 L70 45 L55 75 L45 45 L75 25 Z" fill="#5DADE2"/>
        <path d="M45 35 L75 15 L85 25 L55 45 L85 50 L55 75 L45 50 L75 35 Z" fill="#ffffff"/>
      </svg>
    </div>
  );
};