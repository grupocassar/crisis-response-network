# Changelog — encuentrame.ve / Crisis Response Network

Todos los cambios notables de este proyecto están documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [Privacidad] — 2026-11-16

### Changed
- Firma institucional neutral: se retiran referencias a la empresa operadora, registro fiscal, nombre, ubicación y correo personal del mantenedor.
- Contacto de prensa centralizado en la constante `PRESS_EMAIL` (correo neutro del proyecto).

---

## [Data Room] — 2026-07-02

### Press Access Portal — Data Room de Prensa

#### Added
- **Vista `/press`** — Data Room protegido por token individual por periodista
  (formato `PVE-XXXX-XXXX`), sin base de datos de usuarios
- **Métricas en tiempo real** en el Data Room: Missing, Hospitalized,
  Located, Total in Census (fallecidos excluidos por protocolo)
- **Descarga de CSV sanitizado** desde `press_census` view —
  fuentes enmascaradas, un registro por persona, estado más reciente
- **Toggle de idioma extendido a ciclo de 3:** Español → English → Suomi
- **Bloque finés completo** en objeto i18n `T` (cobertura 100% de la app)
- **Entrada discreta al Data Room** en footer de HomeView
- `supabase/press_census_view.sql` — vista SQL sanitizada lista
  para ejecutar en Supabase SQL Editor (pendiente de aplicar)
- `docs/DATA_ROOM_PLAN.md` — plan técnico del Data Room

#### Design decisions
- **Fallecidos excluidos del CSV público:** en desastre activo la mortalidad
  requiere verificación forense oficial (estándar CICR/OCHA)
- **Token hardcodeado en cliente:** sin base de datos de usuarios,
  revocación instantánea quitando la línea del array
- **`press_census` view** nunca expone `reporter_contact` real ni
  fuentes internas de extracción

---

## [Auditoría v2] — 2026-07-01

### Cierre de Auditoría Forense + Controles de Entrada

#### Correcciones aplicadas en esta sesión
- **83 contradictorios automáticos resueltos** — cédulas venezolanas
  reales con estados en conflicto: `document_id → NULL` en registros
  duplicados usando regla `updated_at DESC`
- **Registros modificados:** 83
- **Contradictorios finales:** 4
  (4 restantes = Grupo 3, requieren revisión manual)
- **Suma cero confirmada:** 91,574 intactos

#### Controles de entrada implementados
- **`scripts/validar_ingesta.js`** — validador pre-ingesta para CSVs
  - 3 reglas bloqueantes: name_desc, status válido, fallecido con ubicación
  - 6 reglas de warning: placeholders, UUIDs, cédulas cortas, encoding,
    duplicados internos, conflictos con base existente
  - Genera reporte JSON en `/tmp` antes de cualquier inserción
  - Exit code 1 bloquea pipelines de CI/CD si hay errores críticos

#### Hallazgos de flujo de ingesta
- 31,035 registros `a_salvo` tuvieron cambio de estado — flujo correcto
- 12,111 heridos entraron directo desde listas hospitalarias — data válida
- 141 fallecidos sin actualización — pendiente verificación de fuente

---

## [Auditoría] — 2026-07-01

### Auditoría Forense de Datos — 91,574 registros

#### Correcciones aplicadas
- **Placeholders numéricos puros** (0000000, 00000000, V-00000000, etc.):
  `document_id → NULL` en ~50 registros
- **UUIDs como cédula** (identificadores internos del módulo de niños):
  `document_id → NULL` en 1,117 registros total
- **Cédulas cortas inválidas** (≤5 dígitos, no son cédulas venezolanas):
  `document_id → NULL` en 2,328 registros total
- **Duplicados tipográficos** (misma persona, variante de nombre, regla `updated_at DESC`):
  `document_id → NULL` en 35 registros del duplicado
- **Placeholders con prefijo** (V-0000, E-0000, 12345678, etc.):
  `document_id → NULL` en 3 registros
- **Total registros modificados:** 3,533
- **Registros eliminados:** 0

#### Resultado de integridad
- Suma cero confirmada: 91,574 registros intactos tras cada operación
- Contradictorios resueltos: 168 → 87 (49% de reducción)
- Hallazgos críticos pendientes: 2 (fallecidos sin fuente verificada, Grupo 3 manual)
- Documento completo: [`docs/AUDITORIA_FORENSE_2026-07-01.md`](docs/AUDITORIA_FORENSE_2026-07-01.md)

#### Metodología
- Todas las operaciones ejecutadas con SELECT de verificación previa y confirmación posterior
- Cada UPDATE precedido de conteo esperado vs. real — detención automática ante discrepancia
- Suma cero verificada tras cada bloque de escritura
- Cero registros eliminados — solo limpieza de `document_id` inválidos o duplicados

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
- Footer legal minimalista (privacidad, enfoque humano)

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
