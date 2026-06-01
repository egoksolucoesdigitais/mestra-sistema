import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { OfficeConfig, OfficeHours, Atendente } from '../types'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Building, Clock, Users, Plus, Edit2, Check, X, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

export default function Configuracoes() {
  const { showToast } = useToast()
  
  // States
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [activeTab, setActiveTab] = useState<'empresa' | 'horarios' | 'atendentes'>('empresa')

  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null)
  const [officeHours, setOfficeHours] = useState<OfficeHours[]>([])
  const [atendentes, setAtendentes] = useState<Atendente[]>([])

  // State para atendente em edição ou criação
  const [editingAtendenteId, setEditingAtendenteId] = useState<string | null>(null)
  const [atendenteForm, setAtendenteForm] = useState({ nome: '', cor: '#1B3A5C', ativo: true })
  const [showAddForm, setShowAddForm] = useState(false)

  // Cores sugeridas para atendente
  const colorPalette = [
    '#1B3A5C', // Azul Mestra
    '#C9A84C', // Dourado
    '#4A7C59', // Verde
    '#D4834A', // Laranja
    '#B94040', // Vermelho
    '#7C3AED', // Roxo
    '#EC4899', // Rosa
    '#06B6D4', // Ciano
  ]

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // 1. Carrega configurações do escritório
        const { data: configData } = await supabase
          .from('office_config')
          .select('*')
          .eq('id', 1)
          .single()
        if (configData) setOfficeConfig(configData)

        // 2. Carrega horários
        const { data: hoursData } = await supabase
          .from('office_hours')
          .select('*')
          .order('dia') // Pode precisar de ordenação customizada
        if (hoursData) {
          // Ordena de Domingo a Sábado
          const daysOrder = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
          const sortedHours = [...hoursData].sort((a, b) => daysOrder.indexOf(a.dia) - daysOrder.indexOf(b.dia))
          setOfficeHours(sortedHours)
        }

        // 3. Carrega atendentes
        const { data: atendentesData } = await supabase
          .from('atendentes')
          .select('*')
          .order('created_at', { ascending: true })
        if (atendentesData) setAtendentes(atendentesData)

      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
        showToast('Erro ao carregar configurações do sistema', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Salvar Informações da Empresa (Base64 conversion for logo/favicon)
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!officeConfig) return

    try {
      setSavingConfig(true)
      const { error } = await supabase
        .from('office_config')
        .update({
          nome: officeConfig.nome,
          logo_url: officeConfig.logo_url,
          favicon_url: officeConfig.favicon_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)

      if (error) throw error
      showToast('Informações da empresa salvas com sucesso!')
    } catch (err) {
      console.error(err)
      showToast('Erro ao salvar informações da empresa', 'error')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url') => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamanho (limitar a 2MB para não estourar o limite de payload do postgres)
      if (file.size > 2 * 1024 * 1024) {
        showToast('Escolha uma imagem menor que 2MB', 'error')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setOfficeConfig(prev => prev ? { ...prev, [field]: reader.result as string } : null)
      }
      reader.readAsDataURL(file)
    }
  }

  // Salvar Horários de Funcionamento
  const handleHoursSave = async () => {
    try {
      setSavingHours(true)
      
      // Executa updates em lote (promessas paralelas)
      const promises = officeHours.map(hour => {
        // Validação básica se aberto
        const start = hour.aberto ? hour.hora_inicio : null
        const end = hour.aberto ? hour.hora_fim : null
        return supabase
          .from('office_hours')
          .update({
            aberto: hour.aberto,
            hora_inicio: start,
            hora_fim: end
          })
          .eq('id', hour.id)
      })

      const results = await Promise.all(promises)
      const failed = results.find(r => r.error)
      if (failed) throw failed.error

      showToast('Horários de funcionamento salvos com sucesso!')
    } catch (err) {
      console.error(err)
      showToast('Erro ao salvar horários de funcionamento', 'error')
    } finally {
      setSavingHours(false)
    }
  }

  const handleHourChange = (id: string, field: keyof OfficeHours, val: any) => {
    setOfficeHours(prev =>
      prev.map(h => {
        if (h.id === id) {
          const updated = { ...h, [field]: val }
          // Se desativou o dia, limpa os campos de hora para consistência
          if (field === 'aberto' && !val) {
            updated.hora_inicio = ''
            updated.hora_fim = ''
          }
          return updated
        }
        return h
      })
    )
  }

  // Ações de Atendentes
  const handleAddAtendenteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!atendenteForm.nome.trim()) return

    try {
      const { data, error } = await supabase
        .from('atendentes')
        .insert([{
          nome: atendenteForm.nome,
          cor: atendenteForm.cor,
          ativo: atendenteForm.ativo
        }])
        .select()
        .single()

      if (error) throw error
      if (data) {
        setAtendentes(prev => [...prev, data])
        showToast('Atendente cadastrado com sucesso!')
        setAtendenteForm({ nome: '', cor: '#1B3A5C', ativo: true })
        setShowAddForm(false)
      }
    } catch (err) {
      console.error(err)
      showToast('Erro ao criar atendente', 'error')
    }
  }

  const handleEditAtendenteClick = (atendente: Atendente) => {
    setEditingAtendenteId(atendente.id)
    setAtendenteForm({
      nome: atendente.nome,
      cor: atendente.cor,
      ativo: atendente.ativo
    })
  }

  const handleEditAtendenteSubmit = async (id: string) => {
    if (!atendenteForm.nome.trim()) return

    try {
      const { data, error } = await supabase
        .from('atendentes')
        .update({
          nome: atendenteForm.nome,
          cor: atendenteForm.cor,
          ativo: atendenteForm.ativo
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setAtendentes(prev => prev.map(a => a.id === id ? data : a))
        showToast('Atendente atualizado com sucesso!')
        setEditingAtendenteId(null)
        setAtendenteForm({ nome: '', cor: '#1B3A5C', ativo: true })
      }
    } catch (err) {
      console.error(err)
      showToast('Erro ao salvar alterações do atendente', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-48 bg-[var(--border-card)] rounded-lg" />
        <div className="h-6 w-96 bg-[var(--border-card)] rounded" />
        <div className="flex gap-4 border-b border-[var(--border-card)] pb-2 mt-4">
          <div className="h-8 w-24 bg-[var(--border-card)] rounded" />
          <div className="h-8 w-24 bg-[var(--border-card)] rounded" />
          <div className="h-8 w-24 bg-[var(--border-card)] rounded" />
        </div>
        <div className="h-64 bg-[var(--border-card)] rounded-xl mt-6" />
      </div>
    )
  }

  const tabs = [
    { id: 'empresa', label: 'Informações da Empresa', icon: Building },
    { id: 'horarios', label: 'Horário de Funcionamento', icon: Clock },
    { id: 'atendentes', label: 'Atendentes', icon: Users },
  ] as const

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Personalize as informações da Mestra — nome, logo, favicon, horário de funcionamento e atendentes. O horário configurado aqui reflete automaticamente nos relatórios do dashboard."
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-card)] gap-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none',
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {/* SEÇÃO 1: INFORMAÇÕES DA EMPRESA */}
        {activeTab === 'empresa' && officeConfig && (
          <Card className="max-w-2xl">
            <form onSubmit={handleConfigSubmit} className="space-y-6">
              <h3 className="text-base font-bold font-display text-[var(--text-main)] flex items-center gap-2">
                <Building size={18} className="text-[var(--accent)]" />
                Dados Institucionais
              </h3>

              <Input
                label="Nome da Empresa"
                id="office-name"
                value={officeConfig.nome}
                onChange={e => setOfficeConfig({ ...officeConfig, nome: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LOGO */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Logo</span>
                  <div className="flex items-center gap-4 p-4 border border-[var(--border-card)] rounded-lg bg-[var(--bg-base)]">
                    {officeConfig.logo_url ? (
                      <img src={officeConfig.logo_url} alt="Logo" className="h-12 w-auto object-contain bg-white/10 p-1 rounded" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-[var(--border-card)] flex items-center justify-center text-xs text-[var(--text-muted)]">Sem Logo</div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="logo-upload"
                        className="hidden"
                        onChange={e => handleImageUpload(e, 'logo_url')}
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center px-3 py-1.5 rounded bg-[var(--primary)] dark:bg-[var(--accent)] text-white dark:text-[var(--bg-sidebar)] text-xs font-bold cursor-pointer hover:opacity-90 shadow-sm transition-opacity"
                      >
                        Fazer Upload
                      </label>
                    </div>
                  </div>
                </div>

                {/* FAVICON */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Favicon</span>
                  <div className="flex items-center gap-4 p-4 border border-[var(--border-card)] rounded-lg bg-[var(--bg-base)]">
                    {officeConfig.favicon_url ? (
                      <img src={officeConfig.favicon_url} alt="Favicon" className="h-8 w-8 object-contain rounded" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-[var(--border-card)] flex items-center justify-center text-xs text-[var(--text-muted)]">Vazio</div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="favicon-upload"
                        className="hidden"
                        onChange={e => handleImageUpload(e, 'favicon_url')}
                      />
                      <label
                        htmlFor="favicon-upload"
                        className="inline-flex items-center px-3 py-1.5 rounded bg-[var(--primary)] dark:bg-[var(--accent)] text-white dark:text-[var(--bg-sidebar)] text-xs font-bold cursor-pointer hover:opacity-90 shadow-sm transition-opacity"
                      >
                        Fazer Upload
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-card)] flex justify-end">
                <Button type="submit" disabled={savingConfig}>
                  {savingConfig ? (
                    <>
                      <RefreshCw size={14} className="animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* SEÇÃO 2: HORÁRIO DE FUNCIONAMENTO */}
        {activeTab === 'horarios' && (
          <Card className="max-w-3xl">
            <div className="space-y-6">
              <h3 className="text-base font-bold font-display text-[var(--text-main)] flex items-center gap-2">
                <Clock size={18} className="text-[var(--accent)]" />
                Grade de Horários Comercial
              </h3>

              <div className="divide-y divide-[var(--border-card)] border-b border-[var(--border-card)]">
                {officeHours.map(hour => (
                  <div key={hour.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                    {/* Dia & Toggle */}
                    <div className="flex items-center gap-4 sm:w-1/3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hour.aberto}
                          onChange={e => handleHourChange(hour.id, 'aberto', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent)]"></div>
                      </label>
                      <span className="text-sm font-bold text-[var(--text-main)] capitalize">{hour.dia}</span>
                    </div>

                    {/* Inputs de Horários */}
                    <div className="flex items-center gap-3 sm:w-2/3 justify-start sm:justify-end">
                      {hour.aberto ? (
                        <>
                          <input
                            type="time"
                            value={hour.hora_inicio || '08:00'}
                            onChange={e => handleHourChange(hour.id, 'hora_inicio', e.target.value)}
                            className="px-2 py-1.5 text-xs bg-[var(--bg-base)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                          />
                          <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">até</span>
                          <input
                            type="time"
                            value={hour.hora_fim || '18:00'}
                            onChange={e => handleHourChange(hour.id, 'hora_fim', e.target.value)}
                            className="px-2 py-1.5 text-xs bg-[var(--bg-base)] border border-[var(--border-card)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                          />
                        </>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] font-semibold italic">Sem expediente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleHoursSave} disabled={savingHours}>
                  {savingHours ? (
                    <>
                      <RefreshCw size={14} className="animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : 'Salvar Horários'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* SEÇÃO 3: ATENDENTES */}
        {activeTab === 'atendentes' && (
          <div className="space-y-6">
            {/* Header seção e Botão criar */}
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-bold font-display text-[var(--text-main)] flex items-center gap-2">
                <Users size={18} className="text-[var(--accent)]" />
                Operadores / Atendentes
              </h3>
              {!showAddForm && (
                <Button size="sm" onClick={() => {
                  setShowAddForm(true)
                  setEditingAtendenteId(null)
                  setAtendenteForm({ nome: '', cor: '#1B3A5C', ativo: true })
                }}>
                  <Plus size={14} className="mr-1.5" /> Novo Atendente
                </Button>
              )}
            </div>

            {/* Form de Criação */}
            {showAddForm && (
              <Card className="max-w-xl">
                <form onSubmit={handleAddAtendenteSubmit} className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Novo Atendente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome Completo"
                      value={atendenteForm.nome}
                      onChange={e => setAtendenteForm({ ...atendenteForm, nome: e.target.value })}
                      required
                      placeholder="Nome do atendente"
                    />

                    {/* Seletor de Cores */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Cor de Identificação</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {colorPalette.map(color => (
                          <button
                            type="button"
                            key={color}
                            onClick={() => setAtendenteForm({ ...atendenteForm, cor: color })}
                            style={{ backgroundColor: color }}
                            className={clsx(
                              'h-6 w-6 rounded-full border border-black/10 focus:outline-none transition-transform active:scale-90',
                              atendenteForm.cor === color && 'ring-2 ring-[var(--accent)] ring-offset-2 scale-110'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-card)]">
                    <Button variant="outline" size="sm" type="button" onClick={() => setShowAddForm(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" type="submit">
                      Cadastrar
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Listagem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {atendentes.map(atendente => {
                const isEditing = editingAtendenteId === atendente.id

                return (
                  <Card key={atendente.id} className="relative overflow-hidden">
                    {/* Faixa lateral de cor */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2.5"
                      style={{ backgroundColor: atendente.cor }}
                    />

                    {isEditing ? (
                      <div className="pl-4 space-y-4">
                        <Input
                          label="Editar Nome"
                          value={atendenteForm.nome}
                          onChange={e => setAtendenteForm({ ...atendenteForm, nome: e.target.value })}
                          required
                        />

                        {/* Alterar cor */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Alterar Cor</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {colorPalette.map(color => (
                              <button
                                type="button"
                                key={color}
                                onClick={() => setAtendenteForm({ ...atendenteForm, cor: color })}
                                style={{ backgroundColor: color }}
                                className={clsx(
                                  'h-5 w-5 rounded-full focus:outline-none transition-transform',
                                  atendenteForm.cor === color && 'ring-2 ring-[var(--accent)] ring-offset-1 scale-110'
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Status Ativo Toggle */}
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={atendenteForm.ativo}
                              onChange={e => setAtendenteForm({ ...atendenteForm, ativo: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                          </label>
                          <span className="text-xs font-semibold text-[var(--text-main)]">Atendente Ativo</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-card)]">
                          <button
                            onClick={() => setEditingAtendenteId(null)}
                            className="p-1.5 rounded-lg text-xs font-bold hover:bg-[var(--accent-light)] dark:hover:bg-white/5 text-[var(--text-muted)] transition-all"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleEditAtendenteSubmit(atendente.id)}
                            className="p-1.5 rounded-lg text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 shadow-sm transition-all"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-4 flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-[var(--text-main)]">{atendente.nome}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: atendente.cor }}
                            />
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-wide uppercase">
                              {atendente.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleEditAtendenteClick(atendente)}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--accent-light)] dark:hover:bg-white/5 transition-colors focus:outline-none"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
