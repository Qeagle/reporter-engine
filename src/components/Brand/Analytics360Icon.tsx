import React from 'react';

interface Analytics360IconProps {
  className?: string;
  size?: number;
}

const Analytics360Icon: React.FC<Analytics360IconProps> = ({ 
  className = "w-8 h-8", 
  size = 24 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring representing 360-degree view */}
      <circle 
        cx="12" 
        cy="12" 
        r="10.5" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeDasharray="6 3"
        fill="none"
        opacity="0.6"
      />
      
      {/* Inner dashboard circle */}
      <circle 
        cx="12" 
        cy="12" 
        r="8" 
        stroke="currentColor" 
        strokeWidth="0.5" 
        fill="none"
        opacity="0.3"
      />
      
      {/* Central analytics hub */}
      <circle 
        cx="12" 
        cy="12" 
        r="2" 
        fill="currentColor" 
        opacity="0.8"
      />
      
      {/* Data visualization bars radiating from center */}
      <g transform="translate(12,12)">
        {/* Bar 1 - Top */}
        <rect x="-0.5" y="-7" width="1" height="3" fill="currentColor" opacity="0.9" />
        {/* Bar 2 - Top Right */}
        <rect x="3" y="-6" width="1" height="2" fill="currentColor" opacity="0.7" transform="rotate(45)" />
        {/* Bar 3 - Right */}
        <rect x="5" y="-0.5" width="2" height="1" fill="currentColor" opacity="0.8" />
        {/* Bar 4 - Bottom Right */}
        <rect x="3" y="4" width="1" height="2" fill="currentColor" opacity="0.6" transform="rotate(135)" />
        {/* Bar 5 - Bottom */}
        <rect x="-0.5" y="4" width="1" height="3" fill="currentColor" opacity="0.9" />
        {/* Bar 6 - Bottom Left */}
        <rect x="-5" y="3" width="1" height="2" fill="currentColor" opacity="0.7" transform="rotate(225)" />
        {/* Bar 7 - Left */}
        <rect x="-7" y="-0.5" width="2" height="1" fill="currentColor" opacity="0.8" />
        {/* Bar 8 - Top Left */}
        <rect x="-5" y="-5" width="1" height="2" fill="currentColor" opacity="0.6" transform="rotate(315)" />
      </g>
      
      {/* Trending indicators */}
      <path 
        d="M6 14L8 12L10 13L12 10L14 11L16 8L18 10" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
        opacity="0.7"
      />
      
      {/* Data points */}
      <circle cx="8" cy="12" r="0.8" fill="currentColor" opacity="1" />
      <circle cx="12" cy="10" r="0.8" fill="currentColor" opacity="1" />
      <circle cx="16" cy="8" r="0.8" fill="currentColor" opacity="1" />
      
      {/* 360° degree indicator */}
      <text 
        x="20" 
        y="5" 
        fontSize="3" 
        fill="currentColor" 
        opacity="0.5"
        fontFamily="monospace"
      >
        360°
      </text>
    </svg>
  );
};

export default Analytics360Icon;
