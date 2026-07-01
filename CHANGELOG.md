# Changelog — encuentrame.ve / Crisis Response Network

Todos los cambios notables de este proyecto están documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [Sin versión] — 2026-07-01

### Fixed
- `ejecutar_sql.js` tenía código duplicado de versiones anteriores — limpiado
- `ejecutar_sql.js` usaba `node-postgres` (pg) vía TCP directo → bloqueado por IPv6 en Codespaces. Migrado a Supabase Management API (`POST /v1/projects/{ref}/database/query`) con token `sbp_xxx`
- Stats en homepage mostraban salto visual (~60k → ~91k) al cargar. Resuelto con cache `localStorage`: primera visita usa fallback hardcodeado con valores reales, visitas siguientes usan último valor guardado

### Added
- `scripts/ejecutar_sql.js` — ejecuta cualquier `.sql` contra Supabase desde Codespaces vía Management API
- `scripts/ejecutar_sql.sh` — wrapper bash para el script anterior
- `scripts/conectar_db.js` — verifica conexión REST con service_role key
- `.env.example` — plantilla de configuración con nombres de variables y valores no-secretos
- `package.json` scripts: `db:ping` (verificar conexión) y `db:sql` (ejecutar SQL)
- Supabase CLI v2.109 instalado en el entorno Codespaces

---

## [Sin versión] — 2026-06-28

### Added
- Botón minimalista de refutación para falsos positivos en la vista de hospitales

### Changed
- Mejoras de diseño en botones de acción

---

## [Sin versión] — 2026-06-27

### Added
- Sugerencia suave (soft suggestion) de duplicados al registrar nueva persona
- Ordenamiento de personas por `status_weight`: herido > a_salvo > fallecido > buscado
- Contador de **Heridos** en el dashboard principal con consulta a Supabase

### Fixed
- Intervalo de actualización de 30s dejaba de funcionar al activar búsqueda activa
- Búsqueda multi-palabra usando `and()` de PostgREST en `search_name`
- Búsqueda normalizada (sin acentos/mayúsculas) en columna `search_name`

### Performance
- Debounce aumentado de 300ms a 800ms + `AbortController` para cancelar peticiones previas
- Search server-side: reducción de 15 MB a ~10 KB por consulta en vista Personas
- Lazy rendering de 25 items en listas para optimizar RAM y batería en móviles

### Changed
- CTA de búsqueda cambiado a azul para reforzar affordance
- Botón Personas: mejora de affordance visual
- Tarjeta "Focos de Rescate" oculta cuando está inactiva

---

## [Sin versión] — 2026-06-26

### Added
- Soporte PWA completo: instalable en iOS con banner descartable, y Android con prompt nativo
- i18n ultraligero (es/en) para interoperabilidad con ONGs internacionales
- Footer legal corporativo minimalista (RNC, privacidad, enfoque humano)

### Fixed
- Referencia incorrecta a "120Beat" en el footer legal
- Ícono de paginación

### Changed
- Eliminado all-caps en nombres, labels y headers (reducir fatiga visual)

---

## [Sin versión] — 2026-06-25

### Added
- Estructura base del monorepo: `frontend/` (Vite + React + Tailwind) conectado a Supabase
- Backend Node/Express con integración de Telegram webhook
- Aporte de nueva información para personas y zonas de rescate
- Swipe right táctil para navegar hacia atrás (tipo nativo mobile)
- Botón directo de Telegram con reglas estrictas de acceso
- Deploy automático en Cloudflare Pages desde rama `main`

### Fixed
- Pérdida de foco en inputs móviles (evitando subcomponentes anidados)
- Carga inicial y estado de loading en App.jsx
- Configuración estable de Tailwind v3 + PostCSS
- Swipe-back interfiriendo con taps en móviles

### Changed
- README revisado para reflejar el propósito humanitario del proyecto
