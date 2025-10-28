import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
        primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
        secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 shadow-sm',
        success: 'bg-success-500 text-white hover:bg-success-600 shadow-sm',
        warning: 'bg-warning-500 text-white hover:bg-warning-600 shadow-sm',
        danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-sm',
        outline: 'border-2 border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-300 hover:border-gray-400 dark:hover:border-dark-200',
        ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100',
        link: 'underline-offset-4 hover:underline text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
