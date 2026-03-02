# UPPI - Painel Administrativo

**Ultima Atualizacao:** 01/03/2026
**Versao:** 1.0
**Rota base:** /admin
**Autenticacao:** profiles.is_admin = true (verificado em layout.tsx via requireAdmin)

---

## 1. Visao Geral

O painel admin e uma aplicacao Next.js completa com 11 paginas, sidebar responsiva, header com notificacoes em tempo real e tema escuro proprio. Controla 100% do app em tempo real via Supabase Realtime.

### Componentes base
| Arquivo | Descricao |
|---------|-----------|
| `app/admin/layout.tsx` | Layout raiz: protecao de rota + AdminSidebar + AdminHeader |
| `components/admin/admin-sidebar.tsx` | Sidebar com 11 links de navegacao, icones Lucide, estado ativo |
| `components/admin/admin-header.tsx` | Header com busca global, notificacoes Realtime, avatar do admin |

---

## 2. Paginas (11)

### 2.1 Dashboard — /admin
**Arquivo:** `app/admin/page.tsx`

Metricas em tempo real via Supabase Realtime (canal `admin-rides`):
- Total de corridas / corridas ativas / usuarios / motoristas online
- Receita do dia / taxa de conclusao
- AreaChart: corridas nos ultimos 7 dias (dados reais do banco)
- BarChart: distribuicao por hora do dia (dados reais do banco)
- Feed de ultimas corridas com status colorido
- Motoristas online ao vivo

**Correcoes aplicadas:**
- Removido `ResponsiveContainer` redundante dentro de `ChartContainer` (eliminado warning do Recharts nas linhas 227/256)
- Import `ResponsiveContainer` removido pois nao era mais utilizado

---

### 2.2 Usuarios — /admin/users
**Arquivo:** `app/admin/users/page.tsx`

- Lista completa de usuarios com paginacao
- Busca por nome/email em tempo real
- Filtro por tipo (passageiro/motorista) e status (ativo/banido)
- Acoes: banir usuario (com motivo), reativar, ver perfil completo
- Badge colorido por tipo de usuario
- Contador de corridas e avaliacao media por usuario

---

### 2.3 Motoristas — /admin/drivers
**Arquivo:** `app/admin/drivers/page.tsx`

- Lista de motoristas com dados do veiculo
- Status de verificacao (pendente/aprovado/rejeitado)
- Acoes: aprovar documentos, rejeitar (com motivo), ver localizacao atual
- Filtro por status de verificacao e disponibilidade
- Total de corridas e ganhos do motorista

---

### 2.4 Corridas — /admin/rides
**Arquivo:** `app/admin/rides/page.tsx`

- Lista de todas as corridas com status atual
- Realtime: novas corridas aparecem automaticamente
- Filtro por status (searching/accepted/in_progress/completed/cancelled)
- Acoes admin: forcar conclusao, forcar cancelamento, atribuir motorista
- Ver detalhes completos: origem, destino, preco, motorista, passageiro

---

### 2.5 Financeiro — /admin/financeiro
**Arquivo:** `app/admin/financeiro/page.tsx`

- Receita total / taxa da plataforma / repasses para motoristas
- Grafico de receita por dia (ultimos 30 dias)
- Lista de pagamentos recentes com status
- Filtro por metodo de pagamento e periodo
- Exportar relatorio (CSV)

---

### 2.6 Analytics — /admin/analytics
**Arquivo:** `app/admin/analytics/page.tsx`

5 RPCs Supabase chamadas diretamente:
1. `get_rides_per_hour` — distribuicao de corridas por hora
2. `get_revenue_per_day` — receita diaria dos ultimos 30 dias
3. `get_top_drivers` — top 10 motoristas por corridas/ganhos
4. `get_user_retention` — retencao de usuarios por cohort
5. `get_heatmap_data` — dados de mapa de calor por regiao

Charts: BarChart, LineChart, AreaChart, PieChart todos sem ResponsiveContainer redundante.

---

### 2.7 Monitor — /admin/monitor
**Arquivo:** `app/admin/monitor/page.tsx`

**Correcao aplicada:** `createMap()` foi definida dentro do `useEffect` — anteriormente estava sendo chamada mas nunca definida, fazendo o mapa nao renderizar.

Funcionalidades:
- Mapa Google Maps com todos os motoristas online (marcadores ao vivo)
- Realtime via Supabase: posicoes atualizadas a cada mudanca em driver_profiles
- Estilo escuro customizado (darkMapStyle)
- Centro padrao: Brasilia (-15.7801, -47.9292)
- Painel lateral: lista de corridas ativas com status

