export type LeadStatus =
  | 'novo_contato'
  | 'em_atendimento'
  | 'qualificado'
  | 'aguardando_retorno'
  | 'proposta_enviada'
  | 'fechado'
  | 'perdido'

export type AtendimentoStatus =
  | 'aberto'
  | 'em_andamento'
  | 'aguardando_cliente'
  | 'resolvido'
  | 'encerrado'

export type DiaSemana =
  | 'domingo'
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado'

export interface LeadSST {
  id: string
  nome_lead: string | null
  whatsapp_lead: string
  empresa: string | null
  cargo: string | null
  cnpj: string | null
  cidade: string | null
  motivo_contato: string | null
  servico_interesse: string | null
  resumo_conversa: string | null
  status: LeadStatus
  inicio_atendimento: string | null
  ultima_mensagem: string | null
  minutos_ultima_mensagem: number | null
  minutos_sem_resposta?: number | null
  follow_up_1: string | null
  follow_up_2: string | null
  follow_up_3: string | null
  anotacoes: string | null
  created_at: string
}

export interface ClienteSST {
  id: string
  lead_id: string
  data_conversao: string
  created_at: string
  lead?: LeadSST
}

export interface Atendente {
  id: string
  nome: string
  cor: string
  ativo: boolean
  created_at: string
}

export interface AtendimentoSST {
  id: string
  lead_id: string | null
  cliente_id: string | null
  atendente_id: string | null
  assunto: string | null
  descricao: string | null
  status: AtendimentoStatus
  origem: string | null
  observacoes: string | null
  iniciado_em: string
  finalizado_em: string | null
  lead?: LeadSST
  cliente?: ClienteSST
  atendente?: Atendente
}

export interface OfficeConfig {
  id: number
  nome: string
  logo_url: string | null
  favicon_url: string | null
  updated_at: string
}

export interface OfficeHours {
  id: string
  dia: DiaSemana
  aberto: boolean
  hora_inicio: string | null
  hora_fim: string | null
}

export type FilterPreset =
  | 'hoje'
  | 'ontem'
  | 'ultimos_7_dias'
  | 'ultimos_14_dias'
  | 'este_mes'
  | 'mes_passado'
  | 'este_ano'
  | 'personalizado'

export interface DateFilter {
  preset: FilterPreset
  startDate: string
  endDate: string
}
