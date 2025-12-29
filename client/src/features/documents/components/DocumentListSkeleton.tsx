'use client'

import React from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'

interface DocumentListSkeletonProps {
  count?: number
}

export const DocumentListSkeleton: React.FC<DocumentListSkeletonProps> = ({
  count = 5,
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}