import React from 'react';
import type { Dealership } from '@/types';

interface DealershipHeaderProps {
  dealership: Dealership;
  defaultLogoUrl: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  leftContent?: React.ReactNode;
  className?: string;
}

export const DealershipHeader: React.FC<DealershipHeaderProps> = ({
  dealership,
  defaultLogoUrl,
  subtitle,
  rightContent,
  leftContent,
  className = ''
}) => {
  const logoUrl = dealership.logo_url || defaultLogoUrl;

  return (
    <header 
      className={`sticky top-0 z-40 shadow-lg ${className}`}
      style={{ backgroundColor: dealership.primary_color }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {leftContent}
          <img 
            src={logoUrl} 
            alt={dealership.name} 
            className="w-10 h-10 rounded-xl bg-white/20 object-contain"
            onError={(e) => {
              // Fallback to default logo if custom logo fails to load
              (e.target as HTMLImageElement).src = defaultLogoUrl;
            }}
          />
          <div>
            <h1 className="text-white font-bold">{dealership.name}</h1>
            {subtitle && (
              <p className="text-white/70 text-xs">{subtitle}</p>
            )}
          </div>
        </div>
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
};
