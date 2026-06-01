import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { AtendimentoSST, AtendimentoStatus, DateFilter } from '../types'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { format } from 'date-fns'
import { Search, HelpCircle, MessageSquare } from 'lucide-react'

export default function Atendimentos() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [atendimentos, setAtendimentos] = useState<AtendimentoSST[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Filtro de Data
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: 'este_mes',
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const statusOptions: { value: AtendimentoStatus; label: string }[] = [
    { value: 'aberto', label: 'Aberto' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'aguardando_cliente', label: 'Aguardando Cliente' },
    { value: 'resolvido', label: 'Resolvido' },
    { value: 'encerrado', label: 'Encerrado' },
  ]

  async function loadAtendimentos() {
    try {
      setLoading(true)

      // Busca atendimentos com joins de Leads, Clientes (e seus Leads) e Atendentes
      const { data, error } = await supabase
        .from('atendimentos_sst')
        .select(`
          *,
          lead:leads_sst(*),
          cliente:clientes_sst(
            id,
            lead:leads_sst(*)
          ),
          atendente:atendentes(*)
        `)
        .gte('iniciado_em', `${dateFilter.startDate}T00:00:00-04:00`)
        .lte('iniciado_em', `${dateFilter.endDate}T23:59:59-04:00`)
        .order('iniciado_em', { ascending: false })

      if (error) throw error
      setAtendimentos((data || []) as unknown as AtendimentoSST[])
    } catch (err) {
      console.error('Erro ao carregar atendimentos:', err)
      showToast('Erro ao carregar lista de atendimentos', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAtendimentos()
  }, [dateFilter])

  // Ação Rápida: Mudar Status diretamente na Tabela
  const handleQuickStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, atend: AtendimentoSST) => {
    e.stopPropagation() // impede clique na linha
    const newStatus = e.target.value as AtendimentoStatus
    
    try {
      const updates: any = { status: newStatus }
      
      // Se for resolvido ou encerrado, preenche finalizado_em
      if ((newStatus === 'resolvido' || newStatus === 'encerrado') && !atend.finalizado_em) {
        updates.finalizado_em = new Date().toISOString()
      }

      const { error } = await supabase
        .from('atendimentos_sst')
        .update(updates)
        .eq('id', atend.id)

      if (error) throw error
      
      showToast('Status do atendimento atualizado!')
      // Recarrega localmente sem refresh total
      setAtendimentos(prev =>
        prev.map(a =>
          a.id === atend.id
            ? { ...a, status: newStatus, finalizado_em: updates.finalizado_em || a.finalizado_em }
            : a
        )
      )
    } catch (err) {
      console.error(err)
      showToast('Erro ao atualizar status', 'error')
    }
  }

  // Obter Nome do Lead ou Cliente
  const getClientName = (atend: AtendimentoSST) => {
    if (atend.cliente && atend.cliente.lead) {
      return atend.cliente.lead.nome_lead || atend.cliente.lead.whatsapp_lead
    }
    if (atend.lead) {
      return atend.lead.nome_lead || atend.lead.whatsapp_lead
    }
    return '-'
  }

  // Obter WhatsApp
  const getClientWhatsApp = (atend: AtendimentoSST) => {
    if (atend.cliente && atend.cliente.lead) {
      return atend.cliente.lead.whatsapp_lead
    }
    if (atend.lead) {
      return atend.lead.whatsapp_lead
    }
    return '-'
  }

  // Obter Empresa
  const getClientCompany = (atend: AtendimentoSST) => {
    if (atend.cliente && atend.cliente.lead) {
      return atend.cliente.lead.empresa || '-'
    }
    if (atend.lead) {
      return atend.lead.empresa || '-'
    }
    return '-'
  }

  // Filtro na tela de busca por texto
  const filteredAtendimentos = atendimentos.filter(atend => {
    const term = searchTerm.toLowerCase()
    const name = getClientName(atend).toLowerCase()
    const whatsapp = getClientWhatsApp(atend).toLowerCase()
    const company = getClientCompany(atend).toLowerCase()
    return (
      name.includes(term) ||
      whatsapp.includes(term) ||
      company.includes(term) ||
      (atend.assunto || '').toLowerCase().includes(term) ||
      (atend.origem || '').toLowerCase().includes(term)
    )
  })

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
        title="Atendimentos"
        description="Gerencie todas as conversas, solicitações e demandas registradas pelo agente de IA ou pela equipe da Mestra."
      />

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <FilterBar value={dateFilter} onChange={setDateFilter} />

        {/* Input de Busca */}
        <div className="relative w-full md:max-w-xs mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Pesquisar atendimentos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[var(--bg-card)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {loading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-4">
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded col-span-2" />
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded animate-pulse" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="grid grid-cols-7 gap-4 pt-4 border-t border-[var(--border-card)]">
                <div className="h-4 bg-[var(--border-card)] rounded" />
                <div className="h-4 bg-[var(--border-card)] rounded col-span-2" />
                <div className="h-4 bg-[var(--border-card)] rounded" />
                <div className="h-4 bg-[var(--border-card)] rounded" />
                <div className="h-4 bg-[var(--border-card)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredAtendimentos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 rounded-full bg-[var(--accent-light)] text-[var(--accent)] mb-4 shadow-sm animate-pulse">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-lg font-bold font-display text-[var(--text-main)] mb-1">Nenhum atendimento registrado</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm">
            Não há registros de atendimentos ou demandas no período e filtro selecionados.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border border-[var(--border-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--accent-light)] dark:bg-white/5 border-b border-[var(--border-card)]">
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Início</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Lead/Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Assunto</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Origem</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Alterar Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)] bg-[var(--bg-card)]">
                {filteredAtendimentos.map(atend => (
                  <tr
                    key={atend.id}
                    onClick={() => navigate(`/atendimentos/${atend.id}`)}
                    className="hover:bg-[var(--accent-light)]/40 dark:hover:bg-white/5 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-xs font-semibold text-[var(--text-main)]">
                      {formatDateTime(atend.iniciado_em)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[var(--text-main)]">
                      {getClientName(atend)}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                      {getClientWhatsApp(atend)}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                      {getClientCompany(atend)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[var(--text-main)] max-w-[150px] truncate">
                      {atend.assunto || 'Sem assunto'}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-semibold capitalize">
                      {atend.origem || 'WhatsApp'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={atend.status}>{atend.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <select
                        value={atend.status}
                        onChange={e => handleQuickStatusChange(e, atend)}
                        className="px-2 py-1 text-[10px] font-bold bg-[var(--bg-card)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
