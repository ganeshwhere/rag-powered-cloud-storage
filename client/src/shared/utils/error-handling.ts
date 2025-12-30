import toast from 'react-hot-toast';

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    const appError = this.parseError(error);
    
    // Log error for debugging
    console.error(`Error in ${context || 'unknown context'}:`, error);
    
    // Show user-friendly toast notification
    this.showErrorToast(appError);
    
    return appError;
  }

  static parseError(error: unknown): AppError {
    // Handle Axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      
      return {
        message: data?.message || data?.detail || this.getStatusMessage(status),
        code: data?.code || `HTTP_${status}`,
        status,
        details: data
      };
    }
    
    // Handle network errors
    if (error && typeof error === 'object' && 'code' in error) {
      const networkError = error as any;
      if (networkError.code === 'NETWORK_ERROR' || networkError.code === 'ERR_NETWORK') {
        return {
          message: 'Network connection failed. Please check your internet connection.',
          code: 'NETWORK_ERROR'
        };
      }
    }
    
    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'GENERIC_ERROR'
      };
    }
    
    // Handle string errors
    if (typeof error === 'string') {
      return {
        message: error,
        code: 'STRING_ERROR'
      };
    }
    
    // Fallback for unknown errors
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR'
    };
  }

  static getStatusMessage(status?: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Conflict. The resource already exists or is in use.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  static showErrorToast(error: AppError): void {
    toast.error(error.message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        maxWidth: '400px'
      }
    });
  }

  static showSuccessToast(message: string): void {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        maxWidth: '400px'
      }
    });
  }

  static showLoadingToast(message: string): string {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        background: '#3b82f6',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        maxWidth: '400px'
      }
    });
  }

  static dismissToast(toastId: string): void {
    toast.dismiss(toastId);
  }
}

// Specific error types for different scenarios
export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed', public fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class FileUploadError extends Error {
  constructor(message = 'File upload failed', public fileName?: string) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class DocumentProcessingError extends Error {
  constructor(message = 'Document processing failed', public documentId?: string) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export class SearchError extends Error {
  constructor(message = 'Search failed') {
    super(message);
    this.name = 'SearchError';
  }
}

// Utility functions for common error scenarios
export const handleApiError = (error: unknown, context?: string): AppError => {
  return ErrorHandler.handle(error, context);
};

export const showSuccess = (message: string): void => {
  ErrorHandler.showSuccessToast(message);
};

export const showError = (message: string): void => {
  ErrorHandler.showErrorToast({ message });
};

export const showLoading = (message: string): string => {
  return ErrorHandler.showLoadingToast(message);
};

export const dismissLoading = (toastId: string): void => {
  ErrorHandler.dismissToast(toastId);
};