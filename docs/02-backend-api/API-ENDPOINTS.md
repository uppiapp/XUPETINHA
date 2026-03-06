# UPPI - API Endpoints (92 handlers em 57 route.ts)

**Ultima Atualizacao:** 06/03/2026  
**Versao:** 12.0  
**Base URL:** `/api/v1` (versionamento obrigatorio)  
**Auth:** Supabase Auth (Bearer Token via cookie)  
**Rate Limiting:** Sliding window em todas as rotas  
**Status:** Supabase mstnqzgsdnlsajuaezhs conectado, 80 tabelas ativas, 57 route.ts 100% implementados  
**Correcao 06/03/2026:** api/v1/driver/location agora sincroniza is_available em driver_profiles

---

## Versionamento de API

Todas as APIs usam versionamento obrigatório no path: `/api/v1/*`

**Exemplo correto:** `GET /api/v1/rides`  
**Chamada sem versão retorna 404:**
```json
{
  "error": "Versao da API obrigatoria",
  "message": "Use /api/v1/rides em vez de /api/rides",
  "supported_versions": ["v1"],
  "latest_version": "v1",
  "redirect_to": "/api/v1/rides"
}
```

**Headers de versão:**
```
X-API-Version: v1
X-Supported-Versions: v1
X-Latest-Version: v1
```

**Health Check:** `GET /api/v1/health`

---

## Sumario

| Categoria | route.ts | Handlers | Rate Limit |
|-----------|----------|----------|------------|
| Corridas | 3 | 5 | 60 req/min |
| Ofertas | 2 | 4 | 5 req/30s (POST), 30 req/min (GET) |
| Avaliacoes | 4 | 8 | 60 req/min |
| Perfil | 2 | 3 | 60 req/min |
| Motorista | 6 | 9 | 20 req/min |
| Financeiro | 3 | 6 | 60 req/min |
| Social | 5 | 8 | 10 req/min (POST), 30 req/min (GET) |
| Comunicacao | 6 | 11 | 15-30 req/min |
| Seguranca | 2 | 4 | 60 req/min |
| Mapas | 5 | 5 | 60 req/min |
| Outros | 8 | 14 | 60 req/min |
| Admin | 4 | 5 | 60 req/min |
| Health | 1 | 1 | Sem limite |
| **Total** | **57** | **92** | |

> **Correcao 06/03/2026:** `api/v1/driver/location` agora sincroniza `is_available` no `driver_profiles` alem de `driver_locations`.  
> **Tabelas que as APIs escrevem (atualizadas em 06/03/2026):** rides, price_offers, driver_locations, driver_profiles, notifications, wallet_transactions.

> Rotas completas: rides, rides/[id]/status, rides/[id]/cancel, offers, offers/[id]/accept, reviews, reviews/enhanced, reviews/driver, ratings, profile, driver/location, driver/documents, driver/verify, drivers/nearby, drivers/hot-zones, subscriptions, wallet, coupons, social/posts, social/posts/[id]/like, social/posts/[id]/comments, notifications, notifications/send, sms/send, sms/status, messages, recordings/upload, emergency, favorites, geocode, places/autocomplete, places/details, distance, routes/alternatives, stats, referrals, group-rides, group-rides/join, leaderboard, achievements, webhooks, webhooks/process, admin/setup, admin/create-first, auth/verify, health

---

## 1. Corridas (Rides)

### POST /api/v1/rides
Criar nova corrida.

**Auth:** Obrigatoria
**Body:**
```json
{
  "pickup_address": "Av Paulista 1000",
  "dropoff_address": "Rua Augusta 500",
  "pickup_lat": -23.5505,
  "pickup_lng": -46.6333,
  "dropoff_lat": -23.5629,
  "dropoff_lng": -46.6544,
  "passenger_price_offer": 25.00,
  "distance_km": 3.2,
  "estimated_duration_minutes": 15,
  "payment_method": "pix",
  "vehicle_type": "economy"
}
```

**Response:** `200`
```json
{
  "ride": {
    "id": "uuid",
    "passenger_id": "uuid",
    "status": "pending",
    "vehicle_type": "economy",
    ...
  }
}
```

**Vehicle types validos:** `moto`, `economy`, `electric`, `premium`, `suv`

---

### GET /api/v1/rides
Listar corridas do usuario.

**Auth:** Obrigatoria
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| status | string | Filtrar por status (opcional) |

**Response:** `200`
```json
{
  "rides": [
    {
      "id": "uuid",
      "status": "completed",
      "pickup_address": "...",
      "final_price": 28.50,
      ...
    }
  ]
}
```

