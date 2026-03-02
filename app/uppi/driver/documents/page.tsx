'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { iosToast } from '@/lib/utils/ios-toast'
import { triggerHaptic } from '@/hooks/use-haptic'
import { driverRegisterSchema, validateForm } from '@/lib/validations/schemas'

const VEHICLE_TYPES = [
  { value: 'economy', label: 'Economico' },
  { value: 'electric', label: 'Eletrico' },
  { value: 'premium', label: 'Premium' },
  { value: 'suv', label: 'SUV' },
  { value: 'moto', label: 'Moto' },
]

export default function DriverDocumentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [formData, setFormData] = useState({
    vehicle_type: 'economy',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_color: '',
    license_number: '',
  })

  useEffect(() => { loadDocuments() }, [])

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/v1/driver/documents')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setIsVerified(data.is_verified ?? null)
          setFormData({
            vehicle_type: data.vehicle_type || 'economy',
            vehicle_brand: data.vehicle_brand || '',
            vehicle_model: data.vehicle_model || '',
            vehicle_year: String(data.vehicle_year || ''),
            vehicle_plate: data.vehicle_plate || '',
            vehicle_color: data.vehicle_color || '',
            license_number: data.cnh_number || '',
          })
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateForm(driverRegisterSchema, formData)
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0]
      iosToast.error(firstError || 'Preencha os campos corretamente')
      return
    }
    setSaving(true)
    triggerHaptic('impact')
    try {
      const res = await fetch('/api/v1/driver/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      triggerHaptic('success')
      iosToast.success('Documentos enviados para analise')
      setIsVerified(false)
    } catch {
      triggerHaptic('error')
      iosToast.error('Erro ao salvar documentos')
    } finally { setSaving(false) }
  }

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }))

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-y-auto ios-scroll bg-[color:var(--background)]">
      {/* Header iOS */}
      <header className="sticky top-0 z-30 bg-[color:var(--card)]/90 ios-blur border-b border-[color:var(--border)]/40">
        <div className="flex items-center gap-3 px-5 pt-safe-offset-4 pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--secondary)] ios-press"
            aria-label="Voltar"
          >
            <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Meus Documentos</h1>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto space-y-4 pb-10">

        {/* Status badge */}
        {isVerified !== null && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-[18px] animate-ios-fade-up ${
            isVerified
              ? 'bg-emerald-500/10'
              : 'bg-amber-500/10'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isVerified ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}>
              {isVerified ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-[14px] font-bold ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isVerified ? 'Conta Verificada' : 'Aguardando Verificacao'}
              </p>
              <p className="text-[12px] text-[color:var(--muted-foreground)]">
                {isVerified ? 'Seus documentos foram aprovados' : 'Analise em ate 24h uteis'}
              </p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-[color:var(--card)] rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden animate-ios-fade-up" style={{ animationDelay: '80ms' }}>
          {/* Veiculo section */}
          <div className="px-5 pt-5 pb-1">
            <p className="text-[11px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-widest mb-4">Informacoes do Veiculo</p>
          </div>

          {/* Tipo */}
          <div className="px-5 py-3 border-b border-[color:var(--border)]/50">
            <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Tipo de Veiculo</label>
            <select
              value={formData.vehicle_type}
              onChange={set('vehicle_type')}
              required
              className="w-full bg-transparent text-[16px] font-medium text-[color:var(--foreground)] outline-none appearance-none"
            >
              {VEHICLE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Marca / Modelo */}
          <div className="grid grid-cols-2 border-b border-[color:var(--border)]/50">
            <div className="px-5 py-3 border-r border-[color:var(--border)]/50">
              <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Marca</label>
              <input
                type="text"
                value={formData.vehicle_brand}
                onChange={set('vehicle_brand')}
                placeholder="Ex: Fiat"
                required
                className="w-full bg-transparent text-[16px] font-medium text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)]/40 outline-none"
              />
            </div>
            <div className="px-5 py-3">
              <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Modelo</label>
              <input
                type="text"
                value={formData.vehicle_model}
                onChange={set('vehicle_model')}
                placeholder="Ex: Uno"
                required
                className="w-full bg-transparent text-[16px] font-medium text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)]/40 outline-none"
              />
            </div>
          </div>

          {/* Ano / Cor */}
          <div className="grid grid-cols-2 border-b border-[color:var(--border)]/50">
            <div className="px-5 py-3 border-r border-[color:var(--border)]/50">
              <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Ano</label>
              <input
                type="number"
                value={formData.vehicle_year}
                onChange={set('vehicle_year')}
                placeholder="2020"
                min={2000}
                max={new Date().getFullYear() + 1}
                required
                className="w-full bg-transparent text-[16px] font-medium text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)]/40 outline-none"
              />
            </div>
            <div className="px-5 py-3">
              <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Cor</label>
              <input
                type="text"
                value={formData.vehicle_color}
                onChange={set('vehicle_color')}
                placeholder="Ex: Branco"
                required
                className="w-full bg-transparent text-[16px] font-medium text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)]/40 outline-none"
              />
            </div>
          </div>

          {/* Placa */}
          <div className="px-5 py-3 border-b border-[color:var(--border)]/50">
            <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Placa</label>
            <input
              type="text"
              value={formData.vehicle_plate}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate: e.target.value.toUpperCase() }))}
              placeholder="ABC1234"
              maxLength={8}
              required
              className="w-full bg-transparent text-[16px] font-medium font-mono uppercase text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)]/40 outline-none tracking-widest"
            />
          </div>

          {/* CNH section */}
          <div className="px-5 pt-5 pb-1">
            <p className="text-[11px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-widest mb-4">Habilitacao (CNH)</p>
          </div>
          <div className="px-5 py-3">
            <label className="block text-[12px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Numero da CNH</label>
            <input
              type="text"
              value={formData.license_number}
              onChange={set('license_number')}
              placeholder="00000000000"
              required
              className="w-full bg-transparent text-[16px] font-medium font-mono text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)]/40 outline-none"
            />
          </div>

          {/* Botao */}
          <div className="px-5 pb-5 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full h-[52px] bg-emerald-500 text-white text-[17px] font-bold rounded-[18px] ios-press shadow-md shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Enviar Documentos'
              }
            </button>
          </div>
        </form>

        {/* Info legalista */}
        <p className="text-[12px] text-[color:var(--muted-foreground)] text-center px-4 animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          Seus documentos sao usados exclusivamente para verificacao de identidade e conformidade legal.
        </p>
      </main>
    </div>
  )
}
