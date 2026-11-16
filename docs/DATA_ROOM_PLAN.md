# Data Room — Plan Técnico
**Encuéntrame VE**
2026-07-01

---

## Objetivo

Proveer acceso seguro y profesional a la data del censo humanitario
para periodistas verificados, investigadores y ONGs de Derechos Humanos,
sin exponer la infraestructura interna ni los métodos de extracción.

---

## Arquitectura

### Capa 1 — Acceso por Token

- Token único por periodista: formato `PVE-XXXX-XXXX`
- Array hardcodeado en el componente `PressView` del frontend
- Sin base de datos de usuarios (cero superficie de ataque)
- Revocación: eliminar la línea del array + deploy (< 2 minutos)
- Tokens actuales: `PVE-2026-TOMMI` (Tommi Berg, ESS Finland)

### Capa 2 — Vista SQL Sanitizada (`press_census`)

- Archivo: `supabase/press_census_view.sql`
- Excluye: fallecidos, `reporter_contact` real, fuentes internas
- Incluye: un registro por persona (más reciente), estado traducido,
  fuente enmascarada, timestamps UTC
- Columnas exportadas: `full_name`, `identity_document`, `last_reported_status`,
  `status_code`, `last_known_location`, `data_source`,
  `first_reported_utc`, `last_updated_utc`

### Capa 3 — Frontend (vista `'press'` en App.jsx)

- Ruta: botón en footer HomeView → `view = 'press'`
- Pantalla de token antes de mostrar datos
- Métricas en tiempo real via `get_incident_stats` RPC
- Botón de descarga CSV desde `press_census`
- Metodología y datos de contacto en inglés

---

## Idiomas soportados

- **Español (es)** — idioma principal
- **English (en)** — periodismo internacional
- **Suomi (fi)** — primer contacto verificado: Tommi Berg, ESS Finland
- **Français (fr)** — pendiente de agregar al objeto `T`

---

## Protocolo de entrega a periodistas

1. Director verifica identidad del periodista
2. Director agrega token al array `TOKENS_VALIDOS` y hace deploy
3. Director envía URL + token por canal seguro (Signal / email cifrado)
4. Periodista accede a la app, navega al footer, ingresa token
5. Periodista descarga CSV + lee metodología en el mismo portal

---

## Decisiones de diseño clave

### Fallecidos excluidos del CSV público

Los 144 registros con `status=fallecido` tienen `trust_level=0`.
En desastre activo, un familiar que sabe de una muerte raramente
tiene cabeza para reportarlo en una plataforma. Los "heridos"
pueden incluir fallecimientos posteriores no reportados.

**Estándar seguido:** CICR / OCHA — mortalidad requiere
verificación forense oficial.

### Fuentes enmascaradas

Los nombres internos de los procesos de extracción
(Francotirador, Cacería Delta, Barrido API) se mapean a
categorías periodísticas estándar (Public Health Network,
Verified Citizen Report, OSINT).

Las fuentes reales están documentadas en el audit trail
interno y disponibles bajo NDA para verificación.

### Deduplicación en la vista

La vista `press_census` muestra un registro por persona usando
`ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY updated_at DESC)`.
Los periodistas no ven tarjetas duplicadas.

---

## Estado de implementación

| Componente | Estado |
|---|---|
| `press_census` SQL view | Creado — pendiente de aplicar en Supabase |
| i18n finés (fi) | ✅ Implementado en App.jsx |
| Toggle idioma ×3 | ✅ Implementado en App.jsx |
| Vista press con token | ✅ Implementado en App.jsx |
| Entrada footer | ✅ Implementado en App.jsx |
| Build verificado | Pendiente |
| Deploy Cloudflare | Pendiente |

---

## Próximos pasos

1. Director ejecuta `press_census_view.sql` en Supabase SQL Editor
2. Director verifica build y hace deploy a Cloudflare Pages
3. Director prueba acceso con token `PVE-2026-TOMMI`
4. Director contacta a Tommi Berg con URL + token
5. Agregar francés (fr) al objeto `T` cuando haya contacto francófono

---

## Contacto

**Encuéntrame VE — Iniciativa ciudadana independiente**
Plataforma humanitaria pro-bono | 2026