---

### POST /api/v1/rides/[id]/status
Atualizar status da corrida.

**Auth:** Obrigatoria
**Body:**
```json
{
  "status": "in_progress"
}
```

---

### POST /api/v1/rides/[id]/cancel
Cancelar corrida.

**Auth:** Obrigatoria
**Body:**
```json
{
  "cancellation_reason": "Mudei de ideia"
}
```

---

## 2. Ofertas de Preco (Price Negotiation)

### POST /api/v1/offers
Criar oferta de preco (somente motoristas).

**Auth:** Obrigatoria (driver)
**Rate Limit:** 5 req/30s
**Body:**
```json
{
  "ride_id": "uuid",
  "offer_price": 22.00,
  "message": "Estou proximo, posso ir rapido"
}
```

**Response:** `200`
```json
{
  "offer": {
    "id": "uuid",
    "ride_id": "uuid",
    "driver_id": "uuid",
    "offered_price": 22.00,
    "status": "pending",
    "expires_at": "2026-02-12T..."
  }
}
```

---

### GET /api/v1/offers
Listar ofertas de uma corrida.

**Auth:** Obrigatoria
**Rate Limit:** 30 req/min
**Query Params:**
| Param | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| ride_id | UUID | Sim | ID da corrida |

**Response:** `200`
```json
{
  "offers": [
    {
      "id": "uuid",
      "offered_price": 22.00,
      "status": "pending",
      "driver": {
        "full_name": "Carlos",
        "avatar_url": "...",
        "rating": 4.8,
        "total_rides": 340,
        "driver_profiles": { "vehicle_brand": "Toyota", ... }
      }
    }
  ]
}
```

---

### POST /api/v1/offers/[id]/accept
Aceitar oferta.

**Auth:** Obrigatoria (passageiro dono da corrida)

---

## 3. Avaliacoes (Reviews)

### GET /api/v1/ratings
Listar avaliacoes do usuario.

### POST /api/v1/ratings
Criar avaliacao de corrida.

**Body:**
```json
{
  "ride_id": "uuid",
  "reviewed_id": "uuid",
  "rating": 5,
  "comment": "Otimo motorista!",
  "tags": ["pontual", "educado", "carro limpo"]
}
```

---

### GET /api/v1/reviews
Listar reviews avancadas.

### POST /api/v1/reviews
Criar review detalhada.

---

### GET /api/v1/reviews/enhanced
Buscar avaliacoes detalhadas com categorias e tags.

**Auth:** Obrigatoria
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| ride_id | UUID | Filtrar por corrida (opcional) |
| user_id | UUID | Filtrar por usuario (opcional) |
| limit | int | Limite de resultados (default: 50) |

**Response:** `200`
```json
{
  "reviews": [
    {
      "id": "uuid",
      "ride_id": "uuid",
      "reviewer_id": "uuid",
      "reviewee_id": "uuid",
      "overall_rating": 5,
      "comment": "Excelente motorista!",
      "review_categories": [
        {
          "category_name": "Pontualidade",
          "category_rating": 5,
          "category_comment": "Chegou no horario"
        }
      ],
      "review_tags": [
        { "tag": "educado" },
        { "tag": "carro limpo" }
      ],
      "reviewer": { "full_name": "João", "avatar_url": "..." },
      "reviewee": { "full_name": "Carlos", "avatar_url": "..." }
    }
  ]
}
```

---

### POST /api/v1/reviews/enhanced
Criar avaliacao detalhada com categorias e tags.

**Auth:** Obrigatoria
**Body:**
```json
{
  "ride_id": "uuid",
  "reviewee_id": "uuid",
  "overall_rating": 5,
  "comment": "Excelente motorista!",
  "categories": [
    {
      "name": "Pontualidade",
      "rating": 5,
      "comment": "Chegou no horario"
    },
    {
      "name": "Educacao",
      "rating": 5
    }
  ],
  "tags": ["educado", "carro limpo", "direcao segura"]
}
```

**Response:** `201`
```json
{
  "review": {
    "id": "uuid",
    "ride_id": "uuid",
    "overall_rating": 5,
    "created_at": "..."
  }
}
```

---

### GET /api/v1/reviews/driver
Buscar avaliacoes bidirecionais (motorista avalia passageiro).

**Auth:** Obrigatoria
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| ride_id | UUID | Filtrar por corrida (opcional) |
| driver_id | UUID | Filtrar por motorista (opcional) |
| passenger_id | UUID | Filtrar por passageiro (opcional) |
| limit | int | Limite de resultados (default: 50) |

