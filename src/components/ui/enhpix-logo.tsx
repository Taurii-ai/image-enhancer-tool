import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <div 
      className={className}
      style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <img 
        src="/logo-exact.png" 
        alt="Enhpix Logo" 
        style={{ 
          width: '95%',
          height: '95%',
          objectFit: 'contain',
          filter: 'brightness(1.1) contrast(1.1)'
        }}
      />
    </div>
  );
};