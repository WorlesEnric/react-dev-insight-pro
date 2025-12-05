/**
 * Base UI Components
 * 
 * Foundational UI components with a distinctive dark developer-tools aesthetic.
 * Features subtle gradients, refined animations, and monospace accents.
 */

import React, { forwardRef } from 'react';

// ============================================
// Button Component
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    font-medium tracking-tight
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;
  
  const variants = {
    primary: `
      bg-gradient-to-b from-emerald-500 to-emerald-600
      hover:from-emerald-400 hover:to-emerald-500
      text-white shadow-lg shadow-emerald-500/25
      focus:ring-emerald-500
      border border-emerald-400/20
    `,
    secondary: `
      bg-slate-800 hover:bg-slate-700
      text-slate-200
      border border-slate-600/50
      focus:ring-slate-500
    `,
    ghost: `
      bg-transparent hover:bg-slate-800/50
      text-slate-400 hover:text-slate-200
      focus:ring-slate-500
    `,
    danger: `
      bg-gradient-to-b from-red-500 to-red-600
      hover:from-red-400 hover:to-red-500
      text-white shadow-lg shadow-red-500/25
      focus:ring-red-500
      border border-red-400/20
    `
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg'
  };
  
  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
            />
          </svg>
        </span>
      ) : null}
      <span className={loading ? 'invisible' : 'flex items-center gap-2'}>
        {icon}
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

// ============================================
// Input Component
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-3 flex items-center text-slate-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5
            ${icon ? 'pl-10' : ''}
            bg-slate-800/50 
            border border-slate-700/50
            rounded-lg
            text-slate-200 text-sm
            placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            transition-all duration-200
            ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ============================================
// Badge Component
// ============================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'sm',
  className = '' 
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs'
  };
  
  return (
    <span className={`
      inline-flex items-center
      font-mono font-medium uppercase tracking-wider
      rounded-md border
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
    </span>
  );
}

// ============================================
// Card Component
// ============================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div 
      className={`
        bg-gradient-to-b from-slate-800/80 to-slate-800/40
        border border-slate-700/50
        rounded-xl
        backdrop-blur-sm
        ${hover ? 'hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/50 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ============================================
// IconButton Component
// ============================================

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  tooltip?: string;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  tooltip,
  active = false,
  className = '',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      title={tooltip}
      className={`
        p-2 rounded-lg
        transition-all duration-200
        ${active 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent'
        }
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
});

IconButton.displayName = 'IconButton';

// ============================================
// Spinner Component
// ============================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  return (
    <svg 
      className={`animate-spin text-emerald-500 ${sizes[size]} ${className}`} 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" cy="12" r="10" 
        stroke="currentColor" 
        strokeWidth="3" 
        fill="none" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
      />
    </svg>
  );
}

// ============================================
// Tooltip Component
// ============================================

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
  
  return (
    <div className="relative group">
      {children}
      <div className={`
        absolute ${positions[position]}
        px-2 py-1
        bg-slate-900 border border-slate-700
        rounded-md
        text-xs text-slate-300
        whitespace-nowrap
        opacity-0 group-hover:opacity-100
        pointer-events-none
        transition-opacity duration-200
        z-50
      `}>
        {content}
      </div>
    </div>
  );
}

// ============================================
// Divider Component
// ============================================

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className = '' }: DividerProps) {
  return (
    <div 
      className={`
        ${orientation === 'horizontal' 
          ? 'h-px w-full bg-gradient-to-r' 
          : 'w-px h-full bg-gradient-to-b'
        }
        from-transparent via-slate-700/50 to-transparent
        ${className}
      `}
    />
  );
}
