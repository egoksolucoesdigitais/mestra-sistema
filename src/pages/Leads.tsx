import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { LeadSST, DateFilter } from '../types'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { format } from 'date-fns'
import { Search, UserMinus } from 'lucide-react'

export default function Leads() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSST[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filtro de Data
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: 'este_mes',
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    async function loadLeads() {
      try {
        setLoading(true)
        
        // 1. Busca IDs de clientes convertidos
        const { data: clientesData } = await supabase
          .from('clientes_sst')
          .select('lead_id')
        
        const clienteIds = (clientesData || []).map(c => c.lead_id)

        // 2. Busca leads no período selecionado
        let query = supabase
          .from('leads_sst')
          .select('*')
          .gte('inicio_atendimento', `${dateFilter.startDate}T00:00:00-04:00`)
          .lte('inicio_atendimento', `${dateFilter.endDate}T23:59:59-04:00`)
          .order('inicio_atendimento', { ascending: false })

        // Exclui os que já são clientes
        if (clienteIds.length > 0) {
          query = query.not('id', 'in', `(${clienteIds.join(',')})`)
        }

        const { data, error } = await query
        if (error) throw error
        setLeads(data || [])
      } catch (err) {
        console.error('Erro ao carregar leads:', err)
        showToast('Erro ao carregar lista de leads', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadLeads()
  }, [dateFilter])

  // Filtro na tela de busca por texto
  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase()
    return (
      (lead.nome_lead || '').toLowerCase().includes(term) ||
      lead.whatsapp_lead.toLowerCase().includes(term) ||
      (lead.empresa || '').toLowerCase().includes(term) ||
      (lead.cidade || '').toLowerCase().includes(term) ||
      (lead.servico_interesse || '').toLowerCase().includes(term)
    )
  })

  // Formatador brasileiro de data e hora
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return format(date, 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description="Lista completa dos contatos que entraram em contato com a Mestra e ainda não foram convertidos em clientes. Clique em qualquer lead para ver o histórico completo."
      />

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <FilterBar value={dateFilter} onChange={setDateFilter} />

        {/* Input de Busca */}
        <div className="relative w-full md:max-w-xs mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Pesquisar leads..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[var(--bg-card)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {loading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4">
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded col-span-2" />
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded" />
              <div className="h-6 bg-[var(--border-card)] rounded" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="grid grid-cols-6 gap-4 pt-4 border-t border-[var(--border-card)]">
                <div className="h-4 bg-[var(--border-card)] rounded" />
                <div className="h-4 bg-[var(--border-card)] rounded col-span-2" />
                <div className="h-4 bg-[var(--border-card)] rounded" />
                <div className="h-4 bg-[var(--border-card)] rounded" />
                <div className="h-4 bg-[var(--border-card)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredLeads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 rounded-full bg-[var(--accent-light)] text-[var(--accent)] mb-4 shadow-sm">
            <UserMinus size={32} />
          </div>
          <h3 className="text-lg font-bold font-display text-[var(--text-main)] mb-1">Nenhum lead encontrado</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm">
            Não há leads cadastrados no período selecionado ou que atendam ao critério da busca.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border border-[var(--border-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--accent-light)] dark:bg-white/5 border-b border-[var(--border-card)]">
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Início do Atendimento</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Serviço de Interesse</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)] bg-[var(--bg-card)]">
                {filteredLeads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="hover:bg-[var(--accent-light)]/40 dark:hover:bg-white/5 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-xs font-semibold text-[var(--text-main)]">
                      {formatDateTime(lead.inicio_atendimento)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[var(--text-main)]">
                      {lead.nome_lead || <span className="italic text-[var(--text-muted)] font-normal">Sem nome</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                      {lead.whatsapp_lead}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                      {lead.empresa || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                      {lead.cidade || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                      {lead.servico_interesse || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge status={lead.status}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
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