**Response:** `200`
```json
{
  "reviews": [
    {
      "id": "uuid",
      "ride_id": "uuid",
      "reviewer_id": "uuid",
      "reviewee_id": "uuid",
      "reviewer_type": "driver",
      "reviewee_type": "passenger",
      "rating": 5,
      "comment": "Passageiro educado e pontual"
    }
  ]
}
```

---

### POST /api/v1/reviews/driver
Motorista avaliar passageiro (avaliacao bidirecional).

**Auth:** Obrigatoria (somente motoristas)
**Body:**
```json
{
  "ride_id": "uuid",
  "passenger_id": "uuid",
  "rating": 5,
  "comment": "Passageiro educado e pontual"
}
```

**Response:** `201`
```json
{
  "review": {
    "id": "uuid",
    "ride_id": "uuid",
    "rating": 5,
    "created_at": "..."
  }
}
```

---

## 4. Perfil e Conta

### GET /api/v1/profile
Retorna perfil do usuario com dados de motorista (se aplicavel).

**Auth:** Obrigatoria
**Response:** `200`
```json
{
  "id": "uuid",
  "full_name": "Joao Silva",
  "phone": "+5511999999999",
  "avatar_url": "...",
  "user_type": "passenger",
  "rating": 4.9,
  "total_rides": 42,
  "is_admin": false,
  "referral_code": "JOAO2026",
  "driver_profiles": null
}
```

---

### PATCH /api/v1/profile
Atualizar perfil.

**Body:**
```json
{
  "full_name": "Joao Silva Santos",
  "phone": "+5511999999999",
  "avatar_url": "https://..."
}
```

---

### GET /api/v1/stats
Estatisticas do usuario.

---

## 5. Motorista

### GET /api/v1/drivers/nearby
Buscar motoristas proximos via PostGIS.

**Auth:** Obrigatoria
**Rate Limit:** 20 req/min
**Query Params:**
| Param | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| lat | float | - | Latitude (obrigatorio) |
| lng | float | - | Longitude (obrigatorio) |
| radius | float | 5 | Raio em km |

**Response:** `200`
```json
{
  "drivers": [
    {
      "id": "uuid",
      "full_name": "Carlos",
      "rating": 4.8,
      "vehicle_type": "economy",
      "vehicle_brand": "Toyota",
      "lat": -23.5510,
      "lng": -46.6340,
      "distance_meters": 450
    }
  ]
}
```

---

### GET /api/v1/drivers/hot-zones
Zonas quentes de demanda.

---

### GET /api/v1/driver/location
Buscar localizacao atual do motorista.

**Auth:** Obrigatoria
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| driver_id | UUID | ID do motorista (opcional, default: usuario atual) |

**Response:** `200`
```json
{
  "driver_id": "uuid",
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "last_update": "2026-02-17T10:30:00Z",
  "is_online": true,
  "is_available": true
}
```

---

### PATCH /api/v1/driver/location
Atualizar localizacao do motorista em tempo real (PostGIS).

**Auth:** Obrigatoria (somente motoristas)
**Rate Limit:** 60 req/min (chamado a cada 5-10s durante corridas)
**Body:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "heading": 90,
  "speed": 35.5
}
```

**Response:** `200`
```json
{
  "success": true,
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333,
    "heading": 90,
    "speed": 35.5
  },
  "updated_at": "2026-02-17T10:30:00Z"
}
```

**Notas:**
- Usa PostGIS: `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
- Chama RPC `update_driver_location` ou atualiza diretamente
- heading: direcao em graus (0-360, 0 = Norte)
- speed: velocidade em km/h

---

### GET /api/v1/driver/documents
### POST /api/v1/driver/documents
Gerenciar documentos do motorista.

---

### POST /api/v1/driver/verify
Verificacao facial do motorista.

---

## 6. Financeiro

### GET /api/v1/wallet
Carteira e transacoes (ultimas 50).

