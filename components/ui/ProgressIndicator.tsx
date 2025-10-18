'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

const ProgressIndicator = memo(({ steps, currentStep, className }: ProgressIndicatorProps) => {
  return (
    <nav 
      aria-label="Checkout progress" 
      className={cn('w-full', className)}
    >
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <li 
              key={step.id} 
              className={cn(
                'flex items-center',
                index < steps.length - 1 && 'flex-1'
              )}
            >
              <div className="flex items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors duration-200',
                    isCompleted && 'bg-green-600 border-green-600 text-white',
                    isCurrent && 'bg-blue-600 border-blue-600 text-white',
                    isUpcoming && 'bg-white border-gray-300 text-gray-500'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Step Label */}
                <div className="ml-3 hidden sm:block">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors duration-200',
                      isCompleted && 'text-green-600',
                      isCurrent && 'text-blue-600',
                      isUpcoming && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-colors duration-200',
                    stepNumber < currentStep ? 'bg-green-600' : 'bg-gray-300'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile Step Indicator */}
      <div className="sm:hidden mt-4 text-center">
        <p className="text-sm text-gray-600">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Progress: ${currentStep} of ${steps.length} steps completed`}
          />
        </div>
      </div>
    </nav>
  );
});

ProgressIndicator.displayName = 'ProgressIndicator';

export { ProgressIndicator };

