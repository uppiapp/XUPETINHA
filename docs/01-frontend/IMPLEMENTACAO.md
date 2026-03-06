# UPPI - Implementação Completa

**Ultima Atualizacao:** 06/03/2026  
**Versao:** 12.0

## Visão Geral

O Uppi é um app de transporte completo construído com Next.js 16, Supabase e design iOS-style.

---

> Banco de dados: ver docs/03-banco-de-dados/AUDITORIA-COMPLETA.md (73 tabelas, 98+ RLS, 45+ functions RPC)

---

## Stack Técnica

**Frontend:** Next.js 16 (App Router) + React 19 + TypeScript 5  
**Styling:** Tailwind CSS + shadcn/ui + design iOS-style  
**Backend:** Next.js API Routes **v1** (`/api/v1/*`) + Supabase PostgreSQL + PostGIS  
**Banco:** Supabase conectado, 73 tabelas ativas, RLS ativo  
**Realtime:** Supabase Realtime (ofertas, chat, tracking)  
**Maps:** Google Maps API + @vis.gl/react-google-maps  
**Auth:** Supabase Auth (sessões via cookies)

---

## Funcionalidades Implementadas

### 1. Diferencial Competitivo - Negociação de Preço
✅ Sistema de ofertas com contador regressivo visual iOS
✅ Badge "Melhor oferta" com coroa flutuante
✅ Banner de economia média
✅ Toast de novas ofertas com haptic feedback
✅ Ofertas expiram automaticamente após tempo definido

### 2. UX iOS Premium
✅ Feedback háptico em 7 padrões (light, medium, heavy, success, warning, error, selection)
✅ Modo escuro automático baseado em horário (6h-18h)
✅ Skeleton loaders iOS ao invés de spinners
✅ Animações micro-interactions em todas as telas
✅ Splash screen animado em 5 fases
✅ Gestos naturais (swipe, arrastar, pull to refresh)

### 3. Mapas Inteligentes
✅ **Motoristas próximos em tempo real** - Supabase Realtime + PostGIS
✅ Badge mostrando "X motoristas próximos" com pulse animation
✅ Ícones de carros no mapa com tipo de veículo
✅ **Heatmap de demanda** - Grid de 500m com scoring de demanda
✅ **Zonas quentes para motoristas** - Sugestões de onde ficar
✅ **Rotas alternativas com preços** - Google Directions API com 3 rotas
✅ Comparação lado a lado de tempo vs economia

### 4. Gamificação e Social
✅ Sistema de conquistas (13 badges em 4 categorias)
✅ **Ranking com leaderboard iOS** - 4 categorias (corridas, economia, avaliação, conquistas)
✅ Badges ouro/prata/bronze para top 3
✅ **Feed social** - Compartilhar economia, corridas, conquistas
✅ Sistema de likes, comentários, seguidores
✅ Cards coloridos por tipo de post
✅ Programa de indicação com código e créditos

### 5. IA e Personalização
✅ **Sugestão de destinos** - Baseada em histórico, dia da semana, horário
✅ **Previsão de preço** - "Geralmente custa R$ 25-30 nesse horário"
✅ **Alertas de preço** - Detecta pico, noturno, fora de pico
✅ Insights personalizados na home
✅ **Voice Assistant** - Solicitar corrida por voz (Web Speech API)
✅ Reconhecimento de comandos em português

### 6. Segurança e Confiabilidade
✅ Botão SOS com countdown e localização GPS
✅ Contatos de emergência
✅ Chat durante corrida (Supabase Realtime)
✅ Tracking em tempo real com ETA
✅ **Gravação de áudio criptografada** - AES-256-GCM, opt-in
✅ Auto-delete após 7 dias
✅ Compartilhamento de rota em tempo real

### 7. Economia e Pagamentos
✅ Wallet completo com saldo, cashback, transações
✅ **Club Uppi** - 3 planos com desconto e cashback
✅ Sistema de cupons automáticos
✅ **Split payment** - Corridas em grupo com código de convite
✅ Divisão igual, customizada ou por distância
✅ PIX, cartão, dinheiro, créditos Uppi

### 8. Para Motoristas
✅ Dashboard com earnings em tempo real
✅ **Análise de ganhos por horário e região**
✅ Meta diária com progresso visual
✅ **Zonas quentes com scoring** - Onde ficar para pegar mais corridas
✅ Gráfico de demanda por hora
✅ Chat direto com suporte (não bot)

### 9. Performance e Tecnologia
✅ **Rate limiting** - 3 tipos (API, Auth, Offer) em todas as rotas
✅ **Retry automático** - Exponential backoff, timeout configurável
✅ **Modo degradado** - Fallback visual quando Google Maps cai
✅ Prefetch de rotas comuns
✅ Cache agressivo de favoritos
✅ Supabase Realtime para updates em tempo real
✅ Service Worker desabilitado (pronto para Play Store)

### 10. Admin Dashboard
✅ Painel em tempo real com charts
✅ **Analytics avançado** - 5 funções SQL (métricas, receita, cohort, performance, crescimento)
✅ Monitor de corridas e motoristas no mapa
✅ **Webhooks** - Sistema completo com deliveries e retry
✅ Página de gerenciamento de webhooks
✅ Cron jobs para processar deliveries pendentes

