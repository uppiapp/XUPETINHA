import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface RideReportData {
  rideId: string
  passengerName: string
  passengerEmail: string
  driverName: string
  driverPhone?: string
  vehicleBrand: string
  vehicleModel: string
  vehiclePlate: string
  vehicleColor: string
  pickupAddress: string
  dropoffAddress: string
  distanceKm: number
  durationMinutes: number
  finalPrice: number
  paymentMethod: string
  startedAt: string
  completedAt: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    pix: 'Pix',
    credit_card: 'Cartao de Credito',
    debit_card: 'Cartao de Debito',
    cash: 'Dinheiro',
    wallet: 'Carteira Uppi',
  }
  return map[method] || method
}

export async function sendRideReportEmail(data: RideReportData): Promise<boolean> {
  try {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatorio de Corrida - Uppi</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;border-radius:16px 16px 0 0;padding:32px;text-align:center;border-bottom:1px solid #334155;">
              <div style="display:inline-block;background:#f97316;border-radius:12px;padding:12px 20px;margin-bottom:16px;">
                <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">UPPI</span>
              </div>
              <h1 style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 4px 0;">Corrida Concluida</h1>
              <p style="color:#94a3b8;font-size:14px;margin:0;">Relatorio completo da sua viagem</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="background:#1e293b;padding:24px 32px 0;">
              <p style="color:#e2e8f0;font-size:15px;margin:0 0 4px 0;">Ola, <strong style="color:#f97316;">${data.passengerName.split(' ')[0]}</strong>!</p>
              <p style="color:#94a3b8;font-size:14px;margin:0;">Sua corrida foi concluida com sucesso. Abaixo esta o relatorio completo.</p>
            </td>
          </tr>

          <!-- Route Card -->
          <tr>
            <td style="background:#1e293b;padding:24px 32px;">
              <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;">
                <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px 0;">Percurso</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:24px;vertical-align:top;padding-top:2px;">
                      <div style="width:10px;height:10px;border-radius:50%;background:#22c55e;"></div>
                    </td>
                    <td style="padding-bottom:12px;">
                      <p style="color:#64748b;font-size:11px;margin:0 0 2px 0;">ORIGEM</p>
                      <p style="color:#f1f5f9;font-size:14px;font-weight:600;margin:0;">${data.pickupAddress}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="width:24px;vertical-align:top;padding-top:2px;">
                      <div style="width:10px;height:10px;border-radius:50%;background:#ef4444;"></div>
                    </td>
                    <td>
                      <p style="color:#64748b;font-size:11px;margin:0 0 2px 0;">DESTINO</p>
                      <p style="color:#f1f5f9;font-size:14px;font-weight:600;margin:0;">${data.dropoffAddress}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Stats Row -->
          <tr>
            <td style="background:#1e293b;padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:33%;padding-right:8px;">
                    <div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <p style="color:#f97316;font-size:20px;font-weight:800;margin:0 0 2px 0;">${data.distanceKm.toFixed(1)} km</p>
                      <p style="color:#64748b;font-size:11px;margin:0;">Distancia</p>
                    </div>
                  </td>
                  <td style="width:33%;padding:0 4px;">
                    <div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <p style="color:#f97316;font-size:20px;font-weight:800;margin:0 0 2px 0;">${formatDuration(data.durationMinutes)}</p>
                      <p style="color:#64748b;font-size:11px;margin:0;">Duracao</p>
                    </div>
                  </td>
                  <td style="width:33%;padding-left:8px;">
                    <div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">
                      <p style="color:#22c55e;font-size:20px;font-weight:800;margin:0 0 2px 0;">${formatCurrency(data.finalPrice)}</p>
                      <p style="color:#64748b;font-size:11px;margin:0;">Total pago</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Driver Info -->
          <tr>
            <td style="background:#1e293b;padding:0 32px 24px;">
              <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;">
                <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px 0;">Motorista</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:10px;">
                      <p style="color:#64748b;font-size:12px;margin:0 0 2px 0;">Nome completo</p>
                      <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0;">${data.driverName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:50%;padding-right:8px;">
                            <p style="color:#64748b;font-size:12px;margin:0 0 2px 0;">Veiculo</p>
                            <p style="color:#f1f5f9;font-size:14px;font-weight:600;margin:0;">${data.vehicleBrand} ${data.vehicleModel}</p>
                            <p style="color:#94a3b8;font-size:12px;margin:2px 0 0 0;">${data.vehicleColor}</p>
                          </td>
                          <td style="width:50%;padding-left:8px;">
                            <p style="color:#64748b;font-size:12px;margin:0 0 4px 0;">Placa</p>
                            <div style="display:inline-block;background:#1e293b;border:2px solid #475569;border-radius:6px;padding:6px 14px;">
                              <span style="color:#f1f5f9;font-size:16px;font-weight:800;letter-spacing:3px;">${data.vehiclePlate}</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Payment Info -->
          <tr>
            <td style="background:#1e293b;padding:0 32px 24px;">
              <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;">
                <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px 0;">Pagamento</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:8px;"><p style="color:#94a3b8;font-size:13px;margin:0;">Metodo</p></td>
                    <td style="text-align:right;padding-bottom:8px;"><p style="color:#f1f5f9;font-size:13px;font-weight:600;margin:0;">${paymentMethodLabel(data.paymentMethod)}</p></td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:8px;"><p style="color:#94a3b8;font-size:13px;margin:0;">Inicio</p></td>
                    <td style="text-align:right;padding-bottom:8px;"><p style="color:#f1f5f9;font-size:13px;margin:0;">${formatDate(data.startedAt)}</p></td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;"><p style="color:#94a3b8;font-size:13px;margin:0;">Termino</p></td>
                    <td style="text-align:right;padding-bottom:12px;"><p style="color:#f1f5f9;font-size:13px;margin:0;">${formatDate(data.completedAt)}</p></td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #334155;padding-top:12px;"><p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0;">Total</p></td>
                    <td style="border-top:1px solid #334155;padding-top:12px;text-align:right;"><p style="color:#22c55e;font-size:18px;font-weight:800;margin:0;">${formatCurrency(data.finalPrice)}</p></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Ride ID -->
          <tr>
            <td style="background:#1e293b;padding:0 32px 24px;">
              <p style="color:#475569;font-size:11px;text-align:center;margin:0;">ID da corrida: <span style="color:#64748b;font-family:monospace;">${data.rideId}</span></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#475569;font-size:12px;margin:0 0 4px 0;">Uppi - Tecnologia em mobilidade urbana</p>
              <p style="color:#334155;font-size:11px;margin:0;">Este e-mail foi enviado automaticamente. Nao responda a esta mensagem.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    const { error } = await resend.emails.send({
      from: 'Uppi <noreply@uppi.app>',
      to: data.passengerEmail,
      subject: `Relatorio da sua corrida - ${formatCurrency(data.finalPrice)} | Uppi`,
      html,
    })

    if (error) {
      console.error('[v0] Resend error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[v0] sendRideReportEmail error:', err)
    return false
  }
}
