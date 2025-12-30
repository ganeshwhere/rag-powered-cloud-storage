"use client"

import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/features/auth/context'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { queryClient } from './react-query'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                maxWidth: '400px'
              },
              success: {
                style: {
                  background: '#10b981',
                  color: '#ffffff'
                }
              },
              error: {
                style: {
                  background: '#ef4444',
                  color: '#ffffff'
                }
              },
              loading: {
                style: {
                  background: '#3b82f6',
                  color: '#ffffff'
                }
              }
            }}
          />
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}