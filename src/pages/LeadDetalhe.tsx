import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { LeadSST, AtendimentoSST, LeadStatus } from '../types'
import { useToast } from '../contexts/ToastContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import { ChevronLeft, Save, MessageSquare, AlertCircle, Calendar, Phone, Mail, Building, MapPin, ClipboardList, Info, Users, Clock } from 'lucide-react'
import clsx from 'clsx'

export default function LeadDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [lead, setLead] = useState<LeadSST | null>(null)
  const [atendimentos, setAtendimentos] = useState<AtendimentoSST[]>([])
  
  // States para ações
  const [savingNotes, setSavingNotes] = useState(false)
  const [anotacoes, setAnotacoes] = useState('')
  const [statusVal, setStatusVal] = useState<LeadStatus>('novo_contato')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null)

  const statusOptions: { value: LeadStatus; label: string }[] = [
    { value: 'novo_contato', label: 'Novo Contato' },
    { value: 'em_atendimento', label: 'Em Atendimento' },
    { value: 'qualificado', label: 'Qualificado' },
    { value: 'aguardando_retorno', label: 'Aguardando Retorno' },
    { value: 'proposta_enviada', label: 'Proposta Enviada' },
    { value: 'fechado', label: 'Fechado' },
    { value: 'perdido', label: 'Perdido' },
  ]

  useEffect(() => {
    async function loadLeadData() {
      if (!id) return
      try {
        setLoading(true)
        
        // 1. Busca dados do lead
        const { data: leadData, error: leadError } = await supabase
          .from('leads_sst')
          .select('*')
          .eq('id', id)
          .single()

        if (leadError) throw leadError
        setLead(leadData)
        if (leadData) {
          setAnotacoes(leadData.anotacoes || '')
          setStatusVal(leadData.status)
        }

        // 2. Busca atendimentos vinculados
        const { data: atendimentosData, error: atendimentosError } = await supabase
          .from('atendimentos_sst')
          .select('*')
          .eq('lead_id', id)
          .order('iniciado_em', { ascending: false })

        if (atendimentosError) throw atendimentosError
        setAtendimentos(atendimentosData || [])

      } catch (err) {
        console.error('Erro ao carregar dados do lead:', err)
        showToast('Erro ao carregar perfil do lead', 'error')
        navigate('/leads')
      } finally {
        setLoading(false)
      }
    }

    loadLeadData()
  }, [id])

  // Salvar anotações
  const handleSaveNotes = async () => {
    if (!id || !lead) return
    try {
      setSavingNotes(true)
      const { error } = await supabase
        .from('leads_sst')
        .update({ anotacoes })
        .eq('id', id)
      
      if (error) throw error
      setLead(prev => prev ? { ...prev, anotacoes } : null)
      showToast('Anotações salvas com sucesso!')
    } catch (err) {
      console.error(err)
      showToast('Erro ao salvar anotações', 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  // Alterar Status
  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!id || !lead) return
    
    // Se o status for fechado, abre o modal de confirmação
    if (newStatus === 'fechado') {
      setPendingStatus(newStatus)
      setShowConfirmModal(true)
      return
    }

    // Se estiver saindo de fechado, pode disparar trigger de deleção na base
    await executeStatusUpdate(newStatus)
  }

  const executeStatusUpdate = async (statusToApply: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('leads_sst')
        .update({ status: statusToApply })
        .eq('id', id)

      if (error) throw error
      setStatusVal(statusToApply)
      showToast(`Status atualizado para "${statusOptions.find(o => o.value === statusToApply)?.label}"`)
      
      // Se converteu para fechado, avisa que virou cliente e oferece navegar
      if (statusToApply === 'fechado') {
        showToast('Lead promovido a Cliente com sucesso!', 'info')
      }
    } catch (err) {
      console.error(err)
      showToast('Erro ao atualizar status do lead', 'error')
    } finally {
      setShowConfirmModal(false)
      setPendingStatus(null)
    }
  }

  // Formatadores de data
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  if (loading || !lead) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Topo / Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="p-2 rounded-lg hover:bg-[var(--accent-light)] dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Perfil do Lead</span>
            <h2 className="text-xl font-bold font-display text-[var(--text-main)] mt-0.5">
              {lead.nome_lead || lead.whatsapp_lead}
            </h2>
          </div>
        </div>

        {/* Seletor de Status Premium */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Status:</span>
          <select
            value={statusVal}
            onChange={e => handleStatusChange(e.target.value as LeadStatus)}
            className="px-3.5 py-2 text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
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
        
        {/* Lado Esquerdo - Informações Cadastrais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-6">
            <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2 pb-3 border-b border-[var(--border-card)]">
              <ClipboardList size={16} className="text-[var(--accent)]" />
              Informações Gerais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* WhatsApp */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Phone size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.whatsapp_lead}</span>
                </div>
              </div>

              {/* Empresa */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Building size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Empresa</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.empresa || '-'}</span>
                </div>
              </div>

              {/* Cargo */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Users size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cargo</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.cargo || '-'}</span>
                </div>
              </div>

              {/* CNPJ */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Info size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">CNPJ</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.cnpj || '-'}</span>
                </div>
              </div>

              {/* Cidade */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <MapPin size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cidade / Localidade</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.cidade || '-'}</span>
                </div>
              </div>

              {/* Serviço de Interesse */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Building size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Serviço de Interesse</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.servico_interesse || '-'}</span>
                </div>
              </div>

              {/* Início do Atendimento */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Início do Atendimento</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{formatDateTime(lead.inicio_atendimento)}</span>
                </div>
              </div>

              {/* Última Mensagem */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Clock size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Última Mensagem</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{formatDateTime(lead.ultima_mensagem)}</span>
                </div>
              </div>
            </div>

            {/* Motivo do Contato */}
            {lead.motivo_contato && (
              <div className="pt-4 border-t border-[var(--border-card)]">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Motivo do Contato</span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-card)]/50">
                  {lead.motivo_contato}
                </p>
              </div>
            )}

            {/* Resumo da Conversa do IA */}
            {lead.resumo_conversa && (
              <div className="pt-4 border-t border-[var(--border-card)]">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Resumo da Conversa (Agente de IA)</span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--accent-light)] dark:bg-white/5 p-3 rounded-lg border border-[var(--accent)]/10">
                  {lead.resumo_conversa}
                </p>
              </div>
            )}

            {/* Datas do Follow Up */}
            <div className="pt-4 border-t border-[var(--border-card)] grid grid-cols-3 gap-4">
              <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-card)]/30">
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Follow Up 1</span>
                <span className="text-[10px] font-bold text-[var(--text-main)] mt-0.5">{formatDateTime(lead.follow_up_1)}</span>
              </div>
              <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-card)]/30">
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Follow Up 2</span>
                <span className="text-[10px] font-bold text-[var(--text-main)] mt-0.5">{formatDateTime(lead.follow_up_2)}</span>
              </div>
              <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-card)]/30">
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Follow Up 3</span>
                <span className="text-[10px] font-bold text-[var(--text-main)] mt-0.5">{formatDateTime(lead.follow_up_3)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Lado Direito - Anotações Editáveis */}
        <div className="h-full">
          <Card className="flex flex-col h-full space-y-4">
            <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2 pb-3 border-b border-[var(--border-card)]">
              <ClipboardList size={16} className="text-[var(--accent)]" />
              Anotações Internas
            </h3>

            <textarea
              value={anotacoes}
              onChange={e => setAnotacoes(e.target.value)}
              placeholder="Digite aqui anotações internas sobre este lead..."
              className="flex-1 w-full p-3 text-xs bg-[var(--bg-base)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]/50 min-h-[220px]"
            />

            <Button onClick={handleSaveNotes} disabled={savingNotes} variant="primary" className="w-full">
              <Save size={14} className="mr-1.5" />
              {savingNotes ? 'Salvando...' : 'Salvar Anotações'}
            </Button>
          </Card>
        </div>
      </div>

      {/* Seção Inferior - Atendimentos Vinculados */}
      <Card className="mt-4 space-y-4">
        <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2 pb-3 border-b border-[var(--border-card)]">
          <MessageSquare size={16} className="text-[var(--accent)]" />
          Histórico de Atendimentos
        </h3>

        {atendimentos.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-4">Nenhum atendimento registrado para este lead.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5">Iniciado em</th>
                  <th className="py-2.5">Assunto</th>
                  <th className="py-2.5">Descrição</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)] text-xs text-[var(--text-main)]">
                {atendimentos.map(atend => (
                  <tr
                    key={atend.id}
                    onClick={() => navigate(`/atendimentos/${atend.id}`)}
                    className="hover:bg-[var(--accent-light)]/40 dark:hover:bg-white/5 cursor-pointer transition-colors duration-150"
                  >
                    <td className="py-3 font-semibold">{formatDateTime(atend.iniciado_em)}</td>
                    <td className="py-3 font-bold">{atend.assunto || 'Sem assunto'}</td>
                    <td className="py-3 text-[var(--text-muted)] truncate max-w-[300px]">{atend.descricao || '-'}</td>
                    <td className="py-3 text-right">
                      <Badge status={atend.status}>{atend.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Confirmação de Fechamento */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setPendingStatus(null)
        }}
        title="Promover a Cliente?"
        size="sm"
      >
        <div className="flex flex-col gap-4 text-center items-center py-2">
          <div className="p-3 bg-amber-100 text-[var(--accent)] rounded-full mb-1">
            <AlertCircle size={28} />
          </div>
          <p className="text-sm font-semibold text-[var(--text-main)]">
            Deseja promover este lead a cliente?
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm">
            Ao confirmar, este lead será promovido a cliente ativo. Essa ação pode ser revertida no futuro alterando o status comercial de volta.
          </p>
          <div className="flex gap-3 w-full mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConfirmModal(false)
                setPendingStatus(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => pendingStatus && executeStatusUpdate(pendingStatus)}
            >
              Confirmar Promoção
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
