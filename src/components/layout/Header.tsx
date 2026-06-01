import { useEffect, useState } from 'react'
import { Menu, ShieldAlert, CheckCircle, Clock, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { OfficeConfig, OfficeHours } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import clsx from 'clsx'

interface HeaderProps {
  onOpenSidebar: () => void
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const { signOut, user } = useAuth()
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null)
  const [officeHours, setOfficeHours] = useState<OfficeHours[]>([])
  const [isOpenNow, setIsOpenNow] = useState(false)
  const [formattedSchedule, setFormattedSchedule] = useState('')

  useEffect(() => {
    async function loadHeaderData() {
      try {
        // 1. Carrega configurações do escritório (id = 1)
        const { data: configData } = await supabase
          .from('office_config')
          .select('*')
          .eq('id', 1)
          .single()
        if (configData) setOfficeConfig(configData)

        // 2. Carrega horários de funcionamento
        const { data: hoursData } = await supabase
          .from('office_hours')
          .select('*')
        if (hoursData) setOfficeHours(hoursData)
      } catch (err) {
        console.error('Erro ao carregar dados do Header:', err)
      }
    }
    loadHeaderData()

    // Ouve alterações em tempo real no office_config
    const configSubscription = supabase
      .channel('header_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_config' }, payload => {
        if (payload.new && (payload.new as OfficeConfig).id === 1) {
          setOfficeConfig(payload.new as OfficeConfig)
        }
      })
      .subscribe()

    // Ouve alterações em tempo real no office_hours
    const hoursSubscription = supabase
      .channel('header_hours_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_hours' }, () => {
        loadHeaderData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(configSubscription)
      supabase.removeChannel(hoursSubscription)
    }
  }, [])

  useEffect(() => {
    if (officeHours.length === 0) return

    function checkStatus() {
      const now = new Date()
      
      // Obter o dia da semana atual em português correspondente ao ENUM dia_semana
      const daysEnumMap: Record<number, string> = {
        0: 'domingo',
        1: 'segunda',
        2: 'terca',
        3: 'quarta',
        4: 'quinta',
        5: 'sexta',
        6: 'sabado',
      }
      
      const currentDayEnum = daysEnumMap[now.getDay()]
      const todayHours = officeHours.find(h => h.dia === currentDayEnum)

      if (!todayHours || !todayHours.aberto || !todayHours.hora_inicio || !todayHours.hora_fim) {
        setIsOpenNow(false)
        setFormattedSchedule('Fechado hoje')
        return
      }

      // Comparar horários locais (a máquina já roda no fuso America/Cuiaba do usuário)
      const [startH, startM] = todayHours.hora_inicio.split(':').map(Number)
      const [endH, endM] = todayHours.hora_fim.split(':').map(Number)

      const currentHours = now.getHours()
      const currentMinutes = now.getMinutes()

      const startTimeInMinutes = startH * 60 + startM
      const endTimeInMinutes = endH * 60 + endM
      const currentTimeInMinutes = currentHours * 60 + currentMinutes

      const open = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes
      setIsOpenNow(open)
      
      // Formata exibição simples (Ex: 08:00 - 18:00)
      const startStr = todayHours.hora_inicio.substring(0, 5)
      const endStr = todayHours.hora_fim.substring(0, 5)
      setFormattedSchedule(`${startStr} - ${endStr}`)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 15000) // atualiza mais frequentemente
    return () => clearInterval(interval)
  }, [officeHours])

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-[var(--bg-card)] border-b border-[var(--border-card)] shrink-0 z-10 transition-colors duration-200">
      {/* Lado Esquerdo - Mobile menu toggle & Logo dinâmico */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 rounded-lg hover:bg-[var(--accent-light)] dark:hover:bg-white/5 text-[var(--text-main)] lg:hidden transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Logo dinâmico do escritório */}
        <div className="flex items-center gap-2.5">
          {officeConfig?.logo_url ? (
            <img
              src={officeConfig.logo_url}
              alt="Logo"
              className="h-8 w-auto object-contain rounded"
              onError={e => {
                // Fallback se a imagem der erro de carregamento
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="hidden sm:flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--accent)] text-[var(--bg-sidebar)] font-bold text-sm uppercase">
              {officeConfig?.nome ? officeConfig.nome.substring(0, 2) : 'ME'}
            </div>
          )}
          <span className="text-sm font-bold text-[var(--text-main)] hidden sm:inline truncate max-w-[200px]">
            {officeConfig?.nome || 'Mestra | Segurança e Saúde Ocupacional'}
          </span>
        </div>
      </div>

      {/* Lado Direito - Horário comercial dinâmico & Perfil do Admin */}
      <div className="flex items-center gap-4">
        {/* Status Aberto/Fechado Comercial */}
        {officeHours.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 border border-[var(--border-card)]/50">
            <span className="relative flex h-2 w-2">
              <span
                className={clsx(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isOpenNow ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
                )}
              />
              <span
                className={clsx(
                  'relative inline-flex rounded-full h-2 w-2',
                  isOpenNow ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
                )}
              />
            </span>
            <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-wider hidden md:inline">
              {isOpenNow ? 'Expediente Aberto' : 'Fora do Expediente'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">
              ({formattedSchedule})
            </span>
          </div>
        )}

        {/* Perfil Admin */}
        <div className="flex items-center gap-3 border-l border-[var(--border-card)] pl-4">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-xs font-bold text-[var(--text-main)]">Marlon Hacks</span>
            <span className="text-[9px] font-medium text-[var(--text-muted)] tracking-tight">
              {user?.email || 'marlonhacks2013@gmail.com'}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-[var(--primary)] dark:bg-[var(--accent)] text-white dark:text-[var(--bg-sidebar)] flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'MH'}
          </div>
          <button
            onClick={signOut}
            title="Sair do Sistema"
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all cursor-pointer focus:outline-none"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
