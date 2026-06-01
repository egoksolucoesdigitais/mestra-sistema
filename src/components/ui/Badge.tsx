import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  status?: string
  className?: string
}

export default function Badge({ children, status, className }: BadgeProps) {
  const statusStyles: Record<string, string> = {
    // leads_sst
    novo_contato: 'bg-[#EBF4FF] text-[#1C5EA8] border-[#BFDBFE] dark:bg-[#1e3a5f] dark:text-[#93c5fd] dark:border-[#2563eb]',
    em_atendimento: 'bg-[#FEF9E7] text-[#92600A] border-[#FDE68A] dark:bg-[#78350f]/30 dark:text-[#fcd34d] dark:border-[#d97706]/40',
    qualificado: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] dark:bg-[#064e3b]/30 dark:text-[#86efac] dark:border-[#059669]/40',
    aguardando_retorno: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA] dark:bg-[#7c2d12]/30 dark:text-[#ffedd5] dark:border-[#ea580c]/40',
    proposta_enviada: 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE] dark:bg-[#4c1d95]/30 dark:text-[#ddd6fe] dark:border-[#7c3aed]/40',
    fechado: 'bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7] dark:bg-[#064e3b]/40 dark:text-[#a7f3d0] dark:border-[#10b981]/40',
    perdido: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] dark:bg-[#7f1d1d]/30 dark:text-[#fca5a5] dark:border-[#dc2626]/40',

    // atendimentos_sst
    aberto: 'bg-[#EBF4FF] text-[#1C5EA8] border-[#BFDBFE] dark:bg-[#1e3a5f] dark:text-[#93c5fd] dark:border-[#2563eb]',
    em_andamento: 'bg-[#FEF9E7] text-[#92600A] border-[#FDE68A] dark:bg-[#78350f]/30 dark:text-[#fcd34d] dark:border-[#d97706]/40',
    aguardando_cliente: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA] dark:bg-[#7c2d12]/30 dark:text-[#ffedd5] dark:border-[#ea580c]/40',
    resolvido: 'bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7] dark:bg-[#064e3b]/40 dark:text-[#a7f3d0] dark:border-[#10b981]/40',
    encerrado: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] dark:bg-[#374151]/30 dark:text-[#d1d5db] dark:border-[#4b5563]/40',
  }

  const badgeClass = status && statusStyles[status]
    ? statusStyles[status]
    : 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/30'

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass} ${className || ''}`}
    >
      {children}
    </span>
  )
}
