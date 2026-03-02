/**
 * logger.ts — substitui o Sentry com logs próprios no Supabase.
 * Chame `logError(error)` em qualquer lugar do app.
 */

export type LogLevel = 'error' | 'warning' | 'info'

export interface LogPayload {
  level?: LogLevel
  message: string
  stack?: string
  context?: string   // rota ou tela onde ocorreu
  user_id?: string
  metadata?: Record<string, unknown>
}

export async function logError(
  error: unknown,
  extra?: Omit<LogPayload, 'message' | 'stack'>
): Promise<void> {
  try {
    const isError = error instanceof Error
    const payload: LogPayload = {
      level: extra?.level ?? 'error',
      message: isError ? error.message : String(error),
      stack: isError ? error.stack : undefined,
      context: extra?.context,
      user_id: extra?.user_id,
      metadata: {
        ...(extra?.metadata ?? {}),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    }

    // No servidor, loga no console também
    if (typeof window === 'undefined') {
      console.error('[logger]', payload.message, payload.stack ?? '')
    }

    await fetch('/api/v1/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Nunca deixar o logger derrubar o app
    console.error('[logger] falha ao enviar log')
  }
}
