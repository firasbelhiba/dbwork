import React, { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
        secondary: 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300',
        success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
        warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-400',
        danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
        // Issue type badges
        bug: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
        task: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
        story: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
        epic: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
        // Issue priority badges
        critical: 'bg-danger-500 text-white',
        high: 'bg-warning-500 text-white',
        medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
        low: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        // Issue status badges
        todo: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        in_progress: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
        in_review: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
        done: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant, dot, children, ...props }) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />}
      {children}
    </div>
  );
};
