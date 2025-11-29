import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="logo_gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D0BCFF" />
          <stop offset="1" stopColor="#4F378B" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
           <feMerge>
               <feMergeNode in="coloredBlur"/>
               <feMergeNode in="SourceGraphic"/>
           </feMerge>
        </filter>
      </defs>

      {/* Background Container */}
      <rect width="48" height="48" rx="14" fill="url(#logo_gradient)" />
      
      {/* Stylized V Shape */}
      <path 
        d="M13 15L24 34L35 15" 
        stroke="white" 
        strokeWidth="4.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Tech/Vibe Dot */}
      <circle cx="24" cy="22" r="2.5" fill="#381E72" className="animate-pulse" />
      
      {/* Accent on the right arm */}
      <path d="M30 15L35 15" stroke="white" strokeWidth="4.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
};