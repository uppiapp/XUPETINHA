# UPPI - Painel Administrativo

**Ultima Atualizacao:** 02/03/2026
**Versao:** 4.0
**Total de Paginas:** 33
**Rota base:** /admin
**Autenticacao:** profiles.is_admin = true (verificado em layout.tsx via requireAdmin)

---

## 1. Visao Geral

O painel admin e uma aplicacao Next.js completa com **33 paginas**, sidebar com **5 grupos** de navegacao, header com notificacoes em tempo real e tema escuro proprio. Controla 100% do app em tempo real via Supabase Realtime.

### Componentes base
| Arquivo | Descricao |
|---------|-----------|
| `app/admin/layout.tsx` | Layout raiz: protecao de rota + AdminSidebar + AdminHeader |
| `components/admin/admin-sidebar.tsx` | Sidebar com 5 grupos, 28 links, icones Lucide |
| `components/admin/admin-header.tsx` | Header com busca global, notificacoes Realtime, avatar do admin |

### Estrutura da Sidebar (5 grupos)
```
Visao Geral  → Dashboard, Analytics, Monitor ao Vivo, Central de Emergencia
Usuarios     → Passageiros, Motoristas, Ganhos Motoristas, Avaliacoes, Conquistas, Leaderboard, Indicacoes, Assinaturas Club, Locais Favoritos
Corridas     → Corridas, Agendamentos, Corridas em Grupo, Cidade a Cidade, Entregas, Ofertas de Preco
Operacoes    → Financeiro, Pagamentos, Cupons, Mensagens, Notificacoes, Suporte, Feed Social
Sistema      → Webhooks, Logs de Erro, Configuracoes
```

---

## 2. Paginas (33 + login = 34 arquivos)

### GRUPO VISAO GERAL (4)
| Rota | Arquivo | Realtime | Descricao |
|------|---------|----------|-----------|
| `/admin` | `page.tsx` | Sim | Dashboard KPIs + AreaChart + BarChart |
| `/admin/analytics` | `analytics/page.tsx` | Nao | 5 RPCs Supabase: corridas/hora, receita/dia, top drivers, retencao, heatmap |
| `/admin/monitor` | `monitor/page.tsx` | Sim | Mapa Google Maps com motoristas online ao vivo |
| `/admin/emergency` | `emergency/page.tsx` | Sim | Central de alertas SOS: active/acknowledged/resolved, som de alerta, link para Maps |

### GRUPO USUARIOS (9)
| Rota | Arquivo | Realtime | Descricao |
|------|---------|----------|-----------|
| `/admin/users` | `users/page.tsx` | Sim | Passageiros: banir, ativar, busca, filtros |
| `/admin/drivers` | `drivers/page.tsx` | Sim | Motoristas: aprovar/rejeitar documentos |
| `/admin/drivers/earnings` | `drivers/earnings/page.tsx` | Sim | Ganhos consolidados: BarChart semanal, top motorista, tabela ordenavel |
| `/admin/reviews` | `reviews/page.tsx` | Nao | Avaliacoes: distribuicao por estrela, remover abusivas |
| `/admin/achievements` | `achievements/page.tsx` | Nao | Conquistas + Leaderboard combinados: pontos, streak, ranking |
| `/admin/leaderboard` | `leaderboard/page.tsx` | Nao | Ranking global: 4 categorias, podio visual ouro/prata/bronze |
| `/admin/referrals` | `referrals/page.tsx` | Nao | Indicacoes: historico, top indicadores, taxa de conversao |
| `/admin/subscriptions` | `subscriptions/page.tsx` | Sim | Assinaturas Club Uppi: Basic/Premium/VIP, MRR, churn rate |
| `/admin/favoritos` | `favoritos/page.tsx` | Nao | Locais favoritos: top 5 destinos, analytics de uso por tipo |

