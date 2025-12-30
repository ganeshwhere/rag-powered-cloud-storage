'use client';

import React from 'react';
import { Progress } from './progress';
import { Card } from './card';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description?: string;
  error?: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: string;
  showProgress?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  showProgress = true,
  className
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepTextColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'in-progress':
        return 'text-blue-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      {showProgress && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress
            </span>
            <span className="text-sm text-gray-500">
              {completedSteps} of {totalSteps} completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg transition-colors',
              step.id === currentStep && 'bg-blue-50 border border-blue-200',
              step.status === 'error' && 'bg-red-50 border border-red-200'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('font-medium', getStepTextColor(step))}>
                  {step.label}
                </span>
                {step.status === 'in-progress' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    In Progress
                  </span>
                )}
              </div>
              
              {step.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {step.description}
                </p>
              )}
              
              {step.error && (
                <p className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded border border-red-200">
                  {step.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};