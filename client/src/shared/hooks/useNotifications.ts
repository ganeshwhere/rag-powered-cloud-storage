'use client';

import { useCallback } from 'react';
import { showSuccess, showError, showLoading, dismissLoading } from '../utils/error-handling';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export function useNotifications() {
  const success = useCallback((message: string, options?: NotificationOptions) => {
    showSuccess(message);
  }, []);

  const error = useCallback((message: string, options?: NotificationOptions) => {
    showError(message);
  }, []);

  const loading = useCallback((message: string, options?: NotificationOptions) => {
    return showLoading(message);
  }, []);

  const dismiss = useCallback((toastId: string) => {
    dismissLoading(toastId);
  }, []);

  // Predefined notifications for common actions
  const documentUploaded = useCallback((fileName: string) => {
    success(`${fileName} uploaded successfully`);
  }, [success]);

  const documentDeleted = useCallback(() => {
    success('Document deleted successfully');
  }, [success]);

  const documentProcessing = useCallback((fileName: string) => {
    return loading(`Processing ${fileName}...`);
  }, [loading]);

  const documentProcessed = useCallback((fileName: string) => {
    success(`${fileName} processed successfully`);
  }, [success]);

  const folderCreated = useCallback((folderName: string) => {
    success(`Folder "${folderName}" created successfully`);
  }, [success]);

  const folderDeleted = useCallback(() => {
    success('Folder deleted successfully');
  }, [success]);

  const folderRenamed = useCallback((oldName: string, newName: string) => {
    success(`Folder renamed from "${oldName}" to "${newName}"`);
  }, [success]);

  const searchCompleted = useCallback((resultsCount: number) => {
    if (resultsCount === 0) {
      error('No results found for your search');
    } else {
      success(`Found ${resultsCount} relevant ${resultsCount === 1 ? 'result' : 'results'}`);
    }
  }, [success, error]);

  const authSuccess = useCallback((action: 'login' | 'register' | 'logout') => {
    const messages = {
      login: 'Logged in successfully',
      register: 'Account created successfully',
      logout: 'Logged out successfully'
    };
    success(messages[action]);
  }, [success]);

  const authError = useCallback((action: 'login' | 'register') => {
    const messages = {
      login: 'Login failed. Please check your credentials.',
      register: 'Registration failed. Please try again.'
    };
    error(messages[action]);
  }, [error]);

  const networkError = useCallback(() => {
    error('Network connection failed. Please check your internet connection.');
  }, [error]);

  const serverError = useCallback(() => {
    error('Server error occurred. Please try again later.');
  }, [error]);

  const validationError = useCallback((message?: string) => {
    error(message || 'Please check your input and try again.');
  }, [error]);

  return {
    // Basic notifications
    success,
    error,
    loading,
    dismiss,
    
    // Document notifications
    documentUploaded,
    documentDeleted,
    documentProcessing,
    documentProcessed,
    
    // Folder notifications
    folderCreated,
    folderDeleted,
    folderRenamed,
    
    // Search notifications
    searchCompleted,
    
    // Auth notifications
    authSuccess,
    authError,
    
    // Error notifications
    networkError,
    serverError,
    validationError
  };
}