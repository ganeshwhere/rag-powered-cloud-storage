'use client';

import React from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export const SearchResultSkeleton: React.FC = () => {
  return (
    <Card className="p-6">
      {/* Answer section skeleton */}
      <div className="mb-6">
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      
      {/* Sources section skeleton */}
      <div>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const SearchResultsSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <SearchResultSkeleton key={index} />
      ))}
    </div>
  );
};