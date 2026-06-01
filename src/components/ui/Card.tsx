import React from 'react'
import clsx from 'clsx'

export interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export default function Card({ children, className, onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-5 shadow-sm transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-[var(--accent)]/40 cursor-pointer hover:translate-y-[-2px]',
        onClick && 'cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      {children}
    </div>
  )
}
