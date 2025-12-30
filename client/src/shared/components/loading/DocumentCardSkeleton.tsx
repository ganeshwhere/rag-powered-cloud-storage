'use client';

import React from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export const DocumentCardSkeleton: React.FC = () => {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* File icon skeleton */}
        <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <Skeleton className="h-5 w-3/4 mb-2" />
          
          {/* Metadata skeleton */}
          <div className="flex items-center gap-4 text-sm">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          
          {/* Status skeleton */}
          <div className="mt-2">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        {/* Actions skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </Card>
  );
};

export const DocumentListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <DocumentCardSkeleton key={index} />
      ))}
    </div>
  );
};