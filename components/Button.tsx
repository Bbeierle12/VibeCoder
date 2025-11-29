import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  className, 
  variant = 'filled', 
  size = 'md', 
  children,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-38 disabled:pointer-events-none cursor-pointer overflow-hidden relative";
  
  const variants = {
    filled: "bg-md-sys-color-primary text-md-sys-color-on-primary hover:shadow-elevation-1 hover:bg-opacity-90 active:scale-[0.98]",
    tonal: "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container hover:shadow-elevation-1 hover:bg-opacity-90 active:scale-[0.98]",
    outlined: "border border-md-sys-color-outline text-md-sys-color-primary hover:bg-md-sys-color-primary hover:bg-opacity-10 active:bg-opacity-20",
    text: "text-md-sys-color-primary hover:bg-md-sys-color-primary hover:bg-opacity-10 active:bg-opacity-20",
    icon: "text-md-sys-color-on-surface-variant hover:bg-md-sys-color-on-surface hover:bg-opacity-10 active:bg-opacity-20 rounded-full"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs rounded-full min-h-[32px]",
    md: "px-6 py-2.5 text-sm rounded-full min-h-[40px]",
    lg: "px-8 py-3 text-base rounded-full min-h-[48px]",
  };
  
  const iconSizes = {
    sm: "p-2 min-w-[32px] min-h-[32px]",
    md: "p-3 min-w-[40px] min-h-[40px]",
    lg: "p-4 min-w-[48px] min-h-[48px]"
  };

  const classes = twMerge(
    baseStyles,
    variants[variant],
    variant === 'icon' ? iconSizes[size] : sizes[size],
    className
  );

  return (
    <button className={classes} {...props}>
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
};