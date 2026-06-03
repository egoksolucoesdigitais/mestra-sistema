import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { LeadSST, LeadStatus } from '../types'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { DndContext, useDroppable, useDraggable, DragEndEvent, DragOverlay } from '@dnd-kit/core'
import { format } from 'date-fns'
import { AlertCircle, Eye, RefreshCw, Briefcase, MapPin, Calendar, HelpCircle } from 'lucide-react'
import clsx from 'clsx'

// ─── COMPONENTE DRAGGABLE (CARD) ──────────────────────────────────────────────
interface KanbanCardProps {
  lead: LeadSST
  isOverlay?: boolean
}

function KanbanCard({ lead, isOverlay }: KanbanCardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: !!isOverlay,
  })

  // Estilo de transformação do Dnd-kit (apenas se não for overlay)
  const style = !isOverlay && transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className={clsx(
        'group bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[var(--accent)]/40 transition-all duration-200 flex flex-col gap-2.5 relative touch-none',
        isOverlay ? 'cursor-grabbing scale-[1.02] shadow-xl border-[var(--accent)]' : 'cursor-grab active:cursor-grabbing',
        !isOverlay && isDragging && 'opacity-20 border-dashed border-[var(--border-card)]'
      )}
    >
      {/* Botão de Visualização Rápida no Canto */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/leads/${lead.id}`)
        }}
        className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-light)] dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
        title="Ver Perfil Detalhado"
      >
        <Eye size={14} />
      </button>

      {/* Nome / WhatsApp */}
      <div className="pr-5">
        <h4 className="text-xs font-bold text-[var(--text-main)] leading-snug tracking-tight">
          {lead.nome_lead || <span className="italic text-[var(--text-muted)] font-normal">{lead.whatsapp_lead}</span>}
        </h4>
        {lead.nome_lead && (
          <span className="text-[9px] text-[var(--text-muted)] font-semibold">{lead.whatsapp_lead}</span>
        )}
      </div>

      {/* Empresa & Cidade */}
      {(lead.empresa || lead.cidade) && (
        <div className="flex flex-col gap-1 text-[10px] border-t border-[var(--border-card)]/50 pt-2 text-[var(--text-muted)]">
          {lead.empresa && (
            <span className="flex items-center gap-1 font-semibold truncate">
              <Briefcase size={10} className="text-[var(--accent)]" /> {lead.empresa}
            </span>
          )}
          {lead.cidade && (
            <span className="flex items-center gap-1 font-semibold truncate">
              <MapPin size={10} className="text-[var(--accent)]" /> {lead.cidade}
            </span>
          )}
        </div>
      )}

      {/* Serviço de Interesse / Motivo */}
      {(lead.servico_interesse || lead.motivo_contato) && (
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic bg-[var(--bg-base)]/50 dark:bg-white/5 p-2 rounded-lg border border-[var(--border-card)]/30 line-clamp-2">
          {lead.servico_interesse || lead.motivo_contato}
        </p>
      )}

      {/* Footer Card */}
      <div className="flex items-center justify-between border-t border-[var(--border-card)]/50 pt-2 mt-1">
        <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
          <Calendar size={9} />
          {formatDateTime(lead.inicio_atendimento).split(' ')[0]}
        </span>
        <Badge status={lead.status} className="scale-90 origin-right">
          {lead.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  )
}

// ─── COMPONENTE DROPPABLE (COLUNA) ───────────────────────────────────────────
interface KanbanColumnProps {
  status: LeadStatus
  title: string
  description: string
  leads: LeadSST[]
}

function KanbanColumn({ status, title, description, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  // Estilos de status para a borda superior
  const borderColors: Record<string, string> = {
    novo_contato: 'border-t-blue-500',
    em_atendimento: 'border-t-amber-500',
    qualificado: 'border-t-green-500',
    aguardando_retorno: 'border-t-orange-500',
    proposta_enviada: 'border-t-violet-500',
    fechado: 'border-t-emerald-500',
    perdido: 'border-t-red-500',
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col w-[260px] shrink-0 bg-[var(--bg-card)]/70 dark:bg-white/5 border border-[var(--border-card)] border-t-4 rounded-xl shadow-sm transition-all duration-200 overflow-hidden',
        borderColors[status] || 'border-t-[var(--accent)]',
        isOver && 'bg-[var(--accent-light)] dark:bg-white/10 ring-2 ring-[var(--accent)]/50 scale-[1.01]'
      )}
    >
      {/* Header Coluna */}
      <div className="p-4 border-b border-[var(--border-card)] flex flex-col gap-0.5 shrink-0 bg-white/20 dark:bg-black/10">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{title}</h3>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--text-main)] border border-[var(--accent)]/15">
            {leads.length}
          </span>
        </div>
        <p className="text-[9px] text-[var(--text-muted)] font-medium leading-relaxed truncate" title={description}>
          {description}
        </p>
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[400px] max-h-[65vh]">
        {leads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-card)]/80 rounded-xl bg-[var(--bg-base)]/25">
            <span className="text-[10px] font-semibold italic">Nenhum lead nesta etapa</span>
          </div>
        ) : (
          leads.map(lead => <KanbanCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}

// ─── PÁGINA KANBAN ───────────────────────────────────────────────────────────
export default function Kanban() {
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSST[]>([])

  // State para o card ativo no DragOverlay
  const [activeId, setActiveId] = useState<string | null>(null)

  // State para confirmação de Fechado
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ leadId: string; targetStatus: LeadStatus } | null>(null)

  const columns: { status: LeadStatus; title: string; description: string }[] = [
    { status: 'novo_contato', title: 'Novo Contato', description: 'Lead acabou de entrar em contato' },
    { status: 'em_atendimento', title: 'Em Atendimento', description: 'Em conversa, coletando informações' },
    { status: 'qualificado', title: 'Qualificado', description: 'Lead com potencial identificado' },
    { status: 'aguardando_retorno', title: 'Aguardando Retorno', description: 'Aguardando resposta do lead' },
    { status: 'proposta_enviada', title: 'Proposta Enviada', description: 'Proposta comercial enviada' },
    { status: 'fechado', title: 'Fechado', description: 'Contrato fechado, cliente ativo' },
    { status: 'perdido', title: 'Perdido', description: 'Desistiu, não respondeu ou perdeu' },
  ]

  async function loadLeads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads_sst')
        .select('*')
        .order('inicio_atendimento', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Erro ao carregar leads no Kanban:', err)
      showToast('Erro ao carregar funil de vendas', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()

    // Ouve alterações em tempo real nos leads
    const subscription = supabase
      .channel('kanban_leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_sst' }, () => {
        // Recarrega de forma transparente em tempo real
        loadLeads()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string)
  }

  // Processa o fim do Drag
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const targetStatus = over.id as LeadStatus

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === targetStatus) return

    // Se mover para fechado, abre o modal de confirmação
    if (targetStatus === 'fechado') {
      setPendingMove({ leadId, targetStatus })
      setShowConfirmModal(true)
      return
    }

    // Caso contrário, atualiza imediatamente
    await executeStatusUpdate(leadId, targetStatus)
  }

  const executeStatusUpdate = async (leadId: string, statusToApply: LeadStatus) => {
    try {
      // Otimista: atualiza o estado local imediatamente
      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: statusToApply } : l))
      )

      const { error } = await supabase
        .from('leads_sst')
        .update({ status: statusToApply })
        .eq('id', leadId)

      if (error) throw error
      
      const label = columns.find(c => c.status === statusToApply)?.title
      showToast(`Lead movido para "${label}" com sucesso!`)
      
      if (statusToApply === 'fechado') {
        showToast('Lead promovido a Cliente automaticamente!', 'info')
      }
    } catch (err) {
      console.error(err)
      showToast('Erro ao mover lead pelo funil', 'error')
      loadLeads() // reverte em caso de erro
    } finally {
      setShowConfirmModal(false)
      setPendingMove(null)
    }
  }

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-48 bg-[var(--border-card)] rounded-lg" />
        <div className="h-6 w-96 bg-[var(--border-card)] rounded" />
        <div className="flex gap-4 overflow-x-auto pb-4 mt-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-[260px] h-[500px] bg-[var(--border-card)] rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <PageHeader
        title="Kanban"
        description="Visualize e gerencie o avanço de cada lead pelo funil de atendimento da Mestra. Arraste os cards entre as etapas e o sistema atualiza o status de forma instantânea."
      />

      {/* Grid de Colunas Kanban */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6 scrollbar-thin">
          {columns.map(col => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              title={col.title}
              description={col.description}
              leads={leads.filter(l => l.status === col.status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <KanbanCard lead={leads.find(l => l.id === activeId)!} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Confirmação de Conversão */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setPendingMove(null)
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
            Ao confirmar, este lead será promovido a cliente ativo e integrado automaticamente à carteira comercial. Essa ação pode ser revertida movendo o card de volta para outra coluna.
          </p>
          <div className="flex gap-3 w-full mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConfirmModal(false)
                setPendingMove(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => pendingMove && executeStatusUpdate(pendingMove.leadId, pendingMove.targetStatus)}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
