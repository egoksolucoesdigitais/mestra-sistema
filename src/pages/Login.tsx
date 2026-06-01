import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { ShieldCheck, Lock, Mail, AlertCircle, RefreshCw } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        // Tratar mensagens amigáveis em português
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos. Por favor, verifique as credenciais.')
        }
        throw error
      }

      showToast('Login realizado com sucesso! Bem-vindo.', 'success')
    } catch (err: any) {
      console.error('Erro de autenticação:', err)
      setErrorMsg(err.message || 'Ocorreu um erro ao realizar o login.')
      showToast(err.message || 'Erro ao realizar login', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fillTestCredentials = () => {
    setEmail('marlonhacks2013@gmail.com')
    setPassword('teste2026')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0D1520] relative overflow-hidden px-4">
      {/* Elementos visuais premium de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Card de Login */}
      <div className="w-full max-w-md bg-[#162235]/65 backdrop-blur-md border border-[var(--border-card)]/10 rounded-2xl p-8 shadow-2xl z-10 flex flex-col gap-6 animate-slide-in">
        
        {/* Logo Mestra */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3.5 rounded-2xl bg-[var(--accent)] text-[#0D1520] shadow-lg shadow-amber-500/10">
            <ShieldCheck size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[var(--accent)] tracking-tight">Mestra SST</h1>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
              Segurança e Saúde Ocupacional
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={12} className="text-[var(--accent)]" /> E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@mestra.com.br"
              className="w-full px-3.5 py-2.5 text-xs bg-[#0D1520]/80 border border-[var(--border-card)]/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={12} className="text-[var(--accent)]" /> Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full px-3.5 py-2.5 text-xs bg-[#0D1520]/80 border border-[var(--border-card)]/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* Erro */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-red-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400 animate-pulse" />
              <p className="text-[10px] leading-relaxed font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Botão Entrar */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--accent)] hover:bg-[#D4B86A] text-[#0d1520] font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Validando Acesso...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </Button>
        </form>

        {/* Sugestão de Credenciais Corporativas */}
        <div className="border-t border-slate-800 pt-4 flex flex-col items-center gap-2.5">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
            Acesso Rápido de Testes
          </span>
          <button
            onClick={fillTestCredentials}
            type="button"
            className="text-[10px] font-bold text-[var(--accent)] hover:underline hover:opacity-90 active:scale-95 transition-all"
          >
            Preencher Credenciais Corporativas
          </button>
        </div>

      </div>
    </div>
  )
}
