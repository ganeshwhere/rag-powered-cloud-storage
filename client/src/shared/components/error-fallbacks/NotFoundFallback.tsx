'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { FileX, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotFoundFallbackProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export const NotFoundFallback: React.FC<NotFoundFallbackProps> = ({
  title = 'Not Found',
  message = 'The resource you\'re looking for doesn\'t exist or has been moved.',
  showBackButton = true,
  showHomeButton = true
}) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.push('/');
  };

  return (
    <Card className="p-6 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-4">
        <FileX className="h-12 w-12 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-4">
        {message}
      </p>
      
      <div className="flex gap-3 justify-center">
        {showBackButton && (
          <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}
        
        {showHomeButton && (
          <Button onClick={handleHome} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
        )}
      </div>
    </Card>
  );
};