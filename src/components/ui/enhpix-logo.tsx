import React from 'react';
import logoImage from '@/assets/enhpix-logo.svg';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <img 
      src={logoImage} 
      alt="Enhpix Logo" 
      className={className}
    />
  );
};