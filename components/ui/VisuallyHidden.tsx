'use client';

import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * VisuallyHidden component for screen reader only content
 * Content is hidden visually but available to assistive technologies
 */
const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ children, className: _className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className="sr-only"
        {...props}
      >
        {children}
      </span>
    );
  }
);

VisuallyHidden.displayName = 'VisuallyHidden';

export { VisuallyHidden };
