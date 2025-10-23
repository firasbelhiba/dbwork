import React from 'react';
import Image from 'next/image';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({
  size = 'md',
  text = 'Loading...'
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Logo Container with Filling Animation */}
      <div className="relative">
        {/* Background Logo (Gray/Faded) */}
        <div className={`${sizeClasses[size]} relative opacity-20 dark:opacity-10`}>
          <Image
            src="/logo-icon-blue.png"
            alt="Logo"
            fill
            className="object-contain"
          />
        </div>

        {/* Filling Animation Overlay */}
        <div className={`${sizeClasses[size]} absolute inset-0 overflow-hidden`}>
          <div className="relative w-full h-full">
            {/* Animated Fill */}
            <div className="absolute inset-0 animate-fill-up">
              <Image
                src="/logo-icon-blue.png"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Pulse Effect */}
        <div className={`${sizeClasses[size]} absolute inset-0 animate-pulse-slow opacity-30`}>
          <Image
            src="/logo-icon-blue.png"
            alt="Logo"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Loading Text with Dots Animation */}
      {text && (
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {text}
          </span>
          <span className="flex gap-1">
            <span className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce-dot-1"></span>
            <span className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce-dot-2"></span>
            <span className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce-dot-3"></span>
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes fillUp {
          0% {
            clip-path: inset(100% 0 0 0);
          }
          100% {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes pulseSlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.5;
          }
        }

        @keyframes bounceDot1 {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }

        @keyframes bounceDot2 {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }

        @keyframes bounceDot3 {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }

        .animate-fill-up {
          animation: fillUp 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulseSlow 2s ease-in-out infinite;
        }

        .animate-bounce-dot-1 {
          animation: bounceDot1 1.4s ease-in-out infinite;
        }

        .animate-bounce-dot-2 {
          animation: bounceDot2 1.4s ease-in-out 0.2s infinite;
        }

        .animate-bounce-dot-3 {
          animation: bounceDot3 1.4s ease-in-out 0.4s infinite;
        }
      `}</style>
    </div>
  );
};