---

### 2.8 Cupons — /admin/cupons
**Arquivo:** `app/admin/cupons/page.tsx`

- Lista de cupons com codigo, tipo, valor, uso e validade
- CRUD completo: criar, editar inline, ativar/desativar, deletar
- Validacao: codigo unico, data de expiracao, limite de usos
- Badges coloridos: ativo/expirado/esgotado
- Conectado diretamente a tabela `coupons` no Supabase

---

### 2.9 Notificacoes — /admin/notifications
**Arquivo:** `app/admin/notifications/page.tsx`

**Correcao aplicada:** Bug `result?.ok !== false` — como `result` era `null` antes da chamada async completar, o historico era sempre registrado mesmo em caso de erro. Corrigido usando variaveis locais `ok` e `msg` para capturar o resultado real antes de atualizar o estado.

Funcionalidades:
- Broadcast para todos os usuarios, somente passageiros, somente motoristas
- Envio individual por usuario (com busca)
- Historico das ultimas 10 notificacoes enviadas
- Feedback visual de sucesso/erro por envio
- Chamadas: `/api/v1/push/send` e `/api/v1/push/broadcast`

---

### 2.10 Logs — /admin/logs
**Arquivo:** `app/admin/logs/page.tsx`

- Lista de error_logs em tempo real (Realtime Supabase)
- Filtro por nivel: error / warn / info
- Exibe: timestamp, nivel, mensagem, contexto, stack trace expansivel
- Paginacao com scroll infinito
- Botao para limpar logs antigos (> 30 dias)

---

### 2.11 Configuracoes — /admin/settings
**Arquivo:** `app/admin/settings/page.tsx`

- Carrega e salva configuracoes diretamente em `system_settings` no Supabase
- 6 parametros populados via migration em 01/03/2026:

| Chave | Valor padrao | Tipo |
|-------|-------------|------|
| platform_fee_percent | 15 | Percentual |
| min_ride_price | 5.00 | Decimal |
| price_per_km | 2.50 | Decimal |
| max_driver_search_radius_km | 15 | Inteiro |
| app_version_min | 1.0.0 | String |
| maintenance_mode | false | Boolean |

- Salva individualmente cada parametro com feedback de sucesso
- Toggle visual para maintenance_mode (bloqueia novos pedidos no app)

---

## 3. Bugs Corrigidos em 01/03/2026

| Pagina | Bug | Correcao |
|--------|-----|----------|
| Dashboard | `ResponsiveContainer` dentro de `ChartContainer` causava warning no Recharts (linhas 227/256) | Removido `ResponsiveContainer` redundante — `ChartContainer` ja gerencia dimensoes |
| Monitor | `createMap()` era chamada no `initMap()` mas nunca definida — mapa nao renderizava | Funcao `createMap()` definida dentro do mesmo `useEffect`, antes da chamada `initMap()` |
| Notifications | `result?.ok !== false` sempre era `true` porque `result` ainda era `null` quando avaliado | Substituido por variaveis locais `ok` e `msg` com resultado da resposta HTTP |
| Notifications | Sem imports de `Card`, `CardContent`, `Badge` em versoes anteriores | Imports adicionados |

---

## 4. Seguranca

### Autenticacao
- `lib/admin-auth.ts` exporta `requireAdmin()` — verifica `is_admin = true` no perfil
- `app/admin/layout.tsx` chama `requireAdmin()` antes de renderizar qualquer pagina
- Redirect automatico para `/auth/login` se nao autenticado ou nao admin

### RLS no Supabase
Todas as tabelas acessadas pelo admin possuem RLS com policy `FOR ALL USING (is_admin = true)`:
- `system_settings` — admins_all_system_settings
- `error_logs` — admins_all_error_logs
- `coupons` — admins_all_coupons
- `webhook_endpoints` — admins_all_webhooks
- `notifications` — own_notifications (admin ve todas)
- `payments` — own_payments (admin ve todas)
- `profiles` — profiles_admin_select + profiles_admin_update

---

## 5. Realtime no Painel Admin

| Canal Supabase | Tabela | Evento | Usado em |
|----------------|--------|--------|----------|
| `admin-rides` | rides | INSERT/UPDATE | Dashboard, Rides, Monitor |
| `admin-drivers` | driver_profiles | UPDATE | Monitor (posicoes GPS) |
| `admin-logs` | error_logs | INSERT | Logs |
| `admin-notifications` | notifications | INSERT | Header (contador) |

---

**Atualizado em 01/03/2026**
