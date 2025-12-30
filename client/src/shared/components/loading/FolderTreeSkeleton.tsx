'use client';

import React from 'react';
import { Skeleton } from '../ui/skeleton';

export const FolderTreeItemSkeleton: React.FC<{ level?: number }> = ({ level = 0 }) => {
  return (
    <div className="flex items-center gap-2 py-2" style={{ paddingLeft: `${level * 20}px` }}>
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
};

export const FolderTreeSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 8 }) => {
  return (
    <div className="space-y-1">
      {Array.from({ length: itemCount }).map((_, index) => (
        <FolderTreeItemSkeleton 
          key={index} 
          level={Math.floor(Math.random() * 3)} 
        />
      ))}
    </div>
  );
};