### 11. Funcionalidades Avançadas
✅ **Corrida agendada** - Seletor de dia (14 dias) e horário (15min)
✅ Lembretes configuráveis (15min, 30min, 1h)
✅ **Múltiplas paradas** - Até 3 paradas intermediárias
✅ Sobretaxa por parada
✅ Avaliação bidirecional (passageiro ↔ motorista)
✅ Toast com ações (desfazer, ver detalhes)

### 12. Notificações Inteligentes
✅ Push notifications no DB
✅ **SMS Fallback** - Twilio quando push falha
✅ Preferências granulares por tipo de evento
✅ Tracking de custo de SMS
✅ Retry automático com backoff

### 13. Preparação para Play Store
✅ Service Worker removido (sem PWA)
✅ `assetlinks.json` para TWA
✅ Guia completo em `PLAYSTORE.md`
✅ Suporte a Bubblewrap e Capacitor
✅ Metadata e configurações prontas

---

> APIs e funcoes SQL: ver docs/02-backend-api/API-ENDPOINTS.md (56 route.ts, 92 handlers)

---

## Componentes React Principais

### Páginas Core
- `/uppi/home` - Home com mapa, motoristas próximos, sugestões IA, voice assistant
- `/uppi/ride/route-input` - Seleção de origem/destino com múltiplas paradas
- `/uppi/ride/select` - Escolha de veículo com preços dinâmicos
- `/uppi/ride/[id]/offers` - Negociação de preço com countdown
- `/uppi/ride/[id]/tracking` - Tracking em tempo real
- `/uppi/ride/[id]/chat` - Chat com motorista
- `/uppi/ride/schedule` - Agendar corrida
- `/uppi/ride/route-alternatives` - Rotas alternativas com preços
- `/uppi/ride/group` - Criar/entrar em corrida em grupo

### Gamificação e Social
- `/uppi/achievements` - Conquistas com progresso
- `/uppi/leaderboard` - Ranking com 4 categorias
- `/uppi/social` - Feed social com posts, likes, comments
- `/uppi/referral` - Indicação com código e rastreamento
- `/uppi/club` - Assinaturas Club Uppi

### Motorista
- `/uppi/driver` - Dashboard REDESENHADO: mapa + toggle online/offline + corridas Realtime + DriverBottomNavigation
- `/uppi/driver/earnings` - Análise de ganhos com charts + DriverBottomNavigation
- `/uppi/driver/history` - Historico de corridas + DriverBottomNavigation
- `/uppi/driver/profile` - Perfil do motorista + DriverBottomNavigation
- `/uppi/driver/wallet` - Carteira do motorista + DriverBottomNavigation
- `/uppi/driver/register` - Cadastro de veiculo
- `/uppi/driver/documents` - Upload de documentos (CNH, CRLV)
- `/uppi/driver/verify` - Verificacao de identidade

### Admin
- `/admin` - Dashboard com charts e stats
- `/admin/monitor` - Mapa com corridas e motoristas em tempo real
- `/admin/analytics` - Analytics avançado
- `/admin/webhooks` - Gerenciamento de webhooks

### Corrida - Telas adicionais
- `/uppi/ride/searching` - Aguardando motoristas
- `/uppi/ride/[id]/details` - Detalhes da corrida
- `/uppi/ride/[id]/review-enhanced` - Avaliacao avancada
- `/uppi/request-ride` - Solicitacao rapida de corrida

### Servicos
- `/uppi/cidade-a-cidade` - Corridas intermunicipais
- `/uppi/tracking` - Rastreamento global de corrida

### Analytics
- `/uppi/analytics` - Analytics do usuario (uso, gastos, tendencias)

### Configuracoes
- `/uppi/settings/sms` - Preferencias de SMS
- `/uppi/settings/recording` - Opt-in de gravacao de audio
- `/uppi/wallet` - Carteira com transacoes
- `/uppi/emergency` - Contatos de emergencia

### Componentes Reutilizaveis
- `<NearbyDrivers />` - Motoristas no mapa (Realtime)
- `<VoiceAssistantButton />` - Voice assistant com Speech API
- `<HotZonesCard />` - Zonas quentes para motoristas
- `<RideAudioRecorder />` - Gravacao de audio
- `<MapFallback />` - Fallback quando mapa falha
- `<GoogleMap />` - Mapa com retry e callbacks
- `<AutoTheme />` - Tema automatico por horario
- `<IOSSkeleton />` - Skeletons iOS-style
- `<BottomNavigation />` - Navegacao do passageiro (expandida para todas as rotas)
- `<DriverBottomNavigation />` - Navegacao do motorista (NOVO 06/03/2026)

### Fluxo de Auth (atualizado em 06/03/2026)
- `/auth/selection` - NOVO: tela de escolha Passageiro ou Motorista
- `/auth/passenger` - NOVO: signup exclusivo de passageiro
- Criar conta → `/auth/selection` → Passageiro: `/auth/passenger` | Motorista: `/auth/driver/welcome`
- Login motorista redireciona para `/uppi/driver` (corrigido de `/uppi/driver-mode`)

---

> Stack tecnica, seguranca, performance, variaveis de ambiente e scripts SQL: ver docs/03-banco-de-dados/AUDITORIA-COMPLETA.md
> Deploy Play Store: ver docs/06-deploy/PLAY-STORE.md
> Google Maps: ver docs/04-infraestrutura/GOOGLE-MAPS.md
