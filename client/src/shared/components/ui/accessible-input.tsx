'use client';

import React, { forwardRef, useId } from 'react';
import { Input } from './input';
import { cn } from '@/shared/utils/cn';

interface AccessibleInputProps extends Omit<React.ComponentProps<"input">, 'id'> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  id?: string;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    label,
    description,
    error,
    required = false,
    hideLabel = false,
    className,
    id: providedId,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    
    const describedBy = [ariaDescribedBy, descriptionId, errorId]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={id}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              hideLabel && 'sr-only'
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        {description && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {description}
          </p>
        )}
        
        <Input
          ref={ref}
          id={id}
          className={cn(
            // Enhanced focus styles
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
            // Error styles
            error && 'border-red-500 focus-visible:ring-red-500',
            // High contrast support
            'contrast-more:border-2',
            className
          )}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required}
          {...props}
        />
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-600" 
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';