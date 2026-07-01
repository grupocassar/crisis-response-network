# Integraciones y Entorno Técnico — encuentrame.ve

Referencia técnica del entorno de desarrollo y las integraciones externas.
Los secretos van en `.env` (nunca en git). Ver `.env.example` para la estructura.

---

## Supabase

**Proyecto:** `mtbtgkzwaukqkayxfwqn`  
**URL:** `https://mtbtgkzwaukqkayxfwqn.supabase.co`  
**Región:** AWS us-east-1  
**Dashboard:** https://supabase.com/dashboard/project/mtbtgkzwaukqkayxfwqn

### Tablas principales

| Tabla | Descripción |
|---|---|
| `incidents` | Incidentes activos (terremoto-ve-2026) |
| `persons` | ~91k personas registradas con `status`, `search_name`, `document_id` |
| `updates` | Aportes/actualizaciones de usuarios sobre personas |

### Variables de entorno requeridas

| Variable | Dónde obtenerla |
|---|---|
| `SUPABASE_URL` | Fija: `https://mtbtgkzwaukqkayxfwqn.supabase.co` |
| `SUPABASE_PROJECT_REF` | Fijo: `mtbtgkzwaukqkayxfwqn` |
| `SUPABASE_ANON_KEY` | Dashboard > Project Settings > API > anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard > Project Settings > API > service_role ⚠️ secreto |
| `SUPABASE_ACCESS_TOKEN` | Dashboard > Account > Access Tokens — formato `sbp_xxx` ⚠️ secreto |
| `DB_HOST` | `db.mtbtgkzwaukqkayxfwqn.supabase.co` |
| `DB_PASSWORD` | Dashboard > Project Settings > Database ⚠️ secreto |

### Métodos de conexión desde Codespaces

> **Nota:** Codespaces no puede hacer conexiones TCP directas a Supabase (el host solo tiene registros IPv6 y Codespaces no rutea IPv6 a AWS). Las únicas opciones funcionales son:

| Método | Estado | Uso |
|---|---|---|
| REST API (`/rest/v1/`) con `SUPABASE_SERVICE_ROLE_KEY` | ✅ Funciona | Consultas SELECT, UPDATE via PostgREST |
| Management API (`api.supabase.com/v1/`) con `SUPABASE_ACCESS_TOKEN` | ✅ Funciona | Ejecutar SQL arbitrario (scripts `.sql`) |
| `psql` / `node-postgres` directo | ❌ Bloqueado | IPv6 — "Network is unreachable" |

---

## Scripts de entorno

Todos se ejecutan desde la raíz del monorepo. Requieren `.env` configurado.

```bash
# Verificar conexión a Supabase (REST API)
npm run db:ping

# Ejecutar un archivo .sql contra la base de datos
npm run db:sql -- ruta/al/archivo.sql
# Equivalente:
node scripts/ejecutar_sql.js ruta/al/archivo.sql
```

### scripts/conectar_db.js
Prueba de conexión vía REST API con `service_role` key. Muestra conteo de personas y stats del incidente activo.

### scripts/ejecutar_sql.js
Ejecuta un archivo `.sql` completo vía Management API de Supabase.
Requiere `SUPABASE_ACCESS_TOKEN` con formato `sbp_xxx` (Personal Access Token).
Crear token en: https://supabase.com/dashboard/account/tokens

---

## Incidente principal

| Campo | Valor |
|---|---|
| `slug` | `terremoto-ve-2026` |
| `id` | `9e730f8c-d800-4cf0-b9f1-54eac120a6bf` |

---

## Cloudflare Pages

**URL producción:** https://crisis-response-network.pages.dev  
**Deploy:** automático desde rama `main` del repositorio  
**Build command:** `npm run build` (en `/frontend`)  
**Output:** `frontend/dist`

---

## Telegram

Bot integrado vía webhook en el backend (`backend/`).
Ver `e989399` para referencia de la configuración inicial.

---

## APIs externas probadas (no integradas)

| API | Estado | Motivo |
|---|---|---|
| `desaparecidos-terremoto-api.theempire.tech` | ❌ HTTP 403 desde Codespaces | Bloqueada por IP de Codespaces |
| `venezuelatebusca.com` | ❌ HTTP 403 Cloudflare challenge | Anti-bot desde Codespaces |

---

## Stats de referencia (2026-07-01)

| Métrica | Valor |
|---|---|
| Total personas | ~91,574 |
| Buscados | ~30,897 |
| A salvo | ~35,191 |
| Heridos | ~25,342 |

> Los números cambian continuamente (crecen con nuevos registros, bajan con deduplicación). El frontend usa `localStorage` como cache para evitar saltos visuales entre renders.
