import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { LeadSST, AtendimentoSST, OfficeHours, DateFilter } from '../types'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'
import { Users, UserCheck, MessageSquare, AlertCircle, HeartPulse, Clock } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  // States
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSST[]>([])
  const [clientesCount, setClientesCount] = useState(0)
  const [atendimentosHoje, setAtendimentosHoje] = useState(0)
  const [officeHours, setOfficeHours] = useState<OfficeHours[]>([])

  // Filtro de Data (Inicializa com Este Mês)
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: 'este_mes',
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  // Cores do Gráfico de Pizza
  const PIE_COLORS = ['#1C2B3A', '#C9A84C'] // [Dentro do Horário (Primary), Fora do Horário (Accent)]
  const PIE_COLORS_DARK = ['#93c5fd', '#C9A84C']

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)

        // 1. Busca leads no período
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads_sst')
          .select('*')
          .gte('inicio_atendimento', `${dateFilter.startDate}T00:00:00-04:00`)
          .lte('inicio_atendimento', `${dateFilter.endDate}T23:59:59-04:00`)

        if (leadsError) throw leadsError
        setLeads(leadsData || [])

        // 2. Busca contagem de clientes convertidos no período
        const { count: clientCount, error: clientError } = await supabase
          .from('clientes_sst')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${dateFilter.startDate}T00:00:00-04:00`)
          .lte('created_at', `${dateFilter.endDate}T23:59:59-04:00`)

        if (clientError) throw clientError
        setClientesCount(clientCount || 0)

        // 3. Busca atendimentos de hoje (iniciado_em = hoje e status != encerrado)
        // Sempre baseado na data atual local
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const { count: atendHojeCount, error: atendError } = await supabase
          .from('atendimentos_sst')
          .select('*', { count: 'exact', head: true })
          .gte('iniciado_em', `${todayStr}T00:00:00-04:00`)
          .lte('iniciado_em', `${todayStr}T23:59:59-04:00`)
          .neq('status', 'encerrado')

        if (atendError) throw atendError
        setAtendimentosHoje(atendHojeCount || 0)

        // 4. Carrega horários comerciais para cálculo de expedientes do gráfico de pizza
        const { data: hoursData } = await supabase
          .from('office_hours')
          .select('*')
        if (hoursData) setOfficeHours(hoursData)

      } catch (err) {
        console.error('Erro ao carregar dados do Dashboard:', err)
        showToast('Erro ao carregar dados analíticos', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [dateFilter])

  // --- TRATAMENTO DOS DADOS PARA OS GRÁFICOS ---

  // 1. Leads por Dia (Gráfico de Linha)
  const getLeadsByDayData = () => {
    if (leads.length === 0) return []
    
    // Gera todos os dias no intervalo para garantir que dias vazios fiquem com 0
    const start = new Date(dateFilter.startDate + 'T00:00:00')
    const end = new Date(dateFilter.endDate + 'T23:59:59')
    const daysInterval = eachDayOfInterval({ start, end })

    // Agrupa e conta leads
    const counts: Record<string, number> = {}
    leads.forEach(lead => {
      if (lead.inicio_atendimento) {
        const dayStr = format(new Date(lead.inicio_atendimento), 'dd/MM')
        counts[dayStr] = (counts[dayStr] || 0) + 1
      }
    })

    return daysInterval.map(day => {
      const dayStr = format(day, 'dd/MM')
      return {
        data: dayStr,
        leads: counts[dayStr] || 0,
      }
    })
  }

  // 2. Leads por Dia da Semana (Gráfico de Barras)
  const getLeadsByWeekDayData = () => {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const daysEnumMap: Record<string, number> = {
      domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6
    }
    
    const counts = [0, 0, 0, 0, 0, 0, 0] // Dom a Sáb

    leads.forEach(lead => {
      if (lead.inicio_atendimento) {
        const dayOfWeek = new Date(lead.inicio_atendimento).getDay()
        counts[dayOfWeek]++
      }
    })

    return weekDays.map((label, idx) => ({
      dia: label,
      leads: counts[idx],
    }))
  }

  // 3. Atendimentos por Horário (Gráfico de Pizza)
  const getAtendimentosScheduleData = () => {
    let dentro = 0
    let fora = 0

    leads.forEach(lead => {
      if (!lead.inicio_atendimento) return

      const date = new Date(lead.inicio_atendimento)
      const dayOfWeekNum = date.getDay()
      
      const daysEnumMap: Record<number, string> = {
        0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
      }
      const dayEnum = daysEnumMap[dayOfWeekNum]
      const hConfig = officeHours.find(h => h.dia === dayEnum)

      if (!hConfig || !hConfig.aberto || !hConfig.hora_inicio || !hConfig.hora_fim) {
        fora++
        return
      }

      const [startH, startM] = hConfig.hora_inicio.split(':').map(Number)
      const [endH, endM] = hConfig.hora_fim.split(':').map(Number)

      const currentH = date.getHours()
      const currentM = date.getMinutes()

      const startTime = startH * 60 + startM
      const endTime = endH * 60 + endM
      const currentTime = currentH * 60 + currentM

      if (currentTime >= startTime && currentTime < endTime) {
        dentro++
      } else {
        fora++
      }
    })

    return {
      chartData: [
        { name: 'Dentro do Expediente', value: dentro },
        { name: 'Fora do Expediente', value: fora }
      ],
      dentro,
      fora
    }
  }

  const { chartData: scheduleChartData, dentro: dentroCount, fora: foraCount } = getAtendimentosScheduleData()

  // String descritiva do horário comercial atual
  const getOfficeHoursScheduleString = () => {
    const commercialDays = officeHours.filter(h => h.aberto && h.dia !== 'domingo' && h.dia !== 'sabado')
    if (commercialDays.length === 0) return 'Horário Comercial não configurado'
    const standard = commercialDays[0]
    return `seg–sex, ${standard.hora_inicio?.substring(0, 5)}–${standard.hora_fim?.substring(0, 5)}`
  }

  // Formatador brasileiro de data e hora
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Acompanhe os principais indicadores de atendimento da Mestra no período selecionado — volume de leads, clientes convertidos, atendimentos e o impacto das automações em tempo real."
      />

      {/* Barra de Filtros */}
      <FilterBar value={dateFilter} onChange={setDateFilter} />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Leads */}
        <Card className="flex items-center justify-between border border-[var(--border-card)]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total de Leads</span>
            <span className="text-3xl font-extrabold text-[var(--text-main)] font-display mt-1.5">{leads.length}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium mt-1">No período selecionado</span>
          </div>
          <div className="p-3 bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)] rounded-xl shadow-inner shadow-black/5">
            <Users size={24} />
          </div>
        </Card>

        {/* Card 2: Clientes */}
        <Card className="flex items-center justify-between border border-[var(--border-card)]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Clientes Convertidos</span>
            <span className="text-3xl font-extrabold text-[var(--text-main)] font-display mt-1.5">{clientesCount}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium mt-1">Fechados no período</span>
          </div>
          <div className="p-3 bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)] rounded-xl shadow-inner shadow-black/5">
            <UserCheck size={24} />
          </div>
        </Card>

        {/* Card 3: Atendimentos Hoje */}
        <Card className="flex items-center justify-between border border-[var(--border-card)]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Demandas Abertas Hoje</span>
            <span className="text-3xl font-extrabold text-[var(--text-main)] font-display mt-1.5">{atendimentosHoje}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium mt-1">Atendimentos ativos hoje (fuso Cuiabá)</span>
          </div>
          <div className="p-3 bg-red-100 dark:bg-white/5 text-[var(--danger)] rounded-xl shadow-inner shadow-black/5">
            <MessageSquare size={24} />
          </div>
        </Card>
      </div>

      {/* Gráfico 1: Linha de Volume de Leads */}
      <Card className="border border-[var(--border-card)]">
        <div className="mb-4">
          <h3 className="text-sm font-bold font-display text-[var(--text-main)]">Volume de Leads por Dia</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Acompanhe a quantidade de leads que entraram em contato com a Mestra a cada dia.</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getLeadsByDayData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
              <XAxis dataKey="data" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-card)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--text-main)'
                }}
              />
              <Line
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Segunda fileira de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 2: Barras - Leads por dia da semana */}
        <Card className="border border-[var(--border-card)]">
          <div className="mb-4">
            <h3 className="text-sm font-bold font-display text-[var(--text-main)]">Leads por Dia da Semana</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Distribuição do volume de novos contatos nos diferentes dias de atendimento.</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getLeadsByWeekDayData()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
                <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--text-main)'
                  }}
                />
                <Bar dataKey="leads" name="Leads" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico 3: Pizza - Expediente comercial e IA */}
        <Card className="border border-[var(--border-card)] flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold font-display text-[var(--text-main)]">Atendimentos por Horário</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Atendimentos iniciados dentro e fora do horário de funcionamento padrão.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Gráfico */}
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scheduleChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {scheduleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-card)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: 'var(--text-main)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legendas e contagem */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Horário Comercial Padrão</span>
                  <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-[var(--accent)] animate-pulse" />
                    {getOfficeHoursScheduleString()}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[var(--primary)] shrink-0" />
                    <span className="text-xs text-[var(--text-main)] font-semibold">
                      {dentroCount} atendimentos dentro do horário
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[var(--accent)] shrink-0" />
                    <span className="text-xs text-[var(--text-main)] font-semibold">
                      {foraCount} atendimentos fora do horário
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso IA */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 border border-[var(--accent)]/15 mt-4">
            <AlertCircle size={16} className="text-[var(--accent)] shrink-0 mt-0.5 animate-pulse" />
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
              Os atendimentos fora do horário comercial foram registrados pelo Agente de IA. Sem ele, esses contatos poderiam ter sido perdidos para a concorrência.
            </p>
          </div>
        </Card>
      </div>

      {/* Tabela de Leads no Período */}
      <Card className="border border-[var(--border-card)]">
        <div className="mb-4">
          <h3 className="text-sm font-bold font-display text-[var(--text-main)]">Leads no Período</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Histórico completo de leads captados no intervalo de datas selecionado.</p>
        </div>

        {leads.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-6 text-center">Nenhum lead captado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-light)] dark:bg-white/5">
                  <th className="px-4 py-3">Início do Atendimento</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Serviço de Interesse</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)] text-xs text-[var(--text-main)]">
                {leads.slice(0, 10).map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="hover:bg-[var(--accent-light)]/40 dark:hover:bg-white/5 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-3 font-semibold">{formatDateTime(lead.inicio_atendimento)}</td>
                    <td className="px-4 py-3 font-bold">{lead.nome_lead || <span className="italic text-[var(--text-muted)] font-normal">Sem nome</span>}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] font-medium">{lead.whatsapp_lead}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] font-medium">{lead.empresa || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] font-medium">{lead.servico_interesse || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge status={lead.status}>{lead.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 10 && (
              <div className="p-3 text-center border-t border-[var(--border-card)]">
                <button
                  onClick={() => navigate('/leads')}
                  className="text-xs font-bold text-[var(--accent)] hover:underline focus:outline-none"
                >
                  Ver todos os {leads.length} leads
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
