import React from "react";

interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = "h-10 w-10" }: BrandLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded square background */}
      <rect width="32" height="32" rx="8" fill="var(--editor-accent)" />

      {/* Document shape — white, offset slightly left */}
      <rect x="8" y="7" width="14" height="18" rx="2" fill="white" opacity="0.15" />
      <rect x="10" y="6" width="14" height="18" rx="2" fill="white" />

      {/* Folded corner — top right */}
      <path d="M20 6 L24 10 H20 V6Z" fill="var(--editor-accent)" />

      {/* Text lines */}
      <rect x="12" y="13" width="8" height="1.5" rx="0.75" fill="var(--editor-accent)" opacity="0.5" />
      <rect x="12" y="16.5" width="10" height="1.5" rx="0.75" fill="var(--editor-accent)" opacity="0.35" />
      <rect x="12" y="20" width="6" height="1.5" rx="0.75" fill="var(--editor-accent)" opacity="0.25" />
    </svg>
  );
}
