# Versionamento de API - Uppi

**Ultima Atualizacao:** 06/03/2026  
**Versao Atual:** v1  
**Status:** Todos os 57 route.ts em /api/v1/, middleware ativo

---

## Migração Completa

Todas as APIs agora usam versionamento obrigatório no path: `/api/v1/*`

### Rotas Migradas (56 total)

**Antes:** `/api/rides`  
**Agora:** `/api/v1/rides`

| Categoria | Rotas Migradas |
|-----------|----------------|
| Corridas | `/api/v1/rides`, `/api/v1/rides/[id]/status`, `/api/v1/rides/[id]/cancel` |
| Ofertas | `/api/v1/offers`, `/api/v1/offers/[id]/accept` |
| Avaliações | `/api/v1/ratings`, `/api/v1/reviews` |
| Perfil | `/api/v1/profile`, `/api/v1/stats` |
| Motorista | `/api/v1/drivers/nearby`, `/api/v1/drivers/hot-zones`, `/api/v1/driver/documents`, `/api/v1/driver/verify` |
| Financeiro | `/api/v1/wallet`, `/api/v1/coupons`, `/api/v1/subscriptions` |
| Social | `/api/v1/social/posts`, `/api/v1/social/posts/[id]/like`, `/api/v1/leaderboard`, `/api/v1/achievements` |
| Comunicação | `/api/v1/messages`, `/api/v1/notifications`, `/api/v1/sms/send` |
| Segurança | `/api/v1/emergency`, `/api/v1/recordings/upload` |
| Mapas | `/api/v1/geocode`, `/api/v1/places/autocomplete`, `/api/v1/places/details`, `/api/v1/routes/alternatives`, `/api/v1/distance` |
| Outros | `/api/v1/favorites`, `/api/v1/referrals`, `/api/v1/group-rides`, `/api/v1/group-rides/join`, `/api/v1/webhooks`, `/api/v1/webhooks/process` |
| Admin | `/api/v1/admin/setup`, `/api/v1/admin/create-first` |
| Health | `/api/v1/health` (novo) |

---

## Middleware de Versionamento

**Arquivo:** `middleware.ts`

### Comportamento

**Chamada SEM versão:** Retorna erro 404
```bash
GET /api/rides
```

**Response:**
```json
{
  "error": "Versao da API obrigatoria",
  "message": "Use /api/v1/rides em vez de /api/rides",
  "supported_versions": ["v1"],
  "latest_version": "v1",
  "redirect_to": "/api/v1/rides"
}
```

**Headers:**
```
X-API-Version: v1
X-Supported-Versions: v1
X-Latest-Version: v1
```

**Chamada COM versão:** Funciona normalmente
```bash
GET /api/v1/rides
```

---

## Configuração

**Arquivo:** `lib/api/config.ts`

```typescript
export const API_VERSIONS = {
  V1: 'v1',
} as const

export const CURRENT_VERSION = API_VERSIONS.V1
export const SUPPORTED_VERSIONS = [API_VERSIONS.V1]
export const LATEST_VERSION = API_VERSIONS.V1

// Helper para construir URLs versionadas
export function apiUrl(path: string): string {
  return `/api/${CURRENT_VERSION}${path}`
}
```

**Uso:**
```typescript
// Em componentes
const response = await fetch(apiUrl('/rides'))
// Gera: /api/v1/rides
```

---

## Wrapper para Route Handlers

**Arquivo:** `lib/api/version-middleware.ts`

```typescript
import { withVersioning } from '@/lib/api/version-middleware'

export const GET = withVersioning(async (request) => {
  // Seu código aqui
  return NextResponse.json({ rides })
})
```

**Benefícios:**
- Headers de versão automáticos
- Suporte a deprecation warnings
- Logging consistente

---

## Health Check

**Endpoint:** `GET /api/v1/health`

**Response:**
```json
{
  "status": "ok",
  "version": "v1",
  "timestamp": "2026-02-17T..."
}
```

**Uso:** Monitoramento, testes de deploy, readiness checks

---

## Preparação para v2

A estrutura está pronta para adicionar v2 no futuro:

1. **Adicionar ao config:**
```typescript
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2', // Novo
} as const
```

2. **Atualizar suporte:**
```typescript
export const SUPPORTED_VERSIONS = [API_VERSIONS.V1, API_VERSIONS.V2]
export const CURRENT_VERSION = API_VERSIONS.V2
```

3. **Criar rotas:**
```
app/api/v2/rides/route.ts
```

4. **Deprecar v1:**
```typescript
export const DEPRECATED_VERSIONS = [API_VERSIONS.V1]
```

---

## Client Updates

**22 arquivos atualizados** com as novas URLs:

- `components/search-address.tsx` (3 refs)
- `components/ride-audio-recorder.tsx` (1 ref)
- `components/nearby-drivers.tsx` (1 ref)
- `components/hot-zones-card.tsx` (1 ref)
- `app/uppi/social/page.tsx` (2 refs)
- `app/uppi/ride/select/page.tsx` (1 ref)
- `app/uppi/ride/searching/page.tsx` (1 ref)
- `app/uppi/ride/route-alternatives/page.tsx` (1 ref)
- `app/uppi/ride/group/page.tsx` (2 refs)
- `app/uppi/driver/documents/page.tsx` (2 refs)
- `app/uppi/ride/[id]/review/page.tsx` (1 ref)
- `app/uppi/ride/[id]/details/page.tsx` (1 ref)
- `app/uppi/request-ride/page.tsx` (1 ref)
- `app/uppi/leaderboard/page.tsx` (1 ref)
- `app/admin/webhooks/page.tsx` (3 refs)
- `lib/utils/fetch-retry.ts` (2 refs em JSDoc)

**Total:** 22 referências atualizadas

---

## Referências

- **API Endpoints:** `docs/02-backend-api/API-ENDPOINTS.md`
- **Config:** `lib/api/config.ts`
- **Middleware:** `lib/api/version-middleware.ts`
- **Root Middleware:** `middleware.ts`
