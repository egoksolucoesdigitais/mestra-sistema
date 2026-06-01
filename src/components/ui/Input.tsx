import React from 'react'
import clsx from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-[var(--text-muted)] tracking-wide uppercase">
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          'w-full px-3.5 py-2.5 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-main)] transition-all duration-200 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)]/50 disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-[var(--danger)] font-medium">{error}</span>}
    </div>
  )
}
