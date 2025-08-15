import React from 'react';

interface EnhpixLogoProps {
  className?: string;
}

export const EnhpixLogo: React.FC<EnhpixLogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue cross - left side - exact proportions from image */}
      <rect x="228" y="268" width="113" height="488" fill="#5DADE2"/>
      <rect x="114" y="380" width="113" height="113" fill="#5DADE2"/>
      <rect x="342" y="380" width="113" height="113" fill="#5DADE2"/>
      <rect x="114" y="493" width="113" height="113" fill="#5DADE2"/>
      <rect x="342" y="493" width="113" height="113" fill="#5DADE2"/>
      <rect x="114" y="606" width="113" height="113" fill="#5DADE2"/>
      <rect x="342" y="606" width="113" height="113" fill="#5DADE2"/>
      
      {/* Blue diamond - right side - exact shape */}
      <path d="M 570 268 L 798 496 L 570 724 L 684 610 L 570 838 L 456 610 L 684 382 Z" fill="#5DADE2"/>
      <path d="M 456 496 L 684 268 L 798 382 L 570 610 L 798 724 L 570 838 L 456 724 L 684 496 Z" fill="white"/>
    </svg>
  );
};