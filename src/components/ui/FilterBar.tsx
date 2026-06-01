import React, { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import type { DateFilter, FilterPreset } from '../../types'

interface FilterBarProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
}

export default function FilterBar({ value, onChange }: FilterBarProps) {
  const [showCustom, setShowCustom] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const presets: { key: FilterPreset; label: string; getRange: () => [string, string] }[] = [
    { key: 'hoje', label: 'Hoje', getRange: () => [todayStr, todayStr] },
    { key: 'ontem', label: 'Ontem', getRange: () => [format(subDays(today, 1), 'yyyy-MM-dd'), format(subDays(today, 1), 'yyyy-MM-dd')] },
    { key: 'ultimos_7_dias', label: 'Últimos 7 dias', getRange: () => [format(subDays(today, 6), 'yyyy-MM-dd'), todayStr] },
    { key: 'ultimos_14_dias', label: 'Últimos 14 dias', getRange: () => [format(subDays(today, 13), 'yyyy-MM-dd'), todayStr] },
    { key: 'este_mes', label: 'Este mês', getRange: () => [format(startOfMonth(today), 'yyyy-MM-dd'), format(endOfMonth(today), 'yyyy-MM-dd')] },
    { key: 'mes_passado', label: 'Mês passado', getRange: () => {
      const lastMonth = subMonths(today, 1)
      return [format(startOfMonth(lastMonth), 'yyyy-MM-dd'), format(endOfMonth(lastMonth), 'yyyy-MM-dd')]
    }},
    { key: 'este_ano', label: 'Este ano', getRange: () => [format(startOfYear(today), 'yyyy-MM-dd'), format(endOfYear(today), 'yyyy-MM-dd')] },
  ]

  const handlePresetClick = (preset: typeof presets[0]) => {
    const [start, end] = preset.getRange()
    setShowCustom(false)
    onChange({
      preset: preset.key,
      startDate: start,
      endDate: end,
    })
  }

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const start = data.get('startDate') as string
    const end = data.get('endDate') as string
    if (start && end) {
      onChange({
        preset: 'personalizado',
        startDate: start,
        endDate: end,
      })
      setShowCustom(false)
    }
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Auxiliar de formatação elegante para exibição amigável
  const formatFriendlyDate = (dateStr: string) => {
    try {
      // Adicionar timezone local na conversão
      const date = new Date(dateStr + 'T00:00:00')
      return format(date, 'dd/MM')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 p-1 bg-[var(--accent-light)] dark:bg-white/5 border border-[var(--border-card)] rounded-xl w-fit">
      {presets.map(p => {
        const isActive = value.preset === p.key
        return (
          <button
            key={p.key}
            onClick={() => handlePresetClick(p)}
            className={clsx(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 focus:outline-none',
              isActive
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/50 dark:hover:bg-white/5'
            )}
          >
            {p.label}
          </button>
        )
      })}

      {/* Seletor Personalizado */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 border border-transparent focus:outline-none',
            value.preset === 'personalizado'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/50 dark:hover:bg-white/5 border-[var(--border-card)]/50'
          )}
        >
          <CalendarDays size={14} />
          {value.preset === 'personalizado'
            ? `${formatFriendlyDate(value.startDate)} - ${formatFriendlyDate(value.endDate)}`
            : 'Personalizado'}
          <ChevronDown size={12} className={clsx('transition-transform duration-200', showCustom && 'rotate-180')} />
        </button>

        {showCustom && (
          <form
            onSubmit={handleCustomSubmit}
            className="absolute right-0 mt-2 z-30 p-4 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl shadow-xl flex flex-col gap-3 min-w-[260px] animate-slide-in"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">Data Início</label>
              <input
                type="date"
                name="startDate"
                max={todayStr}
                required
                defaultValue={value.preset === 'personalizado' ? value.startDate : todayStr}
                className="px-2.5 py-1.5 text-xs bg-[var(--bg-base)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">Data Fim</label>
              <input
                type="date"
                name="endDate"
                max={todayStr}
                required
                defaultValue={value.preset === 'personalizado' ? value.endDate : todayStr}
                className="px-2.5 py-1.5 text-xs bg-[var(--bg-base)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
            >
              Aplicar Filtro
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