### GRUPO CORRIDAS (7)
| Rota | Arquivo | Realtime | Descricao |
|------|---------|----------|-----------|
| `/admin/rides` | `rides/page.tsx` | Sim | Corridas: forcar status, cancelar, filtros, link para detalhe |
| `/admin/rides/[id]` | `rides/[id]/page.tsx` | Nao | Detalhe completo: passageiro, motorista, placa, veiculo, percurso, pagamento, avaliacao + botao enviar relatorio |
| `/admin/agendamentos` | `agendamentos/page.tsx` | Sim | Corridas agendadas: confirmar, cancelar, badge de urgencia |
| `/admin/group-rides` | `group-rides/page.tsx` | Sim | Corridas em grupo: codigo convite, membros, divisao de custos |
| `/admin/cidade-a-cidade` | `cidade-a-cidade/page.tsx` | Sim | Viagens intermunicipais: distancia, cidades origem/destino |
| `/admin/entregas` | `entregas/page.tsx` | Sim | Pedidos de entrega: tipo de pacote, remetente, entregador, rastreio |
| `/admin/price-offers` | `price-offers/page.tsx` | Sim | Ofertas ao vivo: passageiro vs motorista, ping animado em pendentes |

### GRUPO OPERACOES (7)
| Rota | Arquivo | Realtime | Descricao |
|------|---------|----------|-----------|
| `/admin/financeiro` | `financeiro/page.tsx` | Nao | Receita, repasses, graficos por periodo |
| `/admin/payments` | `payments/page.tsx` | Sim | Transacoes + carteira: KPIs receita, aprovar/rejeitar saques |
| `/admin/cupons` | `cupons/page.tsx` | Nao | CRUD cupons: criar, editar, ativar/desativar |
| `/admin/messages` | `messages/page.tsx` | Sim | Moderacao de chats por corrida, deletar mensagens |
| `/admin/notifications` | `notifications/page.tsx` | Nao | Push broadcast + individual (bug result?.ok corrigido) |
| `/admin/suporte` | `suporte/page.tsx` | Sim | Tickets: open/in_progress/resolved, notas internas |
| `/admin/social` | `social/page.tsx` | Sim | Feed social: moderar posts, ver engajamento |

### GRUPO SISTEMA (3)
| Rota | Arquivo | Realtime | Descricao |
|------|---------|----------|-----------|
| `/admin/webhooks` | `webhooks/page.tsx` | Nao | Endpoints de integracao, secret, historico de entregas |
| `/admin/logs` | `logs/page.tsx` | Sim | error_logs: filtro por nivel, stack trace expansivel |
| `/admin/settings` | `settings/page.tsx` | Nao | system_settings: 6 parametros, maintenance_mode |

- KPIs: total usuarios/motoristas/corridas, corridas ativas, motoristas online, receita dia/total, corridas hoje, taxa conclusao
- AreaChart: corridas nos ultimos 7 dias (dados reais do banco)
- BarChart: distribuicao por hora do dia
- Feed de ultimas corridas com status colorido
- **Correcao:** `ResponsiveContainer` redundante removido (warning Recharts eliminado)

### 2.2 Usuarios — /admin/users
**Arquivo:** `app/admin/users/page.tsx` | Realtime: Sim

- Lista completa de usuarios com busca por nome/email
- Filtro por tipo (passageiro/motorista) e status (ativo/banido)
- Acoes: banir (com motivo), reativar, ver perfil

### 2.3 Motoristas — /admin/drivers
**Arquivo:** `app/admin/drivers/page.tsx` | Realtime: Sim

- Lista com dados do veiculo e status de verificacao
- Acoes: aprovar documentos, rejeitar (com motivo), ver localizacao atual
- Filtro por status de verificacao e disponibilidade

### 2.4 Corridas — /admin/rides
**Arquivo:** `app/admin/rides/page.tsx` | Realtime: Sim

- Lista de corridas com filtro por status
- Acoes admin: forcar conclusao, cancelamento, atribuir motorista
- Realtime: novas corridas aparecem automaticamente

### 2.5 Financeiro — /admin/financeiro
**Arquivo:** `app/admin/financeiro/page.tsx` | Realtime: Nao

- Receita total / taxa plataforma / repasses motoristas
- Grafico de receita por dia (ultimos 30 dias)
- Filtro por metodo de pagamento e periodo, exportar CSV

### 2.6 Analytics — /admin/analytics
**Arquivo:** `app/admin/analytics/page.tsx` | Realtime: Nao

