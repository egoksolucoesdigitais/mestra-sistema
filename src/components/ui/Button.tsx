import React from 'react'
import clsx from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
  
  const variants = {
    primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] dark:bg-[var(--accent)] dark:text-[var(--bg-sidebar)] dark:hover:bg-[var(--accent)] dark:hover:opacity-90 shadow-md shadow-black/10',
    secondary: 'bg-[var(--accent-light)] text-[var(--text-main)] hover:bg-[var(--border-card)] border border-[var(--accent)]/30',
    outline: 'border border-[var(--border-card)] text-[var(--text-main)] hover:bg-[var(--accent-light)] dark:hover:bg-white/5',
    danger: 'bg-[var(--danger)] text-white hover:opacity-90 shadow-sm shadow-red-500/10',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
