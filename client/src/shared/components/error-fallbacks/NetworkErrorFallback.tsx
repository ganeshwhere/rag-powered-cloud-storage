'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Wifi, RefreshCw } from 'lucide-react';

interface NetworkErrorFallbackProps {
  onRetry?: () => void;
  message?: string;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({
  onRetry,
  message = 'Network connection failed'
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <Card className="p-6 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-4">
        <Wifi className="h-12 w-12 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Connection Problem
      </h3>
      
      <p className="text-gray-600 mb-4">
        {message}. Please check your internet connection and try again.
      </p>
      
      <Button onClick={handleRetry} className="flex items-center gap-2 mx-auto">
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </Card>
  );
};