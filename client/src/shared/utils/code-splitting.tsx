'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '../components/ui/skeleton';
import { Card } from '../components/ui/card';

// Generic loading component
const DefaultLoadingComponent = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  </Card>
);

// Higher-order component for lazy loading with custom loading component
export function withLazyLoading<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
  LoadingComponent: ComponentType = DefaultLoadingComponent
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Specific loading components for different features
export const DocumentLoadingComponent = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <Card key={index} className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <div className="flex items-center gap-4 text-sm">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

export const SearchLoadingComponent = () => (
  <Card className="p-6">
    <div className="mb-6">
      <Skeleton className="h-6 w-32 mb-3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
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

export const FolderLoadingComponent = () => (
  <div className="space-y-1">
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className="flex items-center gap-2 py-2" style={{ paddingLeft: `${Math.floor(Math.random() * 3) * 20}px` }}>
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
    ))}
  </div>
);

// Create lazy components directly
const LazyDocumentListComponent = lazy(() => 
  import('@/features/documents/components/DocumentList').then(module => ({ 
    default: module.DocumentList 
  }))
);

const LazyDocumentViewerComponent = lazy(() => 
  import('@/features/documents/components/DocumentViewer').then(module => ({ 
    default: module.DocumentViewer 
  }))
);

const LazySearchInterfaceComponent = lazy(() => 
  import('@/features/search/components/SearchInterface').then(module => ({ 
    default: module.SearchInterface 
  }))
);

const LazySearchResultsComponent = lazy(() => 
  import('@/features/search/components/SearchResults').then(module => ({ 
    default: module.SearchResults 
  }))
);

const LazyFolderTreeComponent = lazy(() => 
  import('@/features/folders/components/FolderTree').then(module => ({ 
    default: module.FolderTree 
  }))
);

const LazyFolderManagerComponent = lazy(() => 
  import('@/features/folders/components/FolderManager').then(module => ({ 
    default: module.FolderManager 
  }))
);

const LazyUploadManagerComponent = lazy(() => 
  import('@/features/documents/components/upload/UploadManager').then(module => ({ 
    default: module.UploadManager 
  }))
);

// Export wrapped components
export const LazyDocumentList = withLazyLoading(LazyDocumentListComponent, DocumentLoadingComponent);
export const LazyDocumentViewer = withLazyLoading(LazyDocumentViewerComponent, DocumentLoadingComponent);
export const LazySearchInterface = withLazyLoading(LazySearchInterfaceComponent, SearchLoadingComponent);
export const LazySearchResults = withLazyLoading(LazySearchResultsComponent, SearchLoadingComponent);
export const LazyFolderTree = withLazyLoading(LazyFolderTreeComponent, FolderLoadingComponent);
export const LazyFolderManager = withLazyLoading(LazyFolderManagerComponent, FolderLoadingComponent);
export const LazyUploadManager = withLazyLoading(LazyUploadManagerComponent, DocumentLoadingComponent);

// Route-level lazy loading
export const LazyDocumentsPage = lazy(() => import('@/app/documents/page'));
export const LazySearchPage = lazy(() => import('@/app/search/page'));
export const LazyUploadPage = lazy(() => import('@/app/upload/page'));

// Preload utilities for better UX
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Preload on hover or other user interactions
  return () => {
    importFn().catch(() => {
      // Ignore preload errors
    });
  };
};

// Preload functions for common components
export const preloadDocumentList = preloadComponent(
  () => import('@/features/documents/components/DocumentList')
);

export const preloadSearchInterface = preloadComponent(
  () => import('@/features/search/components/SearchInterface')
);

export const preloadFolderTree = preloadComponent(
  () => import('@/features/folders/components/FolderTree')
);

// Bundle analysis helper (development only)
export const logBundleSize = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Loading component: ${componentName}`);
  }
};