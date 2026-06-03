import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ClienteSST, DateFilter } from '../types'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { format } from 'date-fns'
import { Search, UserCheck, Trash2, AlertCircle } from 'lucide-react'

export default function Clientes() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<ClienteSST[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filtro de Data
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: 'este_mes',
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  // States para remoção de cliente (desfazer conversão)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteSST | null>(null)
  const [removing, setRemoving] = useState(false)

  const handleRemoveClick = (cliente: ClienteSST) => {
    setSelectedCliente(cliente)
    setShowRemoveModal(true)
  }

  const executeRemoveCliente = async () => {
    if (!selectedCliente || !selectedCliente.lead_id) return
    
    try {
      setRemoving(true)
      
      // 1. Deleta o registro diretamente da tabela 'clientes_sst' (agora permitido pela política de DELETE RLS)
      const { error: deleteError } = await supabase
        .from('clientes_sst')
        .delete()
        .eq('id', selectedCliente.id)
        
      if (deleteError) throw deleteError

      // 2. Atualiza o lead de volta para 'em_atendimento' no banco
      const { error: updateError } = await supabase
        .from('leads_sst')
        .update({ status: 'em_atendimento' })
        .eq('id', selectedCliente.lead_id)
        
      if (updateError) throw updateError
      
      // Otimista: remove localmente da lista de clientes
      setClientes(prev => prev.filter(c => c.id !== selectedCliente.id))
      
      showToast('Conversão desfeita! O contato retornou para "Em Atendimento" no Kanban.', 'success')
    } catch (err) {
      console.error('Erro ao remover cliente:', err)
      showToast('Erro ao remover cliente. Tente novamente.', 'error')
    } finally {
      setRemoving(false)
      setShowRemoveModal(false)
      setSelectedCliente(null)
    }
  }

  useEffect(() => {
    async function loadClientes() {
      try {
        setLoading(true)
        
        // Busca joins entre clientes_sst e leads_sst
        const { data, error } = await supabase
          .from('clientes_sst')
          .select(`
            id,
            lead_id,
            data_conversao,
            created_at,
            lead:leads_sst(*)
          `)
          .gte('data_conversao', dateFilter.startDate)
          .lte('data_conversao', dateFilter.endDate)
          .order('data_conversao', { ascending: false })

        if (error) throw error
        const formattedData = (data || []).map((item: any) => ({
          ...item,
          lead: Array.isArray(item.lead) ? item.lead[0] : item.lead
        }))
        setClientes(formattedData as ClienteSST[])
      } catch (err) {
        console.error('Erro ao carregar clientes:', err)
        showToast('Erro ao carregar lista de clientes', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadClientes()
  }, [dateFilter])

  // Filtro na tela de busca por texto
  const filteredClientes = clientes.filter(cliente => {
    const lead = cliente.lead
    if (!lead) return false
    const term = searchTerm.toLowerCase()
    return (
      (lead.nome_lead || '').toLowerCase().includes(term) ||
      lead.whatsapp_lead.toLowerCase().includes(term) ||
      (lead.empresa || '').toLowerCase().includes(term) ||
      (lead.cidade || '').toLowerCase().includes(term) ||
      (lead.servico_interesse || '').toLowerCase().includes(term)
    )
  })

  // Formatador brasileiro de data
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return format(date, 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Todos os contatos que foram convertidos em clientes da Mestra. A promoção de lead para cliente acontece automaticamente quando o status do lead é alterado para fechado."
      />

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <FilterBar value={dateFilter} onChange={setDateFilter} />

        {/* Input de Busca */}
        <div className="relative w-full md:max-w-xs mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Pesquisar clientes..."
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
      ) : filteredClientes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 rounded-full bg-[var(--accent-light)] text-[var(--accent)] mb-4 shadow-sm animate-pulse">
            <UserCheck size={32} />
          </div>
          <h3 className="text-lg font-bold font-display text-[var(--text-main)] mb-1">Nenhum cliente convertido</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm">
            Não há registros de novos clientes fechados no período selecionado ou com este filtro.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border border-[var(--border-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--accent-light)] dark:bg-white/5 border-b border-[var(--border-card)]">
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Data de Conversão</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Serviço de Interesse</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)] bg-[var(--bg-card)]">
                {filteredClientes.map(cliente => {
                  const lead = cliente.lead
                  if (!lead) return null
                  
                  return (
                    <tr
                      key={cliente.id}
                      onClick={() => navigate(`/clientes/${cliente.id}`)}
                      className="hover:bg-[var(--accent-light)]/40 dark:hover:bg-white/5 cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-[var(--text-main)]">
                        {formatDate(cliente.data_conversao)}
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
                      <td className="px-6 py-4 text-xs text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleRemoveClick(cliente)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center border-none bg-transparent"
                          title="Desfazer conversão (Mover de volta para Em Atendimento)"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Confirmação de Remoção (Desfazer Conversão) */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => {
          if (!removing) {
            setShowRemoveModal(false)
            setSelectedCliente(null)
          }
        }}
        title="Desfazer Conversão de Cliente?"
        size="sm"
      >
        <div className="flex flex-col gap-4 text-center items-center py-2">
          <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full mb-1">
            <AlertCircle size={28} />
          </div>
          <p className="text-sm font-semibold text-[var(--text-main)]">
            Deseja desfazer a conversão deste cliente?
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm">
            O registro deste cliente será removido desta tela e o contato correspondente voltará para a coluna **"Em Atendimento"** no Kanban para que você possa continuar as tratativas.
          </p>
          <div className="flex gap-3 w-full mt-4">
            <Button
              variant="outline"
              className="flex-1"
              disabled={removing}
              onClick={() => {
                setShowRemoveModal(false)
                setSelectedCliente(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 text-white border-none"
              disabled={removing}
              onClick={executeRemoveCliente}
            >
              {removing ? 'Processando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
