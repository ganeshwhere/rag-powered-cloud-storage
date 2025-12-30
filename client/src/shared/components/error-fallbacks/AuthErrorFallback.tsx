'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Lock, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthErrorFallbackProps {
  message?: string;
  showLoginButton?: boolean;
}

export const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({
  message = 'Authentication required',
  showLoginButton = true
}) => {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/auth/login');
  };

  return (
    <Card className="p-6 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-4">
        <Lock className="h-12 w-12 text-amber-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Access Restricted
      </h3>
      
      <p className="text-gray-600 mb-4">
        {message}. Please log in to continue.
      </p>
      
      {showLoginButton && (
        <Button onClick={handleLogin} className="flex items-center gap-2 mx-auto">
          <LogIn className="h-4 w-4" />
          Log In
        </Button>
      )}
    </Card>
  );
};