'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import { useResponsiveColumns } from '@/shared/hooks/useResponsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: string;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = '1rem',
  className
}) => {
  const columnCount = useResponsiveColumns(columns);

  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap
      }}
    >
      {children}
    </div>
  );
};

interface ResponsiveStackProps {
  children: React.ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  gap?: string;
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  breakpoint = 'md',
  gap = '1rem',
  className
}) => {
  const breakpointClasses = {
    sm: 'sm:flex-row',
    md: 'md:flex-row',
    lg: 'lg:flex-row',
    xl: 'xl:flex-row'
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        breakpointClasses[breakpoint],
        className
      )}
      style={{ gap }}
    >
      {children}
    </div>
  );
};