- 5 RPCs Supabase: corridas/hora, receita/dia, top drivers, retencao, heatmap
- Charts: BarChart, LineChart, AreaChart, PieChart

### 2.7 Monitor — /admin/monitor
**Arquivo:** `app/admin/monitor/page.tsx` | Realtime: Sim

- Mapa Google Maps com motoristas online ao vivo
- **Correcao:** `createMap()` definida dentro do `useEffect` (antes era chamada sem estar definida)
- Centro padrao: Brasilia (-15.7801, -47.9292)

### 2.8 Cupons — /admin/cupons
**Arquivo:** `app/admin/cupons/page.tsx` | Realtime: Nao

- CRUD completo: criar, editar inline, ativar/desativar, deletar
- Badges: ativo/expirado/esgotado — tabela `coupons`

### 2.9 Notificacoes — /admin/notifications
**Arquivo:** `app/admin/notifications/page.tsx` | Realtime: Nao

- Broadcast para todos/passageiros/motoristas + envio individual
- **Correcao:** Bug `result?.ok !== false` corrigido com variaveis locais `ok` e `msg`
- APIs: `/api/v1/push/send` e `/api/v1/push/broadcast`

### 2.10 Logs — /admin/logs
**Arquivo:** `app/admin/logs/page.tsx` | Realtime: Sim

- `error_logs` em tempo real, filtro por nivel (error/warn/info), stack trace expansivel

### 2.11 Configuracoes — /admin/settings
**Arquivo:** `app/admin/settings/page.tsx` | Realtime: Nao

- Salva em `system_settings` — 6 parametros populados via migration (01/03/2026)
- Toggle visual para maintenance_mode

---

### NOVAS PAGINAS (6) — Adicionadas em 01/03/2026

### 2.12 Mensagens — /admin/messages
**Arquivo:** `app/admin/messages/page.tsx` | Realtime: Sim
**Baseada em:** `/uppi/ride/[id]/chat`

- Lista de conversas agrupadas por corrida (passageiro + motorista)
- Visualizacao das mensagens em tempo real com layout de chat
- Acao: deletar mensagem abusiva com feedback visual
- Supabase Realtime no canal `admin-messages-rt` (tabela `messages`)
- Tabelas: `messages`, `rides`, `profiles`

### 2.13 Pagamentos — /admin/payments
**Arquivo:** `app/admin/payments/page.tsx` | Realtime: Sim
**Baseada em:** `/uppi/wallet` + `/uppi/ride/[id]/payment`

- Aba "Corridas": todas as transacoes com status (pending/completed/failed/refunded)
- Aba "Carteira": transacoes de `wallet_transactions` (credito/debito)
- KPIs: receita plataforma, volume total, repasse motoristas, pendentes
- Realtime nos canais `payments` e `wallet_transactions`
- Tabelas: `payments`, `wallet_transactions`, `profiles`

### 2.14 Avaliacoes — /admin/reviews
**Arquivo:** `app/admin/reviews/page.tsx` | Realtime: Nao
**Baseada em:** `/uppi/ride/[id]/review`

- Lista com distribuicao visual por estrela (barra de progresso)
- KPIs: total, media geral, notas baixas (1-2 estrelas), com comentario
- Filtro por quantidade de estrelas (1 a 5)
- Acao: remover avaliacao abusiva
- Tabela: `reviews`

### 2.15 Suporte — /admin/suporte
**Arquivo:** `app/admin/suporte/page.tsx` | Realtime: Sim
**Baseada em:** `/uppi/suporte` + `/uppi/suporte/chat`

- Lista de tickets com prioridade (high/medium/low) e status (open/in_progress/resolved)
- Painel de detalhe: ver mensagem do usuario, dados do perfil
- Acoes: "Atender" (in_progress), "Resolver" (resolved)
- Campo de notas internas do admin (salvo em `admin_notes`)
- Realtime no canal `admin-support-rt` (tabela `support_tickets`)
- Tabelas: `support_tickets`, `profiles`

### 2.16 Ofertas de Preco — /admin/price-offers
**Arquivo:** `app/admin/price-offers/page.tsx` | Realtime: Sim
**Baseada em:** `/uppi/ride/[id]/offers`

- Comparacao visual: oferta do motorista vs oferta do passageiro (+ diferenca colorida)
- KPIs: pendentes, aceitas, oferta media, taxa de aceite
- Indicador de oferta ao vivo (ping animado em pendentes)
- Filtro por status (pending/accepted/rejected/expired)
- Realtime no canal `admin-price-offers-rt` (tabela `price_offers`)
- Tabelas: `price_offers`, `rides`, `profiles`

### 2.17 Indicacoes — /admin/referrals
**Arquivo:** `app/admin/referrals/page.tsx` | Realtime: Nao
**Baseada em:** `/uppi/referral`

- Aba "Historico": todas as indicacoes com status (convertida/pendente) e recompensas
- Aba "Top Indicadores": ranking com podio (ouro/prata/bronze)
- KPIs: total indicacoes, convertidas, taxa de conversao, recompensas pagas
- Tabelas: `referrals`, `profiles`

---

## 3. Bugs Corrigidos

| Pagina | Bug | Correcao |
|--------|-----|----------|
| Dashboard | `ResponsiveContainer` redundante dentro de `ChartContainer` (warning Recharts linhas 227/256) | Removido — `ChartContainer` ja gerencia dimensoes |
| Monitor | `createMap()` chamada sem estar definida — mapa nao renderizava | Definida dentro do `useEffect` antes de `initMap()` |
| Notifications | `result?.ok !== false` sempre true porque `result` era `null` no momento da avaliacao | Substituido por variaveis locais `ok` e `msg` |

---

## 4. Seguranca (RLS)

| Tabela | Policy | Acesso |
|--------|--------|--------|
| system_settings | admins_all_system_settings | is_admin = true |
| error_logs | admins_all_error_logs + auth_insert | Admins CRUD; auth INSERT |
| coupons | admins_all + auth_read_active | Admins CRUD; usuarios SELECT ativos |
| webhook_endpoints | admins_all_webhooks | is_admin = true |
| payments | own_payments + auth_insert | Ver proprios; admin ve todos |
| notifications | own_notifications | Ver proprias; admin ve todas |

---

## 5. Realtime no Painel Admin

| Canal | Tabela | Evento | Pagina |
|-------|--------|--------|--------|
| `admin-rides` | rides | INSERT/UPDATE | Dashboard, Rides, Monitor |
| `admin-drivers` | driver_profiles | UPDATE | Monitor (GPS) |
| `admin-logs` | error_logs | INSERT | Logs |
| `admin-messages-rt` | messages | INSERT/DELETE | Mensagens |
| `admin-payments-rt` | payments | INSERT/UPDATE | Pagamentos |
| `admin-payments-rt` | wallet_transactions | INSERT | Pagamentos |
| `admin-support-rt` | support_tickets | INSERT/UPDATE | Suporte |
| `admin-price-offers-rt` | price_offers | INSERT/UPDATE | Ofertas de Preco |

---

**Atualizado em 02/03/2026** — Supabase nhdupekrvafpqlsbpznq (supabase-gray-book), 33 paginas admin, 57 APIs, 74 tabelas public / 176 total

---

## 6. Relatorio de Corrida por Email (Resend)

Ao finalizar uma corrida (status = `completed`), o sistema envia automaticamente um email HTML ao passageiro.

**Conteudo do email:** nome do passageiro, nome completo do motorista, marca/modelo/cor/placa do veiculo, origem, destino, distancia, duracao real, valor pago, metodo de pagamento, horario de inicio e termino.

| Arquivo | Funcao |
|---------|--------|
| `lib/email.ts` | Template HTML dark mode + `sendRideReportEmail()` |
| `app/api/v1/rides/[id]/status/route.ts` | Dispara email automaticamente ao concluir corrida |
| `app/api/v1/rides/[id]/report/route.ts` | Endpoint POST — admin reenvia o relatorio manualmente |
| `app/admin/rides/[id]/page.tsx` | Botao "Enviar Relatorio por Email" na tela de detalhe |

**Variavel de ambiente:** `RESEND_API_KEY` (resend.com — 3.000 emails/mes gratis)
**Remetente:** `noreply@uppi.app` — alterar em `lib/email.ts` conforme dominio verificado.

---

**Atualizado em 02/03/2026**
