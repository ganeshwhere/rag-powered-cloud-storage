'use client';

import React, { forwardRef } from 'react';
import { Button, buttonVariants } from './button';
import { cn } from '@/shared/utils/cn';
import { VariantProps } from 'class-variance-authority';

interface AccessibleButtonProps extends 
  React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-pressed'?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    className, 
    loading = false, 
    loadingText = 'Loading...', 
    disabled,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-pressed': ariaPressed,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <Button
        ref={ref}
        className={cn(
          // Focus styles for better accessibility
          'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-current',
          className
        )}
        disabled={isDisabled}
        aria-label={loading ? loadingText : ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span 
              className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"
              aria-hidden="true"
            />
            <span className="sr-only">{loadingText}</span>
            {children}
          </span>
        ) : (
          children
        )}
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';