import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { AtendimentoSST, AtendimentoStatus } from '../types'
import { useToast } from '../contexts/ToastContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { format } from 'date-fns'
import { ChevronLeft, Save, MessageSquare, Calendar, Phone, Building, MapPin, ClipboardList, Info, Clock, User, Users } from 'lucide-react'

export default function AtendimentoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [atendimento, setAtendimento] = useState<AtendimentoSST | null>(null)
  
  // States para ações
  const [savingObs, setSavingObs] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [statusVal, setStatusVal] = useState<AtendimentoStatus>('aberto')

  const statusOptions: { value: AtendimentoStatus; label: string }[] = [
    { value: 'aberto', label: 'Aberto' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'aguardando_cliente', label: 'Aguardando Cliente' },
    { value: 'resolvido', label: 'Resolvido' },
    { value: 'encerrado', label: 'Encerrado' },
  ]

  useEffect(() => {
    async function loadAtendimento() {
      if (!id) return
      try {
        setLoading(true)
        
        // Busca atendimento com joins
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
          .eq('id', id)
          .single()

        if (error) throw error
        setAtendimento(data as unknown as AtendimentoSST)
        
        if (data) {
          setObservacoes(data.observacoes || '')
          setStatusVal(data.status as AtendimentoStatus)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do atendimento:', err)
        showToast('Erro ao carregar dados do atendimento', 'error')
        navigate('/atendimentos')
      } finally {
        setLoading(false)
      }
    }
    loadAtendimento()
  }, [id])

  // Salvar observações
  const handleSaveObs = async () => {
    if (!id || !atendimento) return
    try {
      setSavingObs(true)
      const { error } = await supabase
        .from('atendimentos_sst')
        .update({ observacoes })
        .eq('id', id)

      if (error) throw error
      setAtendimento(prev => prev ? { ...prev, observacoes } : null)
      showToast('Observações salvas com sucesso!')
    } catch (err) {
      console.error(err)
      showToast('Erro ao salvar observações', 'error')
    } finally {
      setSavingObs(false)
    }
  }

  // Alterar Status
  const handleStatusChange = async (newStatus: AtendimentoStatus) => {
    if (!id || !atendimento) return
    
    try {
      const updates: any = { status: newStatus }
      
      // Se for resolvido ou encerrado, preenche finalizado_em
      if ((newStatus === 'resolvido' || newStatus === 'encerrado') && !atendimento.finalizado_em) {
        updates.finalizado_em = new Date().toISOString()
      }

      const { error } = await supabase
        .from('atendimentos_sst')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      setStatusVal(newStatus)
      setAtendimento(prev => prev ? { ...prev, status: newStatus, finalizado_em: updates.finalizado_em || prev.finalizado_em } : null)
      showToast(`Status do atendimento atualizado para "${statusOptions.find(o => o.value === newStatus)?.label}"`)
    } catch (err) {
      console.error(err)
      showToast('Erro ao atualizar status', 'error')
    }
  }

  // Obter Dados do Cliente / Lead associado
  const getLinkedProfile = () => {
    if (!atendimento) return null
    if (atendimento.cliente && atendimento.cliente.lead) {
      return {
        ...atendimento.cliente.lead,
        tipo: 'Cliente',
        link: `/clientes/${atendimento.cliente_id}`
      }
    }
    if (atendimento.lead) {
      return {
        ...atendimento.lead,
        tipo: 'Lead',
        link: `/leads/${atendimento.lead_id}`
      }
    }
    return null
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

  if (loading || !atendimento) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[var(--border-card)] rounded-full" />
          <div className="h-8 w-48 bg-[var(--border-card)] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-[var(--border-card)] rounded-xl" />
          <div className="h-96 bg-[var(--border-card)] rounded-xl" />
        </div>
      </div>
    )
  }

  const profile = getLinkedProfile()

  return (
    <div className="flex flex-col gap-6">
      {/* Topo / Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/atendimentos')}
            className="p-2 rounded-lg hover:bg-[var(--accent-light)] dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Histórico de Atendimento</span>
            <h2 className="text-xl font-bold font-display text-[var(--text-main)] mt-0.5">
              {atendimento.assunto || 'Atendimento sem assunto'}
            </h2>
          </div>
        </div>

        {/* Seletor de Status */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Status:</span>
          <select
            value={statusVal}
            onChange={e => handleStatusChange(e.target.value as AtendimentoStatus)}
            className="px-3.5 py-2 text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] cursor-pointer animate-fade-in"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo - Ficha do Atendimento */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-6">
            <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2 pb-3 border-b border-[var(--border-card)]">
              <MessageSquare size={16} className="text-[var(--accent)]" />
              Detalhes da Ocorrência
            </h3>

            {/* Descrição */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Descrição da Demanda</span>
              <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-card)]/50 whitespace-pre-line">
                {atendimento.descricao || 'Nenhuma descrição fornecida.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-[var(--border-card)]">
              {/* Origem */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Info size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Origem do Contato</span>
                  <span className="text-xs font-bold text-[var(--text-main)] capitalize">{atendimento.origem || 'WhatsApp'}</span>
                </div>
              </div>

              {/* Responsável */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <User size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Atendente Responsável</span>
                  <span className="text-xs font-bold text-[var(--text-main)]">
                    {atendimento.atendente?.nome || 'IA Agent (Automação)'}
                  </span>
                </div>
              </div>

              {/* Iniciado Em */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Iniciado em</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{formatDateTime(atendimento.iniciado_em)}</span>
                </div>
              </div>

              {/* Finalizado Em */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Clock size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Finalizado em</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{formatDateTime(atendimento.finalizado_em)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Dados do Perfil Vinculado (Lead ou Cliente) */}
          {profile && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
                <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2">
                  <Users size={16} className="text-[var(--accent)]" />
                  Contato Vinculado ({profile.tipo})
                </h3>
                <Button size="sm" variant="outline" onClick={() => navigate(profile.link)}>
                  Ver Perfil Completo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Nome</span>
                  <span className="font-bold text-[var(--text-main)]">{profile.nome_lead || 'Sem nome'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">WhatsApp</span>
                  <span className="font-semibold text-[var(--text-main)]">{profile.whatsapp_lead}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Empresa</span>
                  <span className="font-semibold text-[var(--text-main)]">{profile.empresa || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">CNPJ</span>
                  <span className="font-semibold text-[var(--text-main)]">{profile.cnpj || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Cidade</span>
                  <span className="font-semibold text-[var(--text-main)]">{profile.cidade || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Interesse</span>
                  <span className="font-semibold text-[var(--text-main)]">{profile.servico_interesse || '-'}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Lado Direito - Observações Internas */}
        <div className="h-full">
          <Card className="flex flex-col h-full space-y-4">
            <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2 pb-3 border-b border-[var(--border-card)]">
              <ClipboardList size={16} className="text-[var(--accent)]" />
              Observações do Atendimento
            </h3>

            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Digite aqui observações e resoluções sobre esta demanda..."
              className="flex-1 w-full p-3 text-xs bg-[var(--bg-base)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]/50 min-h-[220px]"
            />

            <Button onClick={handleSaveObs} disabled={savingObs} variant="primary" className="w-full">
              <Save size={14} className="mr-1.5" />
              {savingObs ? 'Salvando...' : 'Salvar Observações'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
