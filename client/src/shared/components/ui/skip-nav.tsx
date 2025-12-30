'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

interface SkipNavProps {
  links?: Array<{
    href: string;
    label: string;
  }>;
  className?: string;
}

export const SkipNav: React.FC<SkipNavProps> = ({
  links = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' }
  ],
  className
}) => {
  return (
    <div className={cn('sr-only focus-within:not-sr-only', className)}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            'absolute top-0 left-0 z-50 p-4 bg-blue-600 text-white',
            'focus:relative focus:z-auto',
            'transition-all duration-200',
            'hover:bg-blue-700 focus:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2'
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};