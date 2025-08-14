import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Enhpix Logo" 
      className={className}
    />
  );
};