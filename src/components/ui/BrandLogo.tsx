import React from "react";

interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = "h-10 w-10" }: BrandLogoProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-doc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" /> {/* Indigo 500 */}
          <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet 500 */}
        </linearGradient>
        
        <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Document Base with folded corner */}
      <path 
        d="M128 64c-17.7 0-32 14.3-32 32v320c0 17.7 14.3 32 32 32h256c17.7 0 32-14.3 32-32V192L288 64H128z" 
        fill="url(#logo-doc-gradient)" 
        filter="url(#logo-shadow)" 
      />
            
      {/* Folded Corner accent */}
      <path d="M288 64v128h128L288 64z" fill="#ffffff" opacity="0.4" />

      {/* Document Text Lines */}
      <path d="M168 280h176" fill="none" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
      <path d="M168 344h176" fill="none" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
      <path d="M168 408h120" fill="none" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
      
      {/* Sleek Padlock positioned in the upper text area */}
      <rect x="220" y="160" width="72" height="56" rx="12" fill="#ffffff" />
      <path d="M236 160v-24c0-11 9-20 20-20s20 9 20 20v24" fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
      
      {/* Lock Keyhole */}
      <circle cx="256" cy="188" r="8" fill="url(#logo-doc-gradient)" />
    </svg>
  );
}
