import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ClienteSST, AtendimentoSST } from '../types'
import { useToast } from '../contexts/ToastContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { format } from 'date-fns'
import { ChevronLeft, Save, MessageSquare, Calendar, Phone, Building, MapPin, ClipboardList, Info, Clock, Users } from 'lucide-react'

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<ClienteSST | null>(null)
  const [atendimentos, setAtendimentos] = useState<AtendimentoSST[]>([])
  
  // States para ações
  const [savingNotes, setSavingNotes] = useState(false)
  const [anotacoes, setAnotacoes] = useState('')

  useEffect(() => {
    async function loadClienteData() {
      if (!id) return
      try {
        setLoading(true)
        
        // 1. Busca dados do cliente (join com leads_sst)
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes_sst')
          .select(`
            id,
            lead_id,
            data_conversao,
            created_at,
            lead:leads_sst(*)
          `)
          .eq('id', id)
          .single()

        if (clienteError) throw clienteError
        setCliente(clienteData as unknown as ClienteSST)
        
        if (clienteData && clienteData.lead) {
          setAnotacoes((clienteData.lead as any).anotacoes || '')
          
          // 2. Busca atendimentos vinculados ao cliente
          const { data: atendimentosData, error: atendimentosError } = await supabase
            .from('atendimentos_sst')
            .select('*')
            .eq('cliente_id', id)
            .order('iniciado_em', { ascending: false })

          if (atendimentosError) throw atendimentosError
          setAtendimentos(atendimentosData || [])
        }

      } catch (err) {
        console.error('Erro ao carregar dados do cliente:', err)
        showToast('Erro ao carregar perfil do cliente', 'error')
        navigate('/clientes')
      } finally {
        setLoading(false)
      }
    }

    loadClienteData()
  }, [id])

  // Salvar anotações na tabela leads_sst (já que a anotação fisicamente reside no lead)
  const handleSaveNotes = async () => {
    if (!id || !cliente || !cliente.lead_id) return
    try {
      setSavingNotes(true)
      const { error } = await supabase
        .from('leads_sst')
        .update({ anotacoes })
        .eq('id', cliente.lead_id)
      
      if (error) throw error
      setCliente(prev => prev ? {
        ...prev,
        lead: prev.lead ? { ...prev.lead, anotacoes } : undefined
      } : null)
      showToast('Anotações salvas com sucesso!')
    } catch (err) {
      console.error(err)
      showToast('Erro ao salvar anotações', 'error')
    } finally {
      setSavingNotes(false)
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return format(date, 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  if (loading || !cliente || !cliente.lead) {
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

  const lead = cliente.lead

  return (
    <div className="flex flex-col gap-6">
      {/* Topo / Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clientes')}
            className="p-2 rounded-lg hover:bg-[var(--accent-light)] dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:outline-none"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Perfil do Cliente</span>
            <h2 className="text-xl font-bold font-display text-[var(--text-main)] mt-0.5">
              {lead.nome_lead || lead.whatsapp_lead}
            </h2>
          </div>
        </div>

        {/* Data de Conversão Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7] dark:bg-[#064e3b]/30 dark:text-[#a7f3d0] dark:border-[#10b981]/30">
          <Calendar size={14} />
          <span className="text-xs font-bold">
            Convertido em: {formatDate(cliente.data_conversao)}
          </span>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo - Informações Cadastrais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-6">
            <h3 className="text-sm font-bold font-display text-[var(--text-main)] flex items-center gap-2 pb-3 border-b border-[var(--border-card)]">
              <ClipboardList size={16} className="text-[var(--accent)]" />
              Ficha do Cliente
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
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cidade</span>
                  <span className="text-xs font-semibold text-[var(--text-main)]">{lead.cidade || '-'}</span>
                </div>
              </div>

              {/* Serviço de Interesse */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-light)] dark:bg-white/5 text-[var(--accent)]">
                  <Building size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Serviço Adquirido</span>
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
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Motivo do Contato Inicial</span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-card)]/50">
                  {lead.motivo_contato}
                </p>
              </div>
            )}

            {/* Resumo da Conversa do IA */}
            {lead.resumo_conversa && (
              <div className="pt-4 border-t border-[var(--border-card)]">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Histórico de Negociação (Agente de IA)</span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--accent-light)] dark:bg-white/5 p-3 rounded-lg border border-[var(--accent)]/10">
                  {lead.resumo_conversa}
                </p>
              </div>
            )}
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
              placeholder="Digite aqui anotações internas sobre este cliente..."
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
          Histórico de Demandas / Atendimentos
        </h3>

        {atendimentos.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-4">Nenhum atendimento registrado para este cliente.</p>
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
    </div>
  )
}
