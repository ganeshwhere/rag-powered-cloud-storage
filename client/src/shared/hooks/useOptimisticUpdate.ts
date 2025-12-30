'use client';

import { useState, useCallback } from 'react';
import { showSuccess, showError, showLoading, dismissLoading } from '../utils/error-handling';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  loadingMessage?: string;
  revertOnError?: boolean;
}

export function useOptimisticUpdate<T = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const executeOptimisticUpdate = useCallback(async <TData>(
    optimisticUpdate: () => void,
    apiCall: () => Promise<T>,
    revertUpdate: () => void,
    options: OptimisticUpdateOptions<T> = {}
  ) => {
    const {
      onSuccess,
      onError,
      successMessage,
      loadingMessage = 'Processing...',
      revertOnError = true
    } = options;

    setIsLoading(true);
    setError(null);

    // Show loading toast
    const loadingToastId = showLoading(loadingMessage);

    try {
      // Apply optimistic update immediately
      optimisticUpdate();

      // Execute the API call
      const result = await apiCall();

      // Dismiss loading toast and show success
      dismissLoading(loadingToastId);
      if (successMessage) {
        showSuccess(successMessage);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      // Dismiss loading toast
      dismissLoading(loadingToastId);

      // Revert optimistic update if requested
      if (revertOnError) {
        revertUpdate();
      }

      // Handle error
      setError(err);
      showError(err instanceof Error ? err.message : 'Operation failed');

      // Call error callback
      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    executeOptimisticUpdate,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

// Specialized hook for document operations
export function useOptimisticDocumentUpdate() {
  const { executeOptimisticUpdate, isLoading, error, clearError } = useOptimisticUpdate();

  const deleteDocument = useCallback(async (
    documentId: string,
    removeFromList: () => void,
    addBackToList: () => void,
    apiCall: () => Promise<void>
  ) => {
    return executeOptimisticUpdate(
      removeFromList,
      apiCall,
      addBackToList,
      {
        successMessage: 'Document deleted successfully',
        loadingMessage: 'Deleting document...'
      }
    );
  }, [executeOptimisticUpdate]);

  const updateDocument = useCallback(async (
    updateLocal: () => void,
    revertLocal: () => void,
    apiCall: () => Promise<any>,
    successMessage = 'Document updated successfully'
  ) => {
    return executeOptimisticUpdate(
      updateLocal,
      apiCall,
      revertLocal,
      {
        successMessage,
        loadingMessage: 'Updating document...'
      }
    );
  }, [executeOptimisticUpdate]);

  return {
    deleteDocument,
    updateDocument,
    isLoading,
    error,
    clearError
  };
}

// Specialized hook for folder operations
export function useOptimisticFolderUpdate() {
  const { executeOptimisticUpdate, isLoading, error, clearError } = useOptimisticUpdate();

  const createFolder = useCallback(async (
    addToList: () => void,
    removeFromList: () => void,
    apiCall: () => Promise<any>
  ) => {
    return executeOptimisticUpdate(
      addToList,
      apiCall,
      removeFromList,
      {
        successMessage: 'Folder created successfully',
        loadingMessage: 'Creating folder...'
      }
    );
  }, [executeOptimisticUpdate]);

  const deleteFolder = useCallback(async (
    removeFromList: () => void,
    addBackToList: () => void,
    apiCall: () => Promise<void>
  ) => {
    return executeOptimisticUpdate(
      removeFromList,
      apiCall,
      addBackToList,
      {
        successMessage: 'Folder deleted successfully',
        loadingMessage: 'Deleting folder...'
      }
    );
  }, [executeOptimisticUpdate]);

  const renameFolder = useCallback(async (
    updateLocal: () => void,
    revertLocal: () => void,
    apiCall: () => Promise<any>
  ) => {
    return executeOptimisticUpdate(
      updateLocal,
      apiCall,
      revertLocal,
      {
        successMessage: 'Folder renamed successfully',
        loadingMessage: 'Renaming folder...'
      }
    );
  }, [executeOptimisticUpdate]);

  return {
    createFolder,
    deleteFolder,
    renameFolder,
    isLoading,
    error,
    clearError
  };
}