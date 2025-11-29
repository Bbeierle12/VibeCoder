
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
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="cyan_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="purple_gradient" x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
           <feMerge>
               <feMergeNode in="coloredBlur"/>
               <feMergeNode in="SourceGraphic"/>
           </feMerge>
        </filter>
      </defs>

      {/* Left Brain - Creative (Cyan) */}
      <path 
        d="M48 25 C30 25, 15 35, 15 55 C15 75, 30 85, 40 85 C45 85, 48 80, 48 75" 
        stroke="url(#cyan_gradient)" 
        strokeWidth="4" 
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      <path 
        d="M25 40 C20 45, 20 60, 25 65" 
        stroke="url(#cyan_gradient)" 
        strokeWidth="3" 
        strokeLinecap="round"
        opacity="0.6"
      />
       <path 
        d="M35 32 C28 35, 28 45, 35 48" 
        stroke="url(#cyan_gradient)" 
        strokeWidth="3" 
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Right Brain - Logic/Circuit (Purple) */}
      <path 
        d="M52 25 C70 25, 85 35, 85 55 C85 75, 70 85, 60 85 C55 85, 52 80, 52 75" 
        stroke="url(#purple_gradient)" 
        strokeWidth="4" 
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />
      
      {/* Circuit Nodes */}
      <circle cx="75" cy="40" r="2" fill="#d8b4fe" />
      <circle cx="80" cy="55" r="2" fill="#d8b4fe" />
      <circle cx="65" cy="75" r="2" fill="#d8b4fe" />
      
      {/* Circuit Lines */}
      <path d="M52 35 L65 35 L75 40" stroke="url(#purple_gradient)" strokeWidth="2" opacity="0.7" />
      <path d="M85 55 L75 55 L70 65" stroke="url(#purple_gradient)" strokeWidth="2" opacity="0.7" />

      {/* Central Divider */}
      <line x1="50" y1="20" x2="50" y2="90" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

      {/* Text VC */}
      <text 
        x="50" 
        y="60" 
        textAnchor="middle" 
        fill="white" 
        fontSize="24" 
        fontWeight="bold" 
        fontFamily="sans-serif"
        style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
      >
        VC
      </text>
    </svg>
  );
};