**Auth:** Obrigatoria
**Response:** `200`
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "credit",
      "amount": "50.00",
      "description": "Credito adicionado",
      "created_at": "..."
    }
  ],
  "balance": 150.00
}
```

---

### POST /api/v1/wallet
Criar transacao na carteira.

**Body:**
```json
{
  "amount": 50.00,
  "type": "credit",
  "description": "Recarga PIX",
  "ride_id": null
}
```

**Tipos validos:** `credit`, `debit`, `refund`, `withdrawal`

---

### GET /api/v1/coupons
### POST /api/v1/coupons
Listar/aplicar cupons.

### GET /api/v1/subscriptions
### POST /api/v1/subscriptions
Gerenciar assinatura Club Uppi.

---

## 7. Social e Gamificacao

### GET /api/v1/social/posts
Feed social paginado.

**Rate Limit:** 30 req/min
**Query Params:**
| Param | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| limit | int | 20 | Posts por pagina |
| offset | int | 0 | Offset de paginacao |

Usa RPC `get_social_feed` internamente.

---

### POST /api/v1/social/posts
Criar post no feed.

**Rate Limit:** 10 req/min
**Body:**
```json
{
  "type": "savings",
  "title": "Economizei R$ 15 na corrida!",
  "description": "Negociei o preco e consegui desconto",
  "metadata": { "savings_amount": 15.00 },
  "visibility": "public"
}
```

---

### POST /api/v1/social/posts/[id]/like
### DELETE /api/v1/social/posts/[id]/like
Curtir/descurtir post.

---

### GET /api/v1/social/posts/[id]/comments
Buscar comentarios de um post.

**Auth:** Obrigatoria
**Rate Limit:** 30 req/min
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| limit | int | Comentarios por pagina (default: 50) |
| offset | int | Offset de paginacao (default: 0) |

**Response:** `200`
```json
{
  "comments": [
    {
      "id": "uuid",
      "post_id": "uuid",
      "user_id": "uuid",
      "content": "Parabens! Tambem consegui desconto assim",
      "created_at": "2026-02-17T10:30:00Z",
      "author": {
        "id": "uuid",
        "full_name": "João Silva",
        "avatar_url": "..."
      }
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

---

### POST /api/v1/social/posts/[id]/comments
Adicionar comentario em um post.

**Auth:** Obrigatoria
**Rate Limit:** 10 req/min
**Body:**
```json
{
  "content": "Parabens! Tambem consegui desconto assim"
}
```

**Validacao:**
- Conteudo obrigatorio e nao vazio
- Maximo 500 caracteres

**Response:** `201`
```json
{
  "comment": {
    "id": "uuid",
    "post_id": "uuid",
    "user_id": "uuid",
    "content": "Parabens! Tambem consegui desconto assim",
    "created_at": "2026-02-17T10:30:00Z",
    "author": {
      "id": "uuid",
      "full_name": "João Silva",
      "avatar_url": "..."
    }
  }
}
```

**Efeitos colaterais:**
- Incrementa `comments_count` no post
- Notifica autor do post (exceto se comentar no proprio post)
- Notificacao tipo: `post_comment`

---

### DELETE /api/v1/social/posts/[id]/comments?comment_id=xxx
Deletar um comentario.

**Auth:** Obrigatoria
**Rate Limit:** 30 req/min
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| comment_id | UUID | ID do comentario (obrigatorio) |

**Permissoes:**
- Autor do comentario pode deletar
- Admin pode deletar qualquer comentario

**Response:** `200`
```json
{
  "success": true,
  "deleted_id": "uuid"
}
```

**Efeitos colaterais:**
- Decrementa `comments_count` no post

---

### GET /api/v1/leaderboard
Rankings (usa RPC `get_leaderboard`).

---

### GET /api/v1/achievements
Conquistas do usuario.

---

## 8. Comunicacao

### GET /api/v1/notifications
Listar notificacoes (ultimas 50).

**Rate Limit:** 30 req/min

### POST /api/v1/notifications
Criar notificacao.

**Rate Limit:** 15 req/min
**Body:**
```json
{
  "user_id": "uuid",
  "type": "ride",
  "title": "Nova oferta!",
  "message": "Voce recebeu uma oferta de R$ 22",
  "ride_id": "uuid"
}
```

### PATCH /api/v1/notifications
Marcar como lida.

**Body:**
```json
{
  "notification_id": "uuid",
  "read": true
}
```

---

### GET /api/v1/messages
### POST /api/v1/messages
Chat da corrida (Supabase Realtime).

---

### POST /api/v1/sms/send
Enviar SMS via Twilio (fallback de notificacoes).

---

### GET /api/v1/sms/status
Consultar status de SMS enviados.

**Auth:** Obrigatoria
**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| message_sid | string | Twilio Message SID (opcional) |
| ride_id | UUID | ID da corrida (opcional) |

**Response:** `200`
```json
{
  "sms_logs": [
    {
      "id": "uuid",
      "to_number": "+5511999999999",
      "provider_message_id": "SM...",
      "status": "delivered",
      "delivered_at": "2026-02-17T10:30:00Z",
      "error_code": null,
      "error_message": null,
      "created_at": "2026-02-17T10:29:45Z"
    }
  ]
}
```

---

### POST /api/v1/sms/status
Webhook do Twilio para atualizar status de SMS.

**Auth:** Nenhuma (webhook externo)
**Content-Type:** `application/x-www-form-urlencoded`
**Body:** (form-data do Twilio)
| Campo | Tipo | Descricao |
|-------|------|-----------|
| MessageSid | string | ID da mensagem Twilio |
| MessageStatus | string | Status: queued, sent, delivered, failed, undelivered |
| ErrorCode | string | Codigo do erro (se houver) |
| ErrorMessage | string | Mensagem de erro (se houver) |

**Response:** `200`
```json
{
  "success": true,
  "message_sid": "SM...",
  "status": "delivered"
}
```

**Status possiveis:**
- `queued`: SMS na fila
- `sent`: SMS enviado ao provedor
- `delivered`: SMS entregue ao destinatario
- `failed`: Falha no envio
- `undelivered`: Nao entregue

**Notificacoes automaticas:**
- Se `delivered`: notifica usuario via Supabase Realtime
- Se `failed` ou `undelivered`: notifica usuario sobre falha

**Configuracao Twilio:**
1. Acessar Twilio Console > Messaging > Settings > Webhooks
2. Configurar webhook URL: `https://seu-dominio.com/api/v1/sms/status`
3. Selecionar eventos: `Delivered`, `Failed`, `Undelivered`

---

## 9. Seguranca

### GET /api/v1/emergency
### POST /api/v1/emergency
### PUT /api/v1/emergency
Gerenciar contatos e alertas de emergencia.

### POST /api/v1/recordings/upload
Upload de gravacao criptografada (AES-256-GCM).

---

## 10. Localizacao e Mapas (Google Maps API)

### GET /api/v1/geocode
Geocoding de endereco.

**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| address | string | Endereco para geocodificar |

---

### GET /api/v1/places/autocomplete
Autocomplete de enderecos (Google Places).

**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| input | string | Texto de busca |

---

### GET /api/v1/places/details
Detalhes de um lugar.

**Query Params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| place_id | string | Google Place ID |

---

### GET /api/v1/routes/alternatives
Rotas alternativas com precos (Google Directions).

### GET /api/v1/distance
Calculo de distancia entre pontos.

---

## 11. Outros

### GET /api/v1/favorites
### POST /api/v1/favorites
### DELETE /api/v1/favorites
Enderecos favoritos.

### GET /api/v1/referrals
### POST /api/v1/referrals
Programa de indicacao.

### GET /api/v1/group-rides
### POST /api/v1/group-rides
Corridas em grupo.

### POST /api/v1/group-rides/join
Entrar em grupo com codigo de convite.

### GET /api/v1/webhooks
### POST /api/v1/webhooks
### DELETE /api/v1/webhooks
Gerenciar webhooks.

### GET /api/v1/webhooks/process
### POST /api/v1/webhooks/process
Processar entregas pendentes (cron job, requer CRON_SECRET).

---

## 12. Admin

### POST /api/admin/setup
Setup inicial do admin.

### POST /api/admin/create-first
Criar primeiro admin (requer SUPABASE_SERVICE_ROLE_KEY).

---

## Padrao de Erros

Todas as APIs retornam erros no formato:

```json
{
  "error": "Mensagem descritiva do erro"
}
```

| Status | Significado |
|--------|-------------|
| 400 | Bad Request - parametros invalidos |
| 401 | Unauthorized - nao autenticado |
| 403 | Forbidden - sem permissao (ex: nao e motorista) |
| 429 | Rate Limited - muitas requisicoes |
| 500 | Internal Server Error |

---

## Rate Limiting

| Limiter | Window | Limite | Usado em |
|---------|--------|--------|----------|
| apiLimiter | 1 min | 60 req | Maioria das rotas |
| authLimiter | 5 min | 10 req | Rotas de autenticacao |
| offerLimiter | 30s | 5 req | Criacao de ofertas |

Header de resposta quando limitado:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707753600
Retry-After: 30
```

---

## Autenticacao

Todas as rotas (exceto admin/setup) usam Supabase Auth:

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

O token de sessao e gerenciado automaticamente via cookies pelo middleware Supabase.

---

> Funcoes SQL (RPCs) chamadas pelas APIs: ver docs/03-banco-de-dados/AUDITORIA-COMPLETA.md
> Tabelas e RLS (73 tabelas, 98+ policies): ver docs/03-banco-de-dados/SCHEMA.md
> Adicionar novos endpoints: ver docs/02-backend-api/VERSIONAMENTO.md
