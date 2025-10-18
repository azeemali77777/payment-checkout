'use client';

import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface PaymentRetryProps {
  error: string;
  onRetry: () => Promise<void>;
  onCancel: () => void;
  maxRetries?: number;
  currentRetry?: number;
}

const PaymentRetry = memo(({ 
  error, 
  onRetry, 
  onCancel, 
  maxRetries = 3, 
  currentRetry = 0 
}: PaymentRetryProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(currentRetry);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) return;

    setIsRetrying(true);
    try {
      await onRetry();
      setRetryCount(prev => prev + 1);
    } catch (_error) {
      // Error handling is done by parent component
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryCount, maxRetries]);

  const remainingRetries = maxRetries - retryCount;
  const canRetry = remainingRetries > 0;

  // Determine error type and provide specific guidance
  const getErrorGuidance = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('insufficient funds') || lowerError.includes('declined')) {
      return {
        icon: '💳',
        title: 'Payment Declined',
        suggestions: [
          'Check your account balance',
          'Try a different payment method',
          'Contact your bank if the issue persists'
        ]
      };
    }
    
    if (lowerError.includes('expired') || lowerError.includes('invalid card')) {
      return {
        icon: '🔄',
        title: 'Card Issue',
        suggestions: [
          'Check your card details are correct',
          'Verify the expiry date',
          'Try a different card'
        ]
      };
    }
    
    if (lowerError.includes('network') || lowerError.includes('timeout') || lowerError.includes('service')) {
      return {
        icon: '🌐',
        title: 'Connection Issue',
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'The issue may resolve automatically'
        ]
      };
    }
    
    return {
      icon: '⚠️',
      title: 'Payment Error',
      suggestions: [
        'Double-check your payment information',
        'Try again in a few moments',
        'Contact support if the problem continues'
      ]
    };
  };

  const errorGuidance = getErrorGuidance(error);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-800">
          <span className="text-2xl" role="img" aria-label="Error">
            {errorGuidance.icon}
          </span>
          <span>{errorGuidance.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>

        {/* Retry Information */}
        {canRetry && (
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Retry Payment</h4>
              <span className="text-sm text-gray-500">
                {remainingRetries} attempt{remainingRetries !== 1 ? 's' : ''} remaining
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((maxRetries - remainingRetries) / maxRetries) * 100}%` }}
                role="progressbar"
                aria-valuenow={maxRetries - remainingRetries}
                aria-valuemin={0}
                aria-valuemax={maxRetries}
                aria-label={`${maxRetries - remainingRetries} of ${maxRetries} retry attempts used`}
              />
            </div>

            {/* Suggestions */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                What you can try:
              </h5>
              <ul className="text-sm text-gray-600 space-y-1">
                {errorGuidance.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* No More Retries */}
        {!canRetry && (
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-red-500">⚠️</span>
              <h4 className="font-medium text-gray-900">Maximum Retries Reached</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              We&apos;ve attempted to process your payment {maxRetries} times without success. 
              Please check your payment information or try a different payment method.
            </p>
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Next steps:</p>
              <ul className="space-y-1">
                <li>• Update your payment information</li>
                <li>• Try a different card or payment method</li>
                <li>• Contact your bank or card issuer</li>
                <li>• Reach out to our support team for assistance</li>
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {canRetry && (
            <Button
              onClick={handleRetry}
              loading={isRetrying}
              disabled={isRetrying}
              variant="primary"
              className="flex-1"
            >
              {isRetrying ? 'Retrying Payment...' : `Retry Payment (${remainingRetries} left)`}
            </Button>
          )}
          
          <Button
            onClick={onCancel}
            variant={canRetry ? "outline" : "primary"}
            className="flex-1"
            disabled={isRetrying}
          >
            {canRetry ? 'Update Payment Info' : 'Update Payment Method'}
          </Button>
        </div>

        {/* Support Contact */}
        <div className="text-center pt-4 border-t border-red-200">
          <p className="text-sm text-gray-600">
            Need help? Contact our support team at{' '}
            <a 
              href="mailto:support@example.com" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              support@example.com
            </a>
            {' '}or{' '}
            <a 
              href="tel:+1-800-123-4567" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              1-800-123-4567
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

PaymentRetry.displayName = 'PaymentRetry';

export { PaymentRetry